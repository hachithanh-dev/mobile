import { networkInterfaces } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
const addresses = Object.entries(networkInterfaces()).flatMap(([name, list]) =>
  list
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => ({ name, address: item.address })),
);
const host =
  process.env.LUMA_LAN_IP ||
  addresses.find((item) => /wi-fi|wlan/i.test(item.name))?.address ||
  addresses.find((item) => !/^vEthernet|docker|WSL/i.test(item.name))?.address;
if (!host) throw new Error('Chưa tìm thấy IPv4 LAN. Đặt LUMA_LAN_IP rồi chạy lại.');
const expoUrl = `exp://${host}:8081`,
  apiUrl = `http://${host}:4000`;
const installer = 'https://expo.dev/go?device=true&platform=android&sdkVersion=55';
await mkdir('submission', { recursive: true });
await QRCode.toFile('server/media/expo-qr.png', expoUrl, {
  width: 420,
  margin: 3,
  errorCorrectionLevel: 'M',
  color: { dark: '#242333', light: '#FFFFFF' },
});
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Luma · Chạy Android</title><body style="font:16px/1.65 Arial;background:#f8f9fb;color:#242333;max-width:750px;margin:32px auto;padding:20px"><h1>Luma trên Android</h1><p>Điện thoại và máy tính dùng cùng Wi-Fi. Giữ backend và Expo đang chạy.</p><ol><li>Mở <a href="${apiUrl}/api/health">API health</a> trên điện thoại, kiểm tra <b>status: ok</b>.</li><li>Cài <a href="${installer}">Expo Go cho SDK 55 từ trang chính thức</a>.</li><li>Trong Expo Go chọn quét QR bên dưới, hoặc mở <a href="${expoUrl}">${expoUrl}</a>.</li></ol><img alt="QR mở Luma trong Expo Go" src="expo-qr.png" width="320" style="max-width:100%;border-radius:16px"><p><b>API:</b> ${apiUrl}<br><b>Expo:</b> ${expoUrl}</p><h2>Luồng kiểm tra</h2><p>Đăng nhập demo → phát video → bình luận → lưu → dừng và mở Xem tiếp → chọn một clip MP4 từ thư viện → đăng → kiểm tra hồ sơ.</p><p>Thử quyền camera, nút Back và đóng/mở app. Ghi lại model máy, Android, kết quả và ảnh minh chứng. Bản hướng dẫn này không xác nhận thiết bị đã kiểm thử.</p></body></html>`;
await writeFile('server/media/phone-setup.html', html);
const api = await fetch(`${apiUrl}/api/health`).then((r) => r.json());
const manifest = await fetch(`http://${host}:8081/`, {
  headers: { 'Expo-Platform': 'android', Accept: 'application/expo+json' },
}).then((r) => r.json());
await writeFile(
  'docs/android-preflight.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      host,
      expoUrl,
      apiUrl,
      apiStatus: api.status,
      sdk: manifest.extra?.expoClient?.sdkVersion,
      runtimeVersion: manifest.runtimeVersion,
      launchAsset: manifest.launchAsset?.url,
      preflightOnly: true,
      deviceTest: 'Pending user testing on physical Android',
    },
    null,
    2,
  ),
);
await writeFile(
  'submission/HUONG_DAN_ANDROID.md',
  `# Chạy Luma trên Android qua Wi-Fi\n\n1. Giữ API và Expo đang chạy. Điện thoại cùng Wi-Fi với máy tính.\n2. Trên điện thoại mở ${apiUrl}/api/health và kiểm tra status ok.\n3. Cài Expo Go SDK 55 từ ${installer}.\n4. Trên máy tính mở http://localhost:4000/media/phone-setup.html, dùng Expo Go quét QR. Hoặc nhập ${expoUrl}.\n5. Đăng nhập demo@luma.vn / Luma@123.\n6. Thử feed, playback, upload, quyền camera, nút Back, khôi phục phiên và mất mạng; ghi thiết bị và kết quả thực tế.\n\nĐã kiểm tra manifest Android SDK 55 và API qua địa chỉ LAN trên máy tính; chưa thay cho kiểm thử điện thoại. Nếu đổi Wi-Fi/IP, chạy lại npm run phone:setup.\n`,
);
console.log(
  JSON.stringify({
    setupPage: `${apiUrl}/media/phone-setup.html`,
    expoUrl,
    apiStatus: api.status,
    sdk: manifest.extra?.expoClient?.sdkVersion,
  }),
);
