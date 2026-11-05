import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, hashPassword, verifyPassword } from '../database.mjs';
import { createApp } from '../app.mjs';
import { CATALOG_VERSION } from '../catalog.mjs';

let db, server, base, token, uploadDir;
async function request(path, { method = 'GET', body, auth = token } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
before(async () => {
  db = createDatabase(':memory:');
  uploadDir = mkdtempSync(join(tmpdir(), 'luma-test-'));
  server = createApp(db, { uploadDir }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  token = (
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'demo@luma.vn', password: 'Luma@123' },
      auth: null,
    })
  ).data.token;
});
after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(uploadDir, { recursive: true, force: true });
});
test('unit: salted password hashes verify and reject incorrect input', () => {
  const a = hashPassword('abc12345'),
    b = hashPassword('abc12345');
  assert.notEqual(a, b);
  assert.ok(verifyPassword('abc12345', a));
  assert.equal(verifyPassword('wrong', a), false);
});
test('health and seed provide a usable demo', async () => {
  assert.equal((await request('/health')).status, 200);
  const result = await request('/videos');
  assert.equal(result.data.length, 30);
  assert.equal(new Set(result.data.map((video) => video.url)).size, 30);
  for (const topic of ['Du lịch', 'Đời sống', 'Sáng tạo', 'Thể thao', 'Ẩm thực'])
    assert.equal(result.data.filter((video) => video.topic === topic).length, 6);
  assert.ok(result.data[0].name);
});
test('login refuses wrong password and protected endpoints refuse guests', async () => {
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: 'demo@luma.vn', password: 'bad' },
        auth: null,
      })
    ).status,
    401,
  );
  assert.equal((await request('/me', { auth: null })).status, 401);
});
test('registration validates input and duplicate email', async () => {
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: { name: 'A', email: 'bad', password: '1' },
      })
    ).status,
    400,
  );
  const result = await request('/auth/register', {
    method: 'POST',
    body: { name: 'Test Student', email: 'student@test.vn', password: 'Strong123' },
  });
  assert.equal(result.status, 201);
  assert.ok(result.data.token);
  assert.equal(result.data.user.password, undefined);
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: { name: 'Another', email: 'student@test.vn', password: 'Strong123' },
      })
    ).status,
    409,
  );
});
test('search, hashtag and topic filters return relevant videos', async () => {
  const r = await request('/videos?q=coffee');
  assert.equal(r.data.length, 2);
  assert.ok(r.data.some((video) => video.id === 'v2'));
  assert.equal((await request('/videos?topic=' + encodeURIComponent('Du lịch'))).data.length, 6);
  assert.equal((await request('/videos?q=zzzzzz')).data.length, 0);
});
test('like and save are idempotent and reversible', async () => {
  const initial = (await request('/videos')).data.find((v) => v.id === 'v1').likes;
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request('/videos/v1/like', { method: 'PUT', body: { active: true } })).data.count,
      initial + 1,
    );
  assert.equal(
    (await request('/videos/v1/like', { method: 'PUT', body: { active: false } })).data.count,
    initial,
  );
  await request('/videos/v1/save', { method: 'PUT', body: { active: true } });
  assert.ok((await request('/videos?feed=saved')).data.some((v) => v.id === 'v1'));
  await request('/videos/v1/save', { method: 'PUT', body: { active: false } });
  assert.equal((await request('/videos?feed=saved')).data.length, 0);
});
test('comments reject empty input and persist author', async () => {
  assert.equal(
    (await request('/videos/v1/comments', { method: 'POST', body: { body: '   ' } })).status,
    400,
  );
  const result = await request('/videos/v1/comments', {
    method: 'POST',
    body: { body: 'Một buổi sáng thật đẹp!' },
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.name, 'Minh Anh');
  assert.ok(
    (await request('/videos/v1/comments')).data.some((c) => c.body === 'Một buổi sáng thật đẹp!'),
  );
});
test('follow toggles affect feed and reject self-follow', async () => {
  assert.equal(
    (await request('/users/demo/follow', { method: 'PUT', body: { active: true } })).status,
    400,
  );
  await request('/users/ha/follow', { method: 'PUT', body: { active: true } });
  assert.ok((await request('/videos?feed=following')).data.some((v) => v.user_id === 'ha'));
  await request('/users/ha/follow', { method: 'PUT', body: { active: false } });
  assert.ok(!(await request('/videos?feed=following')).data.some((v) => v.user_id === 'ha'));
});
test('private video is invisible to guests, mutations and comments are protected', async () => {
  const r = await request('/videos', {
    method: 'POST',
    body: {
      title: 'Private moment',
      topic: 'Du lịch',
      poster: 'https://example.com/poster.jpg',
      url: 'https://example.com/video.mp4',
      visibility: 'private',
      commentsEnabled: false,
    },
  });
  assert.equal(r.status, 201);
  const id = r.data.id;
  assert.ok((await request('/videos')).data.some((v) => v.id === id));
  assert.ok(!(await request('/videos', { auth: null })).data.some((v) => v.id === id));
  assert.equal((await request(`/videos/${id}/comments`, { auth: null })).status, 404);
  assert.equal(
    (await request(`/videos/${id}/comments`, { method: 'POST', body: { body: 'Hello' } })).status,
    403,
  );
  const other = (
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'linh@luma.vn', password: 'Luma@123' },
    })
  ).data.token;
  assert.equal(
    (await request(`/videos/${id}/save`, { method: 'PUT', body: { active: true }, auth: other }))
      .status,
    404,
  );
  assert.equal((await request(`/videos/${id}`, { method: 'DELETE', auth: other })).status, 404);
  assert.equal((await request(`/videos/${id}`, { method: 'DELETE' })).status, 204);
});
test('uploads require auth and reject unsupported files', async () => {
  const form = new FormData();
  form.append('video', new Blob(['not a video'], { type: 'text/plain' }), 'x.txt');
  assert.equal((await fetch(base + '/uploads', { method: 'POST', body: form })).status, 401);
  assert.equal(
    (
      await fetch(base + '/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
    ).status,
    400,
  );
});
test('uploaded video is served and published', async () => {
  // Transport fixture only; media decoding is checked separately in the browser demo.
  const form = new FormData();
  form.append(
    'video',
    new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], { type: 'video/mp4' }),
    'test.mp4',
  );
  const response = await fetch(base + '/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  assert.equal(response.status, 201);
  const { url } = await response.json();
  assert.ok(url.startsWith('/uploads/'));
  assert.equal((await fetch(base.replace('/api', '') + url)).status, 200);
  const created = await request('/videos', {
    method: 'POST',
    body: {
      title: 'Upload integration',
      topic: 'Sáng tạo',
      poster: 'https://example.com/p.jpg',
      url,
    },
  });
  assert.equal(created.status, 201);
  await request(`/videos/${created.data.id}`, { method: 'DELETE' });
});
test('profile update and analytics reflect database values', async () => {
  const r = await request('/me', {
    method: 'PATCH',
    body: { name: 'Minh Anh', bio: 'Sống chậm và khám phá.' },
  });
  assert.equal(r.data.bio, 'Sống chậm và khám phá.');
  const p = (await request('/users/demo')).data;
  assert.equal(p.totalViews, 20490);
  assert.equal(typeof p.followers, 'number');
});
test('view increments and invalid ids return 404', async () => {
  const before = (await request('/videos')).data.find((v) => v.id === 'v3').views;
  await request('/videos/v3/view', { method: 'POST', body: {} });
  assert.equal((await request('/videos')).data.find((v) => v.id === 'v3').views, before + 1);
  assert.equal((await request('/videos/missing/comments')).status, 404);
});
test('logout invalidates server session', async () => {
  const t = (
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'ha@luma.vn', password: 'Luma@123' },
    })
  ).data.token;
  await request('/auth/logout', { method: 'POST', auth: t, body: {} });
  assert.equal((await request('/me', { auth: t })).status, 401);
});
test('watch progress persists, updates one history entry and stays account-specific', async () => {
  assert.equal((await request('/history', { auth: null })).status, 401);
  assert.equal(
    (
      await request('/videos/v2/progress', {
        method: 'PUT',
        auth: null,
        body: { position: 2, duration: 10 },
      })
    ).status,
    401,
  );
  assert.deepEqual((await request('/videos/v2/progress')).data, { position: 0, duration: 0 });
  for (const position of [2, 4])
    assert.equal(
      (await request('/videos/v2/progress', { method: 'PUT', body: { position, duration: 10 } }))
        .status,
      200,
    );
  const history = (await request('/history')).data;
  assert.equal(history.filter((v) => v.id === 'v2').length, 1);
  assert.equal(history.find((v) => v.id === 'v2').position, 4);
  assert.equal(history[0].title, 'Một ly bình yên, ít đường');
  const other = (
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'ha@luma.vn', password: 'Luma@123' },
    })
  ).data.token;
  assert.equal((await request('/history', { auth: other })).data.length, 0);
  await request('/videos/v3/progress', {
    method: 'PUT',
    auth: other,
    body: { position: 1, duration: 8 },
  });
  assert.equal((await request('/history', { method: 'DELETE' })).status, 204);
  assert.equal((await request('/history')).data.length, 0);
  assert.equal((await request('/history', { auth: other })).data.length, 1);
});

