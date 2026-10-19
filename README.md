# RetailOS Home

PWA nội bộ được xây dựng bằng React, TypeScript và Vite. Repository hiện là frontend prototype: tài khoản được khai báo trong code, dữ liệu nghiệp vụ chưa kết nối Google Drive/Sheets, và Web Push cần backend để gửi thông báo.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+
- npm

## Phát triển trong VS Code

```powershell
npm ci
npm run dev
```

Vite tự reload khi lưu code. Chạy `npm run build` trước khi đưa thay đổi lên GitHub để kiểm tra TypeScript và production bundle.

Để mở app trên điện thoại trong cùng mạng, có thể chạy `npm run dev -- --host 0.0.0.0`; tuy nhiên URL LAN mặc định dạng `http://192.168.x.x:5173` không phải secure context nên Android/iOS sẽ chặn camera và không hiện hộp thoại xin quyền. Hãy kiểm tra camera trên GitHub Pages sau khi deploy (HTTPS), hoặc dùng một HTTPS development origin có chứng chỉ được thiết bị tin cậy. Trên HTTPS, cấp quyền camera một lần ở màn hình khởi tạo phiên để tính năng quét barcode có thể sử dụng. Trình duyệt/hệ điều hành quản lý thời hạn quyền và người dùng có thể thu hồi quyền trong cài đặt; website không thể giữ quyền trái với lựa chọn đó hoặc tự mở trang cài đặt. Camera chỉ bật khi quét, rồi tắt khi đóng hoặc chuyển app xuống nền.

## Cấp tài khoản prototype

Thêm hoặc cập nhật nhân viên trong `src/features/auth/services/employeeDirectory.ts`. Chỉ lưu tài khoản thử nghiệm ở đây: mã và danh sách được đưa vào frontend nên người dùng có thể xem chúng. Đây không phải cơ chế bảo vệ dữ liệu.

## Kiểm thử production build cục bộ

```powershell
npm run build
npm run preview
```

Để kiểm tra đúng đường dẫn GitHub Pages:

```powershell
npm run build:pages
npm run preview:pages -- --host 127.0.0.1
```

Mở URL Vite preview hiển thị trong terminal. Kiểm tra manifest, asset và service worker đều được tải dưới `/retailos-home/`.

## Deploy và cập nhật

Workflow `.github/workflows/deploy.yml` tự build và deploy GitHub Pages khi có push vào `main`; có thể chạy thủ công bằng **Actions → Build and deploy PWA → Run workflow**.

Thiết lập repository một lần:

1. Đẩy repository lên GitHub.
2. Mở **Settings → Pages** và chọn **GitHub Actions** làm nguồn deploy.
3. Đảm bảo workflow có quyền `pages: write` và `id-token: write` (đã khai báo trong workflow).
4. Sau mỗi lần sửa code trong VS Code, chạy `npm run build`, commit và push lên `main`. Workflow sẽ cập nhật trang tự động.

URL GitHub Pages của repository này dự kiến là `https://banjk124-hub.github.io/retailos-home/`. Nếu đổi tên repository, cần cập nhật base path `/retailos-home/` trong script `build:pages`.

## PWA, cache và quyền thiết bị

