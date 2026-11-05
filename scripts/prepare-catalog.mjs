import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import express from 'express';
import { DEMO_VIDEOS } from '../server/catalog.mjs';

// Generate the cover from the actual clip, and verify browser decoding for every file.
const manifestPath = 'server/media/catalog-manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.length !== DEMO_VIDEOS.length) throw new Error('Download the complete catalog first.');
await mkdir('server/media/posters', { recursive: true });
await mkdir('docs/screenshots', { recursive: true });
const app = express();
app.use('/media', express.static('server/media'));
app.get('/', (_req, res) => res.type('html').send('<!doctype html><html><body></body></html>'));
const server = createServer(app).listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath =
  process.env.CHROME_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(existsSync);
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1320 } });
  await page.goto(origin);
  for (const video of DEMO_VIDEOS) {
    const existing = manifest.find((v) => v.id === video.id);
    if (existing.duration > 0 && existsSync(`server${video.poster}`)) {
      console.log(`${video.id}: already decoded and prepared`);
      continue;
    }
    const result = await page.evaluate(async (url) => {
      const element = document.createElement('video');
      element.preload = 'auto';
      element.muted = true;
      element.src = url;
      document.body.appendChild(element);
      await new Promise((resolve, reject) => {
        element.addEventListener('loadeddata', resolve, { once: true });
        element.addEventListener('error', () => reject(new Error(`Cannot decode ${url}`)), {
          once: true,
        });
        setTimeout(() => reject(new Error(`Decode timeout: ${url}`)), 20000);
      });
      const duration = element.duration,
        width = element.videoWidth,
        height = element.videoHeight;
      await new Promise((resolve) => {
        element.addEventListener('seeked', resolve, { once: true });
        element.currentTime = url.endsWith('/v22.mp4')
          ? duration * 0.6
          : Math.min(1.5, duration * 0.2);
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(width, 960);
      canvas.height = Math.round((canvas.width * height) / width);
      canvas.getContext('2d').drawImage(element, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL('image/jpeg', 0.86).split(',')[1];
      element.pause();
      element.removeAttribute('src');
      element.load();
      element.remove();
      return { duration, width, height, poster };
    }, `${origin}${video.url}`);
    await writeFile(`server${video.poster}`, Buffer.from(result.poster, 'base64'));
    Object.assign(
      manifest.find((v) => v.id === video.id),
      {
        duration: result.duration,
        width: result.width,
        height: result.height,
        poster: video.poster,
      },
    );
    console.log(
      `${video.id}: ${result.width}x${result.height}, ${result.duration.toFixed(1)}s · cover ready`,
    );
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  const escape = (s) =>
    s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  await page.setContent(
    `<html><body style="margin:0;padding:24px;background:#f5f6fa;font:13px Arial"><h1 style="margin:0 0 18px">Luma · 30 distinct clips and their own frames</h1><main style="display:grid;grid-template-columns:repeat(6,1fr);gap:14px">${DEMO_VIDEOS.map((video) => `<article style="background:#fff;padding:8px;border-radius:10px"><img src="${origin}${video.poster}" style="width:100%;height:175px;object-fit:cover;border-radius:6px"><p style="margin:8px 0 5px"><b>${video.id} · ${escape(video.topic)}</b></p><div>${escape(video.title)}</div><small>${manifest.find((v) => v.id === video.id).duration.toFixed(1)}s · ${escape(video.sourceAuthor)}</small></article>`).join('')}</main></body></html>`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.decode())));
  await page.screenshot({ path: 'docs/screenshots/catalog-contact-sheet.png', fullPage: true });
  const size = (manifest.reduce((total, video) => total + video.bytes, 0) / 1024 / 1024).toFixed(1);
  const report = [
    '# Danh mục video mẫu Luma',
    '',
    `30 clip khác nhau · 5 chủ đề, mỗi chủ đề 6 clip · Tổng MP4 ${size} MiB. Tất cả đã giải mã bằng Chromium; ảnh bìa lấy từ chính clip.`,
    '',
    'Nguồn stock: [Pexels](https://www.pexels.com/license/). Tên tài khoản trong Luma là dữ liệu demo; tác giả footage được ghi riêng ở mỗi bài và bảng dưới.',
    '',
    '| Bài | Chủ đề | Video | Thời lượng | Tác giả / Nguồn |',
    '|---|---|---|---|---|',
    ...DEMO_VIDEOS.map(
      (video) =>
        `| ${video.id} | ${video.topic} | ${video.title} | ${manifest.find((v) => v.id === video.id).duration.toFixed(1)} giây | [${video.sourceAuthor}](${video.sourceUrl}) |`,
    ),
    '',
    'File MP4: `server/media/clips/`. Ảnh bìa: `server/media/posters/`. URL tải, license, dung lượng, SHA-256, kích thước và thời lượng: `server/media/catalog-manifest.json`.',
    '',
    'Khôi phục media: `npm run media:download`, sau đó `npm run media:prepare`. Cần mạng để tải lại; app dùng các file local đã có khi demo. Không cần API key Pexels. Muốn tạo lại một poster đã cache, xóa riêng poster đó rồi chạy lại bước prepare.',
    '',
    'Database cập nhật một lần qua seed_migrations. Bài tự đăng và tương tác đang có được giữ; xóa bài mẫu sau khi cập nhật sẽ không bị tự thêm lại ở lần khởi động sau.',
  ].join('\n');
  await writeFile('docs/VIDEO-CATALOG.md', report + '\n');
  console.log(`Verified and prepared ${manifest.length} playable clips`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
