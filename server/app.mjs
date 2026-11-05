import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './database.mjs';

const topics = ['Du lịch', 'Đời sống', 'Sáng tạo', 'Thể thao', 'Ẩm thực'];
const registration = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().max(120),
  password: z.string().min(8).max(100),
});
const videoInput = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).default(''),
  topic: z.enum(topics),
  url: z.string().min(1),
  poster: z
    .string()
    .refine((value) => /^https:\/\//.test(value) || /^\/media\/cover-\d+\.jpg$/.test(value)),
  music: z.string().max(100).default('Âm thanh gốc'),
  filter: z.enum(['original', 'warm', 'mono']).default('original'),
  visibility: z.enum(['public', 'private']).default('public'),
  commentsEnabled: z.boolean().default(true),
});
const userFields = 'id,name,handle,avatar,bio';
const safeUser = (db, id) => db.prepare(`SELECT ${userFields} FROM users WHERE id=?`).get(id);
const relationTables = { like: 'likes', save: 'saves' };

export function createApp(db, { uploadDir = 'server/uploads' } = {}) {
  const app = express();
  mkdirSync(uploadDir, { recursive: true });
  app.use(cors());
  app.use('/media', express.static(resolve('server/media')));
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(resolve(uploadDir), { dotfiles: 'deny' }));
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) =>
        cb(
          null,
          `${randomUUID()}${{ 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm' }[file.mimetype] || '.mp4'}`,
        ),
    }),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      cb(null, ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype)),
  });
  app.use((req, _res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (token)
      req.user = db
        .prepare('SELECT user_id FROM sessions WHERE token=? AND expires_at>?')
        .get(token, Date.now())?.user_id;
    next();
  });
  const auth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.' });
  const issueSession = (id) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(token, id, Date.now() + 7 * 86400000);
    return { token, user: safeUser(db, id) };
  };
  const canView = (id, user = '') =>
    db
      .prepare("SELECT * FROM videos WHERE id=? AND (visibility='public' OR user_id=?)")
      .get(id, user);
  const selectVideos = (extra = '') => `SELECT v.*, u.name,u.handle,u.avatar,
    (SELECT COUNT(*) FROM likes WHERE video_id=v.id) AS likes,
    (SELECT COUNT(*) FROM comments WHERE video_id=v.id) AS comments,
    EXISTS(SELECT 1 FROM likes WHERE video_id=v.id AND user_id=?) AS liked,
    EXISTS(SELECT 1 FROM saves WHERE video_id=v.id AND user_id=?) AS saved ${extra}
    FROM videos v JOIN users u ON u.id=v.user_id`;

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Luma API' }));
  // A small in-memory limiter keeps repeated password guessing bounded in the MVP.
  const attempts = new Map();
  const limitAuth = (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = req.ip;
    const value = attempts.get(key) ?? { count: 0, until: now + 60000 };
    value.count++;
    attempts.set(key, value);
    return value.count > 30
      ? res.status(429).json({ message: 'Bạn thử quá nhiều lần. Vui lòng đợi một phút.' })
      : next();
  };
  app.post('/api/auth/register', limitAuth, (req, res) => {
    const input = registration.parse(req.body);
    const email = input.email.toLowerCase();
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
      return res.status(409).json({ message: 'Email đã được sử dụng.' });
    const id = randomUUID();
    db.prepare('INSERT INTO users (id,name,handle,email,password,avatar) VALUES (?,?,?,?,?,?)').run(
      id,
      input.name,
      `user_${id.slice(0, 8)}`,
      email,
      hashPassword(input.password),
      '/media/avatar-47.jpg',
    );
    res.status(201).json(issueSession(id));
  });
  app.post('/api/auth/login', limitAuth, (req, res) => {
    const input = z.object({ email: z.email(), password: z.string().max(100) }).parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(input.email.toLowerCase());
    if (!user || !verifyPassword(input.password, user.password))
      return res.status(401).json({ message: 'Email hoặc mật khẩu chưa đúng.' });
    res.json(issueSession(user.id));
  });
  app.post('/api/auth/logout', auth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token=?').run(req.headers.authorization.slice(7));
    res.sendStatus(204);
  });
  app.get('/api/me', auth, (req, res) => res.json(safeUser(db, req.user)));
  app.get('/api/history', auth, (req, res) => {
    res.json(
      db
        .prepare(
          selectVideos(',h.position,h.duration,h.updated_at AS watched_at') +
            " JOIN watch_history h ON h.video_id=v.id WHERE h.user_id=? AND (v.visibility='public' OR v.user_id=?) ORDER BY h.updated_at DESC,h.rowid DESC LIMIT 50",
        )
        .all(req.user, req.user, req.user, req.user),
    );
  });
  app.get('/api/videos/:id/progress', auth, (req, res) => {
    if (!canView(req.params.id, req.user))
      return res.status(404).json({ message: 'Video không tồn tại.' });
    res.json(
      db
        .prepare('SELECT position,duration FROM watch_history WHERE user_id=? AND video_id=?')
        .get(req.user, req.params.id) ?? { position: 0, duration: 0 },
    );
  });
  app.put('/api/videos/:id/progress', auth, (req, res) => {
    if (!canView(req.params.id, req.user))
      return res.status(404).json({ message: 'Video không tồn tại.' });
    const input = z
      .object({
        position: z.number().finite().min(0).max(86400),
        duration: z.number().finite().positive().max(86400),
      })
      .refine((data) => data.position <= data.duration)
      .parse(req.body);
    db.prepare(
      "INSERT INTO watch_history(user_id,video_id,position,duration,updated_at) VALUES(?,?,?,?,strftime('%Y-%m-%d %H:%M:%f','now')) ON CONFLICT(user_id,video_id) DO UPDATE SET position=excluded.position,duration=excluded.duration,updated_at=excluded.updated_at",
    ).run(req.user, req.params.id, input.position, input.duration);
    res.json(input);
  });
  app.delete('/api/history', auth, (req, res) => {
    db.prepare('DELETE FROM watch_history WHERE user_id=?').run(req.user);
    res.sendStatus(204);
  });
  app.patch('/api/me', auth, (req, res) => {
    const data = z
      .object({ name: z.string().trim().min(2).max(60), bio: z.string().trim().max(160) })
      .parse(req.body);
    db.prepare('UPDATE users SET name=?,bio=? WHERE id=?').run(data.name, data.bio, req.user);
    res.json(safeUser(db, req.user));
  });
  app.get('/api/videos', (req, res) => {
    const { q = '', topic = '', feed = 'all', userId = '' } = req.query;
    const params = [
      req.user ?? '',
      req.user ?? '',
      req.user ?? '',
      `%${String(q).slice(0, 100)}%`,
      `%${String(q).slice(0, 100)}%`,
    ];
    let where =
      " WHERE (v.visibility='public' OR v.user_id=?) AND (v.title LIKE ? OR v.description LIKE ?)";
    if (topic && topic !== 'Tất cả') {
      where += ' AND v.topic=?';
      params.push(String(topic));
    }
    if (userId) {
      where += ' AND v.user_id=?';
      params.push(String(userId));
    }
    if (feed === 'following') {
      where += ' AND v.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)';
      params.push(req.user ?? '');
    }
    if (feed === 'saved') {
      where += ' AND v.id IN (SELECT video_id FROM saves WHERE user_id=?)';
      params.push(req.user ?? '');
    }
    res.json(
      db
        .prepare(selectVideos() + where + ' ORDER BY v.created_at DESC,v.views DESC LIMIT 100')
        .all(...params),
    );
  });
  app.post('/api/videos', auth, (req, res) => {
    const input = videoInput.parse(req.body);
    if (
      !input.url.startsWith('/media/') &&
      !input.url.startsWith('/uploads/') &&
      !/^https:\/\//.test(input.url)
    )
      return res.status(400).json({ message: 'Đường dẫn video không hợp lệ.' });
    const id = randomUUID();
    db.prepare(
      'INSERT INTO videos (id,user_id,title,description,topic,poster,url,music,filter,visibility,comments_enabled) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      id,
      req.user,
      input.title,
      input.description,
      input.topic,
      input.poster,
      input.url,
      input.music,
      input.filter,
      input.visibility,
      Number(input.commentsEnabled),
    );
    res.status(201).json(db.prepare(selectVideos() + ' WHERE v.id=?').get(req.user, req.user, id));
  });
  app.delete('/api/videos/:id', auth, (req, res) => {
    const result = db
      .prepare('DELETE FROM videos WHERE id=? AND user_id=?')
      .run(req.params.id, req.user);
    if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy video của bạn.' });
    res.sendStatus(204);
  });
  app.post('/api/uploads', auth, upload.single('video'), (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: 'Chọn video MP4, MOV hoặc WebM (tối đa 100 MB).' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
  app.post('/api/videos/:id/view', (req, res) => {
    if (!canView(req.params.id, req.user))
      return res.status(404).json({ message: 'Video không tồn tại.' });
    db.prepare('UPDATE videos SET views=views+1 WHERE id=?').run(req.params.id);
    res.sendStatus(204);
  });
  for (const [action, table] of Object.entries(relationTables))
    app.put(`/api/videos/:id/${action}`, auth, (req, res) => {
      if (!canView(req.params.id, req.user))
        return res.status(404).json({ message: 'Video không tồn tại.' });
      const { active } = z.object({ active: z.boolean() }).parse(req.body);
      if (active)
        db.prepare(`INSERT OR IGNORE INTO ${table} VALUES (?,?)`).run(req.user, req.params.id);
      else
        db.prepare(`DELETE FROM ${table} WHERE user_id=? AND video_id=?`).run(
          req.user,
          req.params.id,
        );
      res.json({
        active,
        count: db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE video_id=?`).get(req.params.id)
          .n,
      });
    });
  app.get('/api/videos/:id/comments', (req, res) => {
    if (!canView(req.params.id, req.user))
      return res.status(404).json({ message: 'Video không tồn tại.' });
    res.json(
      db
        .prepare(
          'SELECT c.*,u.name,u.avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE video_id=? ORDER BY c.created_at DESC',
        )
        .all(req.params.id),
    );
  });
  app.post('/api/videos/:id/comments', auth, (req, res) => {
    const video = canView(req.params.id, req.user);
    if (!video) return res.status(404).json({ message: 'Video không tồn tại.' });
    if (!video.comments_enabled)
      return res.status(403).json({ message: 'Chủ video đã tắt bình luận.' });
    const { body } = z.object({ body: z.string().trim().min(1).max(500) }).parse(req.body);
    const id = randomUUID();
    db.prepare('INSERT INTO comments (id,user_id,video_id,body) VALUES (?,?,?,?)').run(
      id,
      req.user,
      req.params.id,
      body,
    );
    res
      .status(201)
      .json(
        db
          .prepare(
            'SELECT c.*,u.name,u.avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?',
          )
          .get(id),
      );
  });
  app.get('/api/users', (req, res) =>
    res.json(
      db
        .prepare(
          `SELECT ${userFields}, EXISTS(SELECT 1 FROM follows WHERE following_id=users.id AND follower_id=?) AS following FROM users WHERE id<>? LIMIT 30`,
        )
        .all(req.user ?? '', req.user ?? ''),
    ),
  );
  app.get('/api/users/:id', (req, res) => {
    const user = safeUser(db, req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    const count = (sql) => db.prepare(sql).get(user.id).n;
    res.json({
      ...user,
      followers: count('SELECT COUNT(*) AS n FROM follows WHERE following_id=?'),
      followingCount: count('SELECT COUNT(*) AS n FROM follows WHERE follower_id=?'),
      totalLikes: count(
        'SELECT COUNT(*) AS n FROM likes WHERE video_id IN (SELECT id FROM videos WHERE user_id=?)',
      ),
      totalViews: count('SELECT COALESCE(SUM(views),0) AS n FROM videos WHERE user_id=?'),
      following: !!db
        .prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?')
        .get(req.user ?? '', user.id),
    });
  });
  app.put('/api/users/:id/follow', auth, (req, res) => {
    if (req.params.id === req.user)
      return res.status(400).json({ message: 'Bạn không thể theo dõi chính mình.' });
    if (!safeUser(db, req.params.id))
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    if (active)
      db.prepare('INSERT OR IGNORE INTO follows VALUES (?,?)').run(req.user, req.params.id);
    else
      db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(
        req.user,
        req.params.id,
      );
    res.json({ active });
  });
  app.use((err, _req, res, _next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        message: 'Dữ liệu chưa hợp lệ. Kiểm tra độ dài và các trường bắt buộc.',
        details: err.issues,
      });
    if (err instanceof multer.MulterError)
      return res
        .status(400)
        .json({ message: 'Video vượt quá giới hạn 100 MB hoặc upload không hợp lệ.' });
    if (err.type === 'entity.parse.failed')
      return res.status(400).json({ message: 'JSON không hợp lệ.' });
    console.error(err);
    res.status(500).json({ message: 'Máy chủ gặp sự cố. Vui lòng thử lại.' });
  });
  return app;
}
