import { chromium } from '@playwright/test';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('docs/screenshots', { recursive: true });
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
const errors = [];
const checks = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('Page error after:', checks.at(-1), e.message);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Unexpected text node')) errors.push(m.text());
  });
  await page.goto('http://localhost:8081');
  await page.getByText('Khám phá hôm nay', { exact: true }).waitFor();
  await page.waitForFunction(() =>
    ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'].every((name) =>
      Array.from(document.fonts).some((font) => font.family === name && font.status === 'loaded'),
    ),
  );
  checks.push('Four Inter font faces loaded locally');
  await page
    .getByRole('button', { name: 'Xem Một buổi chiều bên khung vẽ', exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((i) => i.src.includes('/media/'))
      .every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png' });
  checks.push('Desktop home and local images');
  await page.getByRole('button', { name: 'Khám phá chủ đề Du lịch', exact: true }).click();
  await page.getByRole('radio', { name: 'Du lịch', exact: true, checked: true }).waitFor();
  await page.getByText('6 câu chuyện để bạn bắt đầu', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Xem / }).count(), 6);
  checks.push('Topic discovery opens the selected filter');
  await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).click();
  await page.getByRole('button', { name: 'Trải nghiệm tài khoản demo', exact: true }).click();
  await page.getByText('Thống kê video', { exact: true }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/profile-desktop.png' });
  checks.push('Demo login and analytics');
  await page.getByRole('button', { name: 'Mở tìm kiếm', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm kiếm video', exact: true }).fill('coffee');
  await page.getByText('2 câu chuyện để bạn bắt đầu', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Xem / }).count(), 2);
  checks.push('Debounced search');
  await page.getByRole('button', { name: 'Xem Một ly bình yên, ít đường', exact: true }).click();
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v && v.readyState >= 2;
  });
  await page.getByRole('button', { name: 'Thích video', exact: true }).click();
  const wasSaved = (await page.getByText('Đã lưu', { exact: true }).count()) > 0;
  await page.getByRole('button', { name: 'Lưu video đang xem', exact: true }).click();
  await page.getByText(wasSaved ? 'Lưu' : 'Đã lưu', { exact: true }).waitFor();
  const commentText = `Khoảnh khắc thật đẹp — kiểm thử ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Nội dung bình luận', exact: true }).fill(commentText);
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await page.getByText(commentText, { exact: true }).first().waitFor();
  await page.screenshot({ path: 'docs/screenshots/video-comments.png' });
  checks.push('Video decodes, like, save, comment');
  const progressSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/videos/v2/progress') &&
      response.request().method() === 'PUT' &&
      JSON.parse(response.request().postData()).position >= 1.5 &&
      response.status() === 200,
  );
  await page.evaluate(async () => {
    const video = document.querySelector('video');
    video.pause();
    await new Promise((resolve) => {
      video.addEventListener('seeked', resolve, { once: true });
      video.currentTime = 1.8;
    });
  });
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: 'Đóng video', exact: true }).click();
  await progressSaved;
  await page.getByRole('button', { name: 'Trang chủ', exact: true }).click();
  await page
    .getByRole('button', { name: 'Xem tiếp Một ly bình yên, ít đường', exact: true })
    .waitFor();
  await page.screenshot({ path: 'docs/screenshots/continue-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/continue-mobile.png' });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('button', { name: 'Xem tiếp Một ly bình yên, ít đường', exact: true })
    .click();
  await page.getByText('Tiếp tục từ 0:01', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('video')?.currentTime >= 1.5);
  await page.evaluate(async () => {
    await document.querySelector('video').play();
  });
  checks.push('Watch position saved and restored from continue watching');
  await page.getByRole('button', { name: 'Đóng video', exact: true }).click();
  await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).click();
  await page.getByRole('radio', { name: 'Lịch sử', exact: true }).click();
  await page.getByRole('button', { name: 'Xem Một ly bình yên, ít đường', exact: true }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/history-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Xem Một ly bình yên, ít đường', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/history-mobile.png' });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Xóa lịch sử', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa lịch sử', exact: true }).click();
  await page.getByText('Chưa có lịch sử xem. Mở một video để bắt đầu.', { exact: true }).waitFor();
  checks.push('Private history screen and clear confirmation');
  await page.getByRole('button', { name: 'Tạo khoảnh khắc', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tiêu đề video', exact: true })
    .fill('Bản nháp kiểm thử giao diện');
  await page.waitForTimeout(1000);
  await page.reload();
  await page.getByRole('button', { name: 'Tạo khoảnh khắc', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tiêu đề video', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('textbox', { name: 'Tiêu đề video', exact: true }).inputValue(),
    'Bản nháp kiểm thử giao diện',
  );
  checks.push('Draft survives reload');
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn từ thư viện', exact: true }).click();
  await (await fileChooser).setFiles('server/media/sample.mp4');
  await page
    .getByRole('textbox', { name: 'Tiêu đề video', exact: true })
    .fill('Khoảnh khắc demo từ thiết bị');
  await page
    .getByRole('textbox', { name: 'Mô tả video', exact: true })
    .fill('Video thật được upload từ máy để kiểm thử end-to-end.');
  await page.screenshot({ path: 'docs/screenshots/create-desktop.png' });
  await page.getByRole('button', { name: 'Đăng khoảnh khắc', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa video của tôi', exact: true }).waitFor();
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v?.src.includes('/uploads/') && v.readyState >= 2;
  });
  checks.push('Local upload, publish, playback');
  await page.getByRole('button', { name: 'Xóa video của tôi', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa video', exact: true }).click();
  await page.getByText('Thống kê video', { exact: true }).waitFor();
  checks.push('Owner deletion');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Trang chủ', exact: true }).click();
  await page.getByText('Khám phá hôm nay', { exact: true }).waitFor();
  await page.waitForTimeout(4200);
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png' });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  checks.push('390px mobile layout without horizontal overflow');
  // API offline simulation verifies cached browsing with an explicit offline banner.
  await page.route('**/api/videos*', (route) => route.abort());
  await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  await page.getByRole('button', { name: 'Trang chủ', exact: true }).click();
  await page
    .getByText('Đang xem dữ liệu đã lưu · Kéo xuống để kết nối lại', { exact: true })
    .waitFor();
  checks.push('Offline metadata cache fallback');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('luma.cache.demo./videos?topic=')) localStorage.setItem(key, '{broken');
  });
  await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  await page.getByRole('button', { name: 'Trang chủ', exact: true }).click();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
  checks.push('Corrupt offline cache shows retry without crashing');
  assert.deepEqual(errors, []);
  writeFileSync(
    'docs/browser-results.json',
    JSON.stringify({ checkedAt: new Date().toISOString(), checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
