# RetailOS Home

PWA nội bộ được xây dựng bằng React, TypeScript và Vite. Repository hiện là frontend prototype: tài khoản được khai báo trong code, dữ liệu nghiệp vụ chưa kết nối Google Drive/Sheets, và Web Push cần backend để gửi thông báo.

## Desktop, tablet và mobile — product/platform contract

RetailOS dùng chung một bộ nhận diện thương hiệu và một ngôn ngữ nghiệp vụ cốt lõi, nhưng **không bắt buộc dùng chung feature set, shell, navigation, layout hay component composition trên mọi nền tảng**.

- **Shared identity:** tên gọi, nhận diện thương hiệu, thuật ngữ nghiệp vụ, ý nghĩa dữ liệu và các quy tắc nghiệp vụ thực sự dùng chung phải nhất quán.
- **Default shared scope:** khi yêu cầu chỉ nêu một chức năng mà không giới hạn nền tảng, mặc định chức năng có trên cả Desktop và Mobile. Chỉ tạo Desktop-only/Mobile-only khi yêu cầu hoặc quyết định nghiệp vụ nêu rõ phạm vi. Mọi workflow phải khai báo platform scope trong matrix; không suy luận scope từ breakpoint/CSS.
- **Shared business core, independent presentation:** cùng nghiệp vụ phải dùng chung domain/data/state, validation và kết quả. Desktop/Mobile được bố trí shell, navigation, information architecture, layout, spacing và component composition riêng. Không nhân đôi logic chỉ để có hai presentation.
- **Scanner exception:** camera barcode scanner, entry point, mô tả/hướng dẫn và CSS riêng của trải nghiệm camera chỉ dành cho Mobile. Tra cứu barcode thủ công vẫn là năng lực dùng chung. Không để scanner-only copy hoặc style xuất hiện trên Desktop.
- **Shared journey/design:** identity, thuật ngữ, ý nghĩa trạng thái, business journey và design principles dùng chung khi cùng mục tiêu; mỗi platform được phép chuyển chúng thành cách trình bày phù hợp.
- **Change isolation:** thay đổi presentation/capability riêng Desktop không được làm thay đổi Mobile và ngược lại. Thay đổi shared contract phải cập nhật và kiểm chứng cả hai platform.
- **Tablet:** tiếp tục là context `review-required`; không tự động kế thừa Desktop hoặc Mobile.
- **Responsive is not platform parity:** responsive xử lý biến thiên viewport/orientation/available space bên trong presentation phù hợp; nó không phải cơ chế ép tất cả nền tảng dùng cùng một layout.
- **PWA app experience:** installed PWA ưu tiên chế độ standalone khi nền tảng hỗ trợ. Fullscreen là chế độ/flow có điều kiện, không phải giả định rằng mọi OS đều cho phép ẩn system UI. Tôn trọng status/navigation bars, safe areas, dynamic viewport, keyboard, permission prompts và lifecycle của từng nền tảng. Chỉ dùng immersive fullscreen cho workflow cần thiết và có fallback rõ ràng.
- **Capability detection:** chọn presentation/capability bằng feature detection và các tín hiệu phù hợp (viewport, pointer/hover, touch, display mode, API/permission availability); không dựa duy nhất vào User-Agent hoặc breakpoint để suy ra loại thiết bị.
- **Truthful availability:** UI phải phân biệt feature không được cung cấp trên nền tảng, feature chưa triển khai, thiếu quyền, thiếu dữ liệu và lỗi vận hành. Không hiển thị entry point giả hoặc đánh dấu ready chỉ vì có tile.