- `public/manifest.webmanifest`: metadata/cài đặt PWA; đường dẫn tương đối để hỗ trợ GitHub Pages project site.
- `public/sw.js`: cache app shell, offline fallback và nhận/click Web Push. Khi đổi quy tắc cache, tăng `CACHE_NAME`.
- `src/main.tsx`: đăng ký service worker trong production dưới base path của app.
- Theme sáng/tối/theo thiết bị được áp dụng toàn app; nút giao diện trên Home luân phiên ba chế độ. Chế độ theo thiết bị bám `prefers-color-scheme`; khi API pin có sẵn và pin xuống 20% trong lúc không sạc, app tự chuyển tối và giảm hiệu ứng. Trình duyệt không cung cấp API pin thì app dùng chế độ hệ thống. Tôn trọng `prefers-reduced-motion`, Reduce Data và giới hạn tài nguyên thiết bị để giảm blur, animation và tải render. Web không có API nhiệt độ thiết bị đáng tin cậy trên các trình duyệt mục tiêu, nên tiết kiệm nhiệt dựa trên các tín hiệu tài nguyên/pin này thay vì đọc nhiệt độ trực tiếp.
- Token thương hiệu dùng chung (màu, liquid glass, bo góc, bóng và nhịp chuyển động) nằm tại `src/styles/theme.css`; `src/styles/adaptive-appearance.css` chứa theme tối và chính sách hiệu năng/thích nghi. Ưu tiên native scroll-snap cho thao tác vuốt; carousel thư viện hỗ trợ giữ-kéo bằng chuột trên desktop.
- Quyền camera/thông báo cần thao tác trực tiếp của người dùng. Quyền camera được lưu cho trang web theo cài đặt của trình duyệt, nhưng hệ điều hành/trình duyệt vẫn có thể yêu cầu xác nhận lại hoặc thu hồi quyền. Website không thể tự mở trang cài đặt Android/iOS.
- Dock di động có nút quét barcode tự mở camera và đọc mã bằng `src/features/scanner/components/BarcodeScanner.tsx`; camera chiếm gần toàn màn hình để dễ căn chỉnh. Home tải trước scanner để giảm thời gian chờ khi chạm quét. Sau khi quét, app tra cứu snapshot đã cache của danh mục, tồn kho, giá/vốn và date sản phẩm theo các trường barcode/EAN/UPC/GTIN/SKU/mã hàng phổ biến; thông tin hàng tìm thấy hiển thị ngay trên app. Kết quả hiện chỉ đọc từ cache thiết bị, chưa gửi thao tác hay dữ liệu sang backend.
- Spotlight giữ nguyên các nút/chức năng ở lớp trước và dùng ảnh minh họa siêu thị local ở `public/supermarket-scenes/`; ảnh đổi theo ngày, chuyển động chậm, và được precache cùng app shell cho chế độ offline.
- Web Push client có ở `src/features/notifications/pushNotifications.ts`. Để đăng ký subscription cần cấu hình `VITE_VAPID_PUBLIC_KEY` và `VITE_PUSH_SUBSCRIPTION_URL` trong môi trường deploy. Endpoint backend và VAPID private key chưa được cung cấp/triển khai; không đưa khóa riêng vào frontend.

## Luồng dữ liệu snapshot từ Apps Script

`src/features/data/moduleDataService.ts` là cổng dữ liệu frontend duy nhất để đồng bộ output Apps Script và đọc snapshot đã cache. Module nghiệp vụ chỉ cần đọc `getCachedModuleSnapshot(moduleId)`; không gọi Apps Script trực tiếp. Dữ liệu được lưu trong IndexedDB riêng cho từng module. Khi nhận manifest mới, cache module không còn được cấp sẽ bị xóa; snapshot đang cache chỉ được thay bằng snapshot mới sau khi phản hồi mới hợp lệ đã tải xong. Khi đăng xuất, cache module được xóa khỏi thiết bị.

Thiết lập `VITE_APPS_SCRIPT_DATA_URL` thành endpoint HTTPS. API cần hỗ trợ CORS cho domain GitHub Pages, `Authorization: Bearer <token>` và các request:

- `GET ?action=manifest` trả `{ "snapshotDate": "2026-10-18", "authorizedModules": ["inventory", "product-dates"], "modules": { "inventory": { "version": "v1", "snapshotDate": "2026-10-18" }, "product-dates": { "version": "v4", "snapshotDate": "2026-10-18" } } }`.
- `GET ?action=snapshot&module=inventory&version=v1` trả `{ "moduleId": "inventory", "version": "v1", "snapshotDate": "2026-10-18", "data": { "rows": [{ "productName": "Mặt hàng mẫu", "quantity": 4, "minimumQuantity": 5 }] } }`.

