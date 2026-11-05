import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { installDemoCatalog } from './catalog-seed.mjs';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}

export function createDatabase(path = 'server/data/luma.sqlite') {
  if (path !== ':memory:') mkdirSync('server/data', { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, handle TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, avatar TEXT NOT NULL, bio TEXT NOT NULL DEFAULT 'Mỗi ngày, một khoảnh khắc đáng nhớ.');
    CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL, topic TEXT NOT NULL, poster TEXT NOT NULL, url TEXT NOT NULL, music TEXT NOT NULL, filter TEXT NOT NULL DEFAULT 'original', visibility TEXT NOT NULL DEFAULT 'public', comments_enabled INTEGER NOT NULL DEFAULT 1, views INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS likes (user_id TEXT REFERENCES users(id), video_id TEXT REFERENCES videos(id) ON DELETE CASCADE, PRIMARY KEY(user_id, video_id));
    CREATE TABLE IF NOT EXISTS saves (user_id TEXT REFERENCES users(id), video_id TEXT REFERENCES videos(id) ON DELETE CASCADE, PRIMARY KEY(user_id, video_id));
    CREATE TABLE IF NOT EXISTS follows (follower_id TEXT REFERENCES users(id), following_id TEXT REFERENCES users(id), PRIMARY KEY(follower_id, following_id), CHECK(follower_id <> following_id));
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS watch_history (user_id TEXT NOT NULL REFERENCES users(id), video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE, position REAL NOT NULL CHECK(position>=0), duration REAL NOT NULL CHECK(duration>0), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,video_id));
  `);
  const columns = new Set(
    db
      .prepare('PRAGMA table_info(videos)')
      .all()
      .map((column) => column.name),
  );
  for (const [name, definition] of [
    ['source_url', "TEXT NOT NULL DEFAULT ''"],
    ['source_author', "TEXT NOT NULL DEFAULT ''"],
    ['duration_seconds', 'REAL NOT NULL DEFAULT 0'],
  ]) {
    if (!columns.has(name)) db.exec(`ALTER TABLE videos ADD COLUMN ${name} ${definition}`);
  }
  if (!db.prepare('SELECT id FROM users LIMIT 1').get()) seed(db);
  installDemoCatalog(db);
  return db;
}

function seed(db) {
  const people = [
    [
      'demo',
      'Minh Anh',
      'minhanh',
      'demo@luma.vn',
      '47',
      'Đi, khám phá và kể câu chuyện của riêng mình. ✨',
    ],
    [
      'linh',
      'Linh Đan',
      'linhdan',
      'linh@luma.vn',
      '44',
      'Nhặt những điều nhỏ xinh giữa cuộc sống.',
    ],
    ['khoa', 'Đăng Khoa', 'dangkhoa', 'khoa@luma.vn', '12', 'Đi thật xa, để trở về.'],
    ['ha', 'Hà My', 'hamy', 'ha@luma.vn', '49', 'Một chút cà phê, một chút bình yên.'],
    ['nam', 'Hoàng Nam', 'hoangnam', 'nam@luma.vn', '33', 'Chuyển động tạo nên cảm hứng.'],
  ];
  const insertUser = db.prepare(
    'INSERT INTO users (id,name,handle,email,password,avatar,bio) VALUES (?,?,?,?,?,?,?)',
  );
  for (const [id, name, handle, email, avatar, bio] of people)
    insertUser.run(
      id,
      name,
      handle,
      email,
      hashPassword('Luma@123'),
      `/media/avatar-${avatar}.jpg`,
      bio,
    );
  installDemoCatalog(db);
  db.prepare('INSERT INTO follows VALUES (?,?)').run('demo', 'linh');
  db.prepare('INSERT INTO follows VALUES (?,?)').run('demo', 'khoa');
  db.prepare('INSERT INTO likes VALUES (?,?)').run('linh', 'v1');
  db.prepare('INSERT INTO likes VALUES (?,?)').run('ha', 'v1');
  db.prepare('INSERT INTO comments (id,user_id,video_id,body) VALUES (?,?,?,?)').run(
    'c1',
    'linh',
    'v1',
    'Nhìn thôi đã muốn xách balo lên rồi 🌿',
  );
  db.prepare('INSERT INTO comments (id,user_id,video_id,body) VALUES (?,?,?,?)').run(
    'c2',
    'ha',
    'v1',
    'Màu này bình yên quá!',
  );
}
