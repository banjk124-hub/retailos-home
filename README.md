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

Để mở app trên điện thoại trong cùng mạng, có thể chạy `npm run dev -- --host 0.0.0.0`; tuy nhiên URL LAN mặc định dạng `http://192.168.x.x:5173` không phải secure context nên Android/iOS sẽ chặn camera và không hiện hộp thoại xin quyền. Hãy kiểm tra camera trên GitHub Pages sau khi deploy (HTTPS), hoặc dùng một HTTPS development origin có chứng chỉ được thiết bị tin cậy. Trên HTTPS, chạm **Quét mã** sẽ gọi quyền camera từ thao tác người dùng; lần đầu trình duyệt/hệ điều hành sẽ yêu cầu xác nhận. Website không thể tự bỏ qua quyết định từ chối hay tự mở trang cài đặt.

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
- Quyền camera/thông báo cần thao tác trực tiếp của người dùng. Website không thể tự mở trang cài đặt Android/iOS.
- Dock di động có nút quét barcode tự mở camera và đọc mã bằng `src/features/scanner/components/BarcodeScanner.tsx`. Sau khi quét, app tra cứu snapshot đã cache của danh mục, tồn kho, giá/vốn và date sản phẩm theo các trường barcode/EAN/UPC/GTIN/SKU/mã hàng phổ biến; thông tin hàng tìm thấy hiển thị ngay trên app. Kết quả hiện chỉ đọc từ cache thiết bị, chưa gửi thao tác hay dữ liệu sang backend.
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
- Home có năm thư viện: Kiểm soát hàng hóa, Xử lý hàng hóa, Doanh số, Date sản phẩm và Kiểm kê. Cảnh báo chỉ xuất hiện khi snapshot cache có dữ liệu để quy tắc frontend tính toán; không còn nội dung bản tin demo.
- `src/features/scanner/`: scanner camera/barcode có thể tái sử dụng.
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