test('watch progress rejects invalid times and unauthorized private video access', async () => {
  for (const body of [
    { position: -1, duration: 5 },
    { position: 6, duration: 5 },
    { position: 0, duration: 0 },
    { position: '2', duration: 10 },
  ]) {
    assert.equal((await request('/videos/v2/progress', { method: 'PUT', body })).status, 400);
  }
  assert.equal((await request('/videos/missing/progress')).status, 404);
  const video = (
    await request('/videos', {
      method: 'POST',
      body: {
        title: 'Private history test',
        topic: 'Du lịch',
        poster: '/media/cover-1.jpg',
        url: '/media/sample.mp4',
        visibility: 'private',
      },
    })
  ).data;
  await request(`/videos/${video.id}/progress`, {
    method: 'PUT',
    body: { position: 1, duration: 5 },
  });
  const other = (
    await request('/auth/login', {
      method: 'POST',
      body: { email: 'linh@luma.vn', password: 'Luma@123' },
    })
  ).data.token;
  assert.equal((await request(`/videos/${video.id}/progress`, { auth: other })).status, 404);
  assert.equal(
    (
      await request(`/videos/${video.id}/progress`, {
        method: 'PUT',
        auth: other,
        body: { position: 1, duration: 5 },
      })
    ).status,
    404,
  );
  await request(`/videos/${video.id}`, { method: 'DELETE' });
  assert.ok(!(await request('/history')).data.some((v) => v.id === video.id));
});

