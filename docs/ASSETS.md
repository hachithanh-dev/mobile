# Nguồn tài sản và tham chiếu

## Phạm vi repository

Giao diện Luma được dựng riêng bằng React Native. Tài liệu và ảnh tham khảo đầu vào được giữ trong bản làm việc của nhóm, không phân phối kèm repository mã nguồn.

## Media minh họa

Ảnh được tải từ Unsplash vào `server/media/cover-*.jpg` bằng `scripts/download-media.mjs`. Script chứa URL và ID gốc. Avatar từ Pravatar, là danh tính mẫu, không phải thành viên nhóm.

Feed hiện dùng 30 clip riêng từ Pexels, không dùng chung clip hoa. Ảnh bìa được trích từ chính clip, thời lượng và kích thước được kiểm tra bằng Chromium. Mỗi bài có link nguồn và tên tác giả footage. [Danh mục đầy đủ](VIDEO-CATALOG.md) và `server/media/catalog-manifest.json` ghi nguồn tải, license, SHA-256 và metadata. Tài khoản đăng bài trong Luma là tài khoản demo, không phải tác giả footage.

Clip `server/media/sample.mp4`: [MDN interactive example — flower.mp4](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4), clip CC0 chỉ dùng cho nút chọn video demo trong composer và kiểm thử upload. Clip này không phải nội dung mặc định của 30 bài trong feed.

Nguồn ảnh: [Unsplash](https://unsplash.com/license). Avatar: [Pravatar](https://pravatar.cc/). Chỉ sử dụng dữ liệu mẫu trong demo học tập, kiểm tra điều khoản trước khi phân phối sản phẩm công khai.

## Tài liệu kỹ thuật đã đối chiếu

Font Inter: `@expo-google-fonts/inter` 0.4.2, dùng bốn face static 400/500/600/700. Font đi kèm dependency, không gọi Google Fonts lúc mở app. Giấy phép OFL-1.1 cho font và MIT cho package; bản giấy phép đi kèm trong package. Hướng dẫn: [Expo — Fonts](https://docs.expo.dev/develop/user-interface/fonts/).

- [Expo SDK 55](https://docs.expo.dev/versions/v55.0.0/)
- [Expo Video](https://docs.expo.dev/versions/v55.0.0/sdk/video/)
- [Expo ImagePicker](https://docs.expo.dev/versions/v55.0.0/sdk/imagepicker/)
- [Expo Go — chọn phiên bản](https://expo.dev/go)
- [Node SQLite](https://nodejs.org/api/sqlite.html)

Dependency và phiên bản chính xác nằm trong `package-lock.json`. Không đưa ảnh/clip mẫu vào báo cáo như minh chứng số lượng người dùng hoặc lượt xem thật; các số seed chỉ để minh họa.
