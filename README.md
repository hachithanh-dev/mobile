# Luma - Ứng dụng chia sẻ video

Đồ án học phần **Lập trình thiết bị di động** sử dụng React Native / Expo SDK 55, TypeScript, Express và SQLite. Repository chứa mã nguồn, test, tài sản mẫu cần chạy ứng dụng và hướng dẫn triển khai.

## Chạy trên máy tính

Yêu cầu Node.js **22.13 trở lên**; nên dùng Node 24 LTS. Không cần cài SQLite server, Docker hoặc Android Studio để chạy web và API.

```powershell
git clone https://github.com/hachithanh-dev/mobile.git
cd mobile
npm ci
npm run dev
```

Mở **http://localhost:8081**. API: **http://localhost:4000/api/health**. Database và dữ liệu demo được tạo tự động khi chạy lần đầu. Ctrl+C để dừng.

Nếu PowerShell chặn npm.ps1 hoặc npx.ps1, dùng npm.cmd hoặc npx.cmd thay thế. Nếu cổng web đang được ứng dụng khác sử dụng, giữ API ở terminal riêng bằng npm run server, rồi chạy npx expo start --web --port 8093 ở terminal thứ hai.

**Tài khoản demo:** demo@luma.vn / Luma@123. Đây là dữ liệu mẫu phục vụ học tập. Có thể đăng ký tài khoản mới.

## Chạy Android bằng Expo Go qua Wi-Fi

1. Máy tính và điện thoại cùng Wi-Fi; chạy npm run server ở terminal thứ nhất.
2. Chạy npm start ở terminal thứ hai.
3. Cài [Expo Go hỗ trợ SDK 55](https://expo.dev/go?sdkVersion=55&platform=android&device=true), sau đó quét QR của Expo.
4. App tự suy ra IP máy tính từ Expo để gọi API cổng 4000. Trên điện thoại, mở http://IP-MAY-TINH:4000/api/health để kiểm tra LAN.
5. Nếu cần cấu hình thủ công, sao chép .env.example thành .env và đặt EXPO_PUBLIC_API_URL=http://IP-MAY-TINH:4000. Dừng Metro và chạy npm start -- --clear sau khi thay đổi.

Có thể chạy npm run phone:setup sau khi API và Metro đã hoạt động để tạo trang hướng dẫn/QR tại http://localhost:4000/media/phone-setup.html. Không dùng localhost làm API URL trên điện thoại thật. Nếu dùng giả lập Android, API thường là http://10.0.2.2:4000.

Kiểm thử native trên điện thoại vẫn cần thực hiện; kết quả web và bundle không thay thế kiểm tra camera, quyền, codec hoặc nút Back trên Android. Xem [hướng dẫn triển khai](docs/04-DEPLOYMENT.md).

## Chức năng

- Đăng ký, đăng nhập, đăng xuất và chỉnh sửa hồ sơ.
- Feed 30 clip khác nhau thuộc 5 chủ đề; tìm nội dung và hashtag.
- Phát video, thích, lưu, bình luận và theo dõi tác giả.
- Chọn clip từ thiết bị, upload tối đa 100 MB, đăng và xóa bài của mình.
- Tùy chọn công khai/riêng tư ở metadata và bật/tắt bình luận.
- Bản nháp tự động, cache metadata, thống kê cá nhân, lịch sử và Xem tiếp theo tài khoản.
- Font Inter đóng gói cùng app; giao diện thích ứng điện thoại và desktop.

Quay video qua camera picker native đã có trong mã nguồn và cần xác minh trên thiết bị. Lớp màu chỉ phủ khi xem, không render vào file; âm thanh giữ nguyên hoặc tắt, không có trộn nhạc/livestream/feed AI. Cache không tải toàn bộ clip để xem offline. Private hiện bảo vệ metadata; tệp media tĩnh vẫn có thể truy cập nếu biết URL. Trước triển khai rộng cần HTTPS, giới hạn CORS, kiểm tra nội dung upload, bảo vệ media và quản lý dung lượng.

## Tổ chức dự án

```text
App.tsx                 Shell, tab và modal
src/screens/            Các màn hình và player
src/state/              Session, cache, draft và tiến độ xem
src/services/           API client
src/ui/                 Theme, Inter và component dùng chung
server/                 Express, SQLite, auth, upload và catalog
server/tests/           Unit và API integration tests
server/media/           30 clip, poster và ảnh mẫu
scripts/                Chuẩn bị media, thiết lập điện thoại, E2E
docs/                   Hướng dẫn triển khai và nguồn tài sản
```

Database runtime nằm ở server/data/; clip upload ở server/uploads/. Cả hai được tạo tại máy chạy và không đưa lên Git. Giữ nguyên server/media/ để seed và video mẫu hoạt động.

## Kiểm tra và build

```powershell
npm run typecheck
npm test
npm run format:check
npm run build:web
```

Để kiểm thử giao diện, chạy npm run dev rồi mở terminal khác chạy npm run test:e2e. Script cần Chrome/Edge hoặc CHROME_PATH; nếu chưa có browser phù hợp, dùng npx playwright install chromium. E2E thao tác trên tài khoản demo và tạo/xóa dữ liệu thử. Build web nằm trong dist/ và vẫn cần API; không mở index.html bằng file://.

## Media và nguồn

30 clip MP4 và bìa riêng đi kèm để demo không phụ thuộc link video bên ngoài. Bìa được trích từ chính clip, có tên tác giả footage và nguồn Pexels. Hồ sơ và lượt xem seed là dữ liệu minh họa.

- [Danh mục 30 video và checksum](docs/VIDEO-CATALOG.md)
- [Nguồn tài sản, font và thư viện](docs/ASSETS.md)
- [Cài đặt, sao lưu, xử lý sự cố và APK tùy chọn](docs/04-DEPLOYMENT.md)

Tài liệu tham khảo ban đầu, file báo cáo Word/PDF, slide, video thuyết trình, database cá nhân, .env và file build được giữ ngoài repository.