test('database migration preserves existing videos and watch history across restart', () => {
  const path = join(uploadDir, 'persistent.sqlite');
  let connection = createDatabase(path);
  connection
    .prepare('INSERT INTO watch_history(user_id,video_id,position,duration) VALUES (?,?,?,?)')
    .run('demo', 'v1', 2, 5);
  connection.close();
  connection = createDatabase(path);
  assert.equal(connection.prepare('SELECT COUNT(*) AS n FROM videos').get().n, 30);
  assert.equal(
    connection
      .prepare('SELECT position FROM watch_history WHERE user_id=? AND video_id=?')
      .get('demo', 'v1').position,
    2,
  );
  connection.close();
});

test('catalog upgrade preserves custom posts and interactions, and does not re-add deleted samples', () => {
  const path = join(uploadDir, 'catalog-upgrade.sqlite');
  let connection = createDatabase(path);
  try {
    connection.prepare('DELETE FROM seed_migrations WHERE version=?').run(CATALOG_VERSION);
    connection.prepare("UPDATE videos SET url='/media/sample.mp4',views=777 WHERE id='v1'").run();
    connection
      .prepare(
        "INSERT INTO videos(id,user_id,title,description,topic,poster,url,music) VALUES('custom-student','demo','Clip tự quay','Bài của sinh viên','Đời sống','/media/cover-6.jpg','/uploads/student.mp4','Âm thanh gốc')",
      )
      .run();
    connection.prepare("INSERT INTO likes VALUES('demo','v1')").run();
    connection
      .prepare(
        "INSERT INTO watch_history(user_id,video_id,position,duration) VALUES('demo','custom-student',2,10)",
      )
      .run();
  } finally {
    connection.close();
  }
  connection = createDatabase(path);
  try {
    assert.equal(
      connection.prepare('SELECT url FROM videos WHERE id=?').get('v1').url,
      '/media/clips/v1.mp4',
    );
    assert.equal(connection.prepare('SELECT views FROM videos WHERE id=?').get('v1').views, 777);
    assert.ok(
      connection.prepare("SELECT 1 FROM likes WHERE user_id='demo' AND video_id='v1'").get(),
    );
    assert.equal(
      connection.prepare('SELECT url FROM videos WHERE id=?').get('custom-student').url,
      '/uploads/student.mp4',
    );
    assert.equal(
      connection.prepare("SELECT position FROM watch_history WHERE video_id='custom-student'").get()
        .position,
      2,
    );
    connection.prepare("DELETE FROM videos WHERE id='v2'").run();
  } finally {
    connection.close();
  }
  connection = createDatabase(path);
  try {
    assert.equal(connection.prepare("SELECT id FROM videos WHERE id='v2'").get(), undefined);
  } finally {
    connection.close();
  }
});

test('catalog contains 30 distinct verified MP4 files with their own prepared covers', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../media/catalog-manifest.json', import.meta.url), 'utf8'),
  );
  assert.equal(manifest.length, 30);
  assert.equal(new Set(manifest.map((video) => video.sha256)).size, 30);
  for (const video of manifest) {
    const clip = readFileSync(new URL(`../media/clips/${video.id}.mp4`, import.meta.url));
    assert.equal(createHash('sha256').update(clip).digest('hex'), video.sha256);
    assert.equal(clip.length, video.bytes);
    assert.ok(video.duration > 0 && video.width > 0 && video.height > 0);
    assert.ok(
      readFileSync(new URL(`../media/posters/${video.id}.jpg`, import.meta.url)).length > 1000,
    );
  }
});
