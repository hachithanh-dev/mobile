# Hướng dẫn triển khai từng bước

## Bước 1 — Chuẩn bị

Cài Node 22 LTS (>=22.13) hoặc 24 LTS; mở terminal tại thư mục dự án. Không cần cài SQLite riêng. Dùng `node -v` và `npm -v` kiểm tra. `package-lock.json` chốt dependency; dùng `npm ci` khi lấy source trên máy mới.

## Bước 2 — Cài và chạy backend

```powershell
npm ci
npm run server
```

API ở `http://localhost:4000/api/health`. Lần đầu tự tạo `server/data/luma.sqlite`, các bảng và dữ liệu mẫu. `server/uploads/` được tạo tự động. Giữ terminal này mở.

Khi cập nhật phiên bản có lịch sử xem, chỉ cần khởi động lại backend. Bảng `watch_history` tự thêm vào database hiện tại, không cần xóa dữ liệu cũ.

## Bước 3 — Chạy ứng dụng

Web: terminal mới, `npm run web`, mở `http://localhost:8081`. Chạy cả hai cùng lúc bằng `npm run dev`.

Android thật: terminal mới `npm start`, mở Expo Go đúng SDK 55 và quét QR. Máy tính/điện thoại cùng LAN. App tự suy ra host từ Expo. Nếu cần, dùng `.env` với `EXPO_PUBLIC_API_URL=http://IP-MAY-TINH:4000`; restart Metro sau đổi env. Expo tunnel chỉ chuyển tiếp Metro, **không tự chuyển tiếp API 4000**.

Giả lập Android: cài Android Studio, SDK/platform-tools và tạo AVD trước; API URL là `http://10.0.2.2:4000`; chạy `npm run android`. Chưa thực hiện bước này trên môi trường hiện tại.

## Bước 4 — Kiểm chứng

1. Mở health endpoint bằng trình duyệt điện thoại.
2. Mở Cá nhân → Trải nghiệm tài khoản demo.
3. Tìm coffee → xem clip → bật âm lượng → bình luận → lưu.
4. Tạo video → chọn clip MP4 nhỏ từ thiết bị → nhập tên → đăng → kiểm tra hồ sơ.
5. Refresh app và xác nhận dữ liệu còn trong SQLite.

## Bước 5 — Bản build

```powershell
npm run typecheck
npm test
npm run build:web
```

`dist/` là frontend static. Nếu deploy web thật, cung cấp API HTTPS, đặt `EXPO_PUBLIC_API_URL` trước build và cấu hình origin/backend riêng. Không trộn HTTPS frontend với HTTP API do mixed content.

APK tùy chọn: đã có `eas.json` với profile preview. Cài EAS CLI hoặc dùng `npx eas-cli`, đăng nhập tài khoản Expo của nhóm, chạy `npx eas-cli build --platform android --profile preview`. Cần tài khoản/mạng, lần đầu EAS có thể yêu cầu tạo project và signing key. **Chưa đăng nhập, chưa gửi build lên cloud và chưa tạo APK trong lần triển khai này.** APK ngoài máy cần trỏ tới API truy cập được; localhost trong APK là chính điện thoại.

## Bước 6 — Sao lưu và khôi phục

Dừng API trước khi sao chép `server/data/` và `server/uploads/` để tránh mất bản ghi WAL. Giữ hai thư mục cùng một bản sao lưu. Không đưa mật khẩu production hoặc DB người dùng lên GitHub. Source đã có `.gitignore` cho dữ liệu phát sinh; tài sản mẫu `server/media/` nên được commit.

Không reset dữ liệu trong quá trình báo cáo. Để có dữ liệu mới trên máy khác chỉ cần chạy source chưa có DB; seed tự sinh. Nếu thật sự muốn reset, sao lưu rồi đổi tên thư mục `server/data/` khi API đã dừng, lần chạy sau tự tạo DB mới.

## Khắc phục lỗi nhanh

| Hiện tượng                                   | Cách xử lý                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Không kết nối được máy chủ                   | Kiểm tra terminal API, IP LAN, firewall Private và Wi-Fi                                                   |
| Expo Go SDK mismatch                         | Cài bản Android hỗ trợ SDK 55 từ expo.dev/go                                                               |
| App không nhận env mới                       | Dừng Metro, `npm start -- --clear`                                                                         |
| Cổng 4000/8081 bận                           | Dừng phiên trước; backend có thể đổi PORT nhưng phải sửa API URL tương ứng                                 |
| Không thấy ảnh sau copy source               | Giữ nguyên thư mục `server/media/`; gọi /media/cover-1.jpg trên API                                        |
| Clip upload không phát                       | Thử MP4 H.264/AAC; MIME hợp lệ không đảm bảo codec thiết bị hỗ trợ                                         |
| Build cần Android SDK                        | Expo Go/web không cần SDK; build local native mới cần Android Studio/JDK phù hợp                           |
| React Native DevTools fallback trong sandbox | Metro dùng bản fallback; ứng dụng vẫn chạy. Trên máy thường cấp quyền cache DevTools nếu muốn dùng bản mới |