Đây là product/architecture contract đã được owner xác nhận tại `docs/ai-context/PLATFORM_CAPABILITY_MATRIX.md`. SH-01B/C/D đã tách authenticated shell khỏi auth/session owner, có platform context resolver, composition roots Desktop/Mobile riêng và Home workflow state dùng chung. Tablet giữ compatibility fallback; camera scanner chỉ được cung cấp theo policy Mobile. Exact-head CI #1945 đã pass trên head `3ceb12d6f91a7cab8fd3ceccb5c7947c6028013f`, gồm 10 Playwright tests. Physical-device validation vẫn thuộc PW-01. Xem `docs/ai-context/SH-01_SHELL_PRESENTATION_OWNERSHIP.md`, DECISIONS.md (PD-007/PD-008), ARCHITECTURE.md (ADR-030) và PLATFORM_EXPERIENCE_ARCHITECTURE_AUDIT.md.

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
- `src/sw/service-worker.template.js`: nguồn worker; Vite sinh `dist/sw.js` theo build. Worker update chỉ nhận metadata khi được hỏi; không tải payload mới trong sự kiện `install`.
- `vite.config.ts` tạo build ID và `release-manifest.json` chứa shell/runtime inventory, byte size và SHA-256. `release-notes.json` là nội dung release notes gắn với build; version phải khớp `package.json` và lockfile.
- `src/shared/pwa/PwaUpdatePrompt.tsx` phát hiện bản mới, hiển thị version đang chạy/bản mới, release notes, cảnh báo, dung lượng và tiến trình tải. Người dùng xác nhận tải trước; sau khi xác minh, ứng dụng chờ nghiệp vụ kết thúc và yêu cầu xác nhận kích hoạt riêng.
- Payload được tải vào cache riêng theo build, theo batch 2, kiểm tra checksum và cache read-back. Bản cũ tiếp tục hoạt động khi tải; lỗi chỉ xóa cache candidate. Staged marker được khôi phục sau khi mở app lại nhưng không tự kích hoạt.
- Safe handoff được bảo vệ bởi camera lease, Stocktake, Stocktake Import, đồng bộ snapshot/IndexedDB cleanup, dirty form, app transition và multi-window guard; blocker hết không tự kích hoạt mà chỉ mở quyền xác nhận. Boot health/rollback giữ nguyên; không tác động IndexedDB/dữ liệu nghiệp vụ.
- Lưu ý rollout đầu tiên: client cũ từ PR #119 dùng một lần bridge; thao tác Cập nhật cũ được xem là consent để tải. Client cũ không thể hiển thị release notes/progress mới cho đến khi nạp phiên bản này.
- Contract bắt buộc cho mọi lần phát triển/deploy nằm tại `docs/ai-context/PWA_RUNTIME_RELEASE.md`. Data-only refresh không tăng BUILD_ID, không tải app release và không reload.
- `.github/workflows/deploy.yml` chỉ cho phép build/deploy GitHub Pages production từ `main`, kể cả `workflow_dispatch`; không dùng production Pages để preview branch.
- Push notification dùng lại registration trung tâm, không tự đăng ký worker lần thứ hai.
- Giao diện sáng được áp dụng nhất quán, không đổi theo cài đặt sáng/tối của hệ điều hành. App vẫn tôn trọng `prefers-reduced-motion`, Reduce Data và tín hiệu pin/thiết bị để giảm blur, animation và tải render. Web không có API nhiệt độ thiết bị đáng tin cậy trên các trình duyệt mục tiêu, nên tiết kiệm nhiệt dựa trên các tín hiệu tài nguyên/pin thay vì đọc nhiệt độ trực tiếp.
- `src/styles/theme.css` và `src/styles/adaptive-appearance.css` là các tài nguyên styling/runtime hiện có. Chúng mô tả implementation hiện tại, không phải quy chuẩn thẩm mỹ bắt buộc cho mọi màn hình. Khi thay đổi trải nghiệm, xác định hướng thiết kế theo yêu cầu cụ thể và kiểm tra tác động responsive/performance. Ưu tiên native scroll-snap khi phù hợp; carousel thư viện hỗ trợ giữ-kéo bằng chuột trên desktop.
- Quyền camera/thông báo cần thao tác trực tiếp của người dùng. Quyền camera được lưu cho trang web theo cài đặt của trình duyệt, nhưng hệ điều hành/trình duyệt vẫn có thể yêu cầu xác nhận lại hoặc thu hồi quyền. Website không thể tự mở trang cài đặt Android/iOS.
- Dock di động có nút quét barcode tự mở camera và đọc mã bằng `src/features/scanner/components/BarcodeScanner.tsx`; camera chiếm gần toàn màn hình để dễ căn chỉnh. Home tải trước scanner để giảm thời gian chờ khi chạm quét. Sau khi quét, app tra cứu snapshot đã cache của danh mục, tồn kho, giá/vốn và date sản phẩm theo các trường barcode/EAN/UPC/GTIN/SKU/mã hàng phổ biến; thông tin hàng tìm thấy hiển thị ngay trên app. Kết quả hiện chỉ đọc từ cache thiết bị, chưa gửi thao tác hay dữ liệu sang backend.
- Spotlight hiện giữ nguyên các nút/chức năng và dùng monogram RetailOS SVG; nền Login/Home hiện được cấu hình trong `src/shared/config/backgrounds.ts`. Đây là mô tả source hiện tại, không phải định hướng hình ảnh/thẩm mỹ cho các lần thiết kế tiếp theo.
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
- `src/styles/theme.css` chứa các token đang được source sử dụng. Trước khi tái sử dụng hoặc mở rộng, hãy kiểm tra ownership, consumers và khả năng đáp ứng concept đã được duyệt; không mặc định token hiện tại là giới hạn sáng tạo.
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


## Module Kiểm kê (local-first)
- Mở từ Thư viện nghiệp vụ → Kiểm kê.
- Phiên kiểm kê, vùng, các lượt barcode, nhật ký và bản xuất được lưu trong IndexedDB riêng `retailos-stocktake`.
- Nhập vùng theo dạng chữ + số, ví dụ `AT01`; file xuất có dòng `ADRESSE,AT,01`.
- Mỗi lượt quét được lưu thành một dòng ARTICLE riêng; barcode trùng không tự gộp.
- Trước khi xuất, nhân viên có thể thêm/sửa/xóa dòng và xem trước nội dung file.
- Nhập lại vùng đã tồn tại sẽ yêu cầu xác nhận và tạo revision mới; revision cũ vẫn nằm trong lịch sử. Revision đã xuất được khóa.
- File `.txt` dùng thời điểm xuất thực tế và có thể tải lại từ lịch sử file.
- Xóa dữ liệu trong module chỉ xóa kho IndexedDB của Kiểm kê, không xóa cache module khác hoặc phiên đăng nhập.
- Dữ liệu hiện chỉ lưu trên thiết bị; chưa đồng bộ lên backend hoặc thiết bị khác. Cần kiểm tra build và QA camera trên Android trước khi triển khai sử dụng thực tế.