Module IDs hiện gồm `inventory`, `price`, `orders`, `sales`, `products`, `delivery`, `product-dates`, `stocktake`; chúng được khai báo kiểu ở `src/features/data/moduleDataService.ts` và dùng lại bởi thư viện Home. Chỉ ID trong `authorizedModules` được tải. Backend vẫn phải xác minh quyền trên mỗi yêu cầu; không được tin danh sách module do client gửi.

Thông báo Home không còn dùng bản tin demo. `src/features/home/snapshotNoticeRules.ts` chỉ tạo cảnh báo từ snapshot IndexedDB: tồn kho so với `minimumQuantity`/`reorderPoint`, date sản phẩm trong 7 ngày hoặc quá hạn, và doanh số thực tế so với `salesTarget`/`target`. Snapshot cần trả các trường chuẩn hóa này trong `data.rows`; thiếu snapshot hoặc thiếu dữ liệu so sánh thì không hiện cảnh báo tương ứng.

Lớp đồng bộ yêu cầu access token do xác thực backend cấp qua `syncAuthorizedModuleData({ accessToken })`. Login hiện tại vẫn là xác thực prototype frontend, chưa cấp token; do đó API/đồng bộ thật chưa hoạt động cho đến khi tích hợp bước cấp token và triển khai endpoint. Không đặt access token dùng chung, mật khẩu hay Apps Script secret trong biến `VITE_*`, vì các giá trị này được đóng gói vào frontend. Apps Script trực tiếp cũng phải được kiểm tra CORS/redirect trên GitHub Pages; nếu không đáp ứng, cần endpoint proxy HTTPS có xác thực.

## Cấu trúc

- `src/App.tsx`: điều phối đăng nhập, phiên, cài đặt và Home.
- `src/features/auth/`: form, xác thực prototype, quyền thiết bị và lưu phiên.
- `src/features/home/`: Home và trạng thái giao diện riêng.
- Ngôn ngữ thương hiệu dùng chung được khai báo bằng các token `--brand-*` trong `src/styles/theme.css` (màu, liquid glass, bóng đổ và chuyển động). Giao diện mới nên dùng các token này thay vì tạo bộ màu/animation riêng.
- Home có năm thư viện: Kiểm soát hàng hóa, Xử lý hàng hóa, Doanh số, Date sản phẩm và Kiểm kê. Cảnh báo chỉ xuất hiện khi snapshot cache có dữ liệu để quy tắc frontend tính toán; không còn nội dung bản tin demo.
- `src/features/scanner/`: scanner camera/barcode có thể tái sử dụng.
- Home không còn giao diện thử nghiệm xuất file hoặc chụp ảnh. Các hàm tạo CSV/XLSX/PDF/TXT/PPTX dùng lại được giữ ở `src/features/data/exportFormats.ts`; tiện ích chụp một khung camera thành JPEG giữ ở `src/shared/services/cameraCapture.ts`. Khi một module nghiệp vụ cần dùng, module đó sẽ gọi các tiện ích này và tự định nghĩa flow, dữ liệu đầu vào và output phù hợp.
- `src/features/notifications/`: đăng ký Web Push phía client.
- `src/shared/`: cấu hình bộ phận và UI dùng chung.
- `src/styles/`: CSS theo lớp; `performance.css` giảm hiệu ứng nặng trên thiết bị di động.
- `.github/workflows/deploy.yml`: build/deploy Pages tự động.

## Giới hạn trước khi dùng dữ liệu thật

- Đăng nhập hiện kiểm tra mã ở frontend, không phải xác thực an toàn.
- Dữ liệu Google Drive/Sheets, phân quyền module phía backend và API đồng bộ snapshot chưa được nối.
- Không nhúng dữ liệu nội bộ hoặc bí mật vào bundle frontend/GitHub Pages.
- Web Push cần backend nhận subscription và gửi push; quyền thông báo của trình duyệt một mình chưa gửi được thông báo.
- Cần kiểm thử quyền camera, cài PWA và push trên Android thật và iOS/iPadOS thật trước khi triển khai sử dụng rộng rãi.
