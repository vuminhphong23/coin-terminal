# Coin Terminal

Web app "terminal" all-in-one cho coin thủ: theo dõi thị trường buổi sáng, watchlist, scanner cơ hội, quản lý portfolio, máy tính rủi ro, nhật ký trade và tracker airdrop / memecoin. Giao diện tiếng Việt, theme tối kiểu sàn giao dịch, chạy được trên điện thoại.

> ⚠️ **Không phải lời khuyên tài chính.** Coin Terminal chỉ là công cụ tổng hợp thông tin và tính toán hỗ trợ ra quyết định. Giá crypto biến động rất mạnh — hãy tự nghiên cứu (DYOR), quản lý rủi ro và không đầu tư số tiền bạn không thể mất.

## Bố cục tab

Giao diện chia theo tab (tab đang xem được ghi nhớ trong localStorage): **Tổng quan · Scanner · Futures · Danh mục · Công cụ · Nhật ký · Airdrop**.

## Tính năng

1. **Tổng quan** — Tổng vốn hoá thị trường, khối lượng 24h, BTC dominance, chỉ số Fear & Greed, và đoạn bản tin sáng tự tạo từ dữ liệu live (coin tăng/giảm mạnh nhất trong top, tâm lý thị trường). Kèm theo:
   - **Watchlist** — Mặc định BTC, ETH, SOL, BNB, XRP: giá live, biến động 24h / 7 ngày, vốn hoá, volume 24h, sparkline 7 ngày. Thêm coin bằng CoinGecko id / symbol / tên (từ top 100), xoá coin, lưu localStorage.
   - **Cảnh báo giá** — Tạo cảnh báo (coin, giá mục tiêu, lên ≥ / xuống ≤ mục tiêu), lưu localStorage, được kiểm tra mỗi lần dữ liệu làm mới trong lúc trang đang mở; cảnh báo đã kích hoạt được đánh dấu rõ ràng, và có thể gửi thông báo trình duyệt nếu bạn cấp quyền (Notification API).
   - **Coin trending** — Danh sách coin đang được tìm kiếm nhiều nhất trên CoinGecko (`/search/trending`).
2. **Scanner** — Từ top 100 coin: top tăng 24h, top giảm 24h, coin có volume đột biến (tỉ lệ volume 24h / vốn hoá cao), và **ứng viên breakout áp sát ATH** (coin cách đỉnh mọi thời đại không quá 15%, sắp xếp theo độ gần ATH). Riêng bảng volume đột biến và bảng breakout đã **lọc bỏ stablecoin** (theo danh sách CoinGecko id + heuristic giá quanh $1 và biến động 24h rất thấp), vì stablecoin luôn đứng đầu hai bảng này một cách vô nghĩa. Riêng bảng breakout còn yêu cầu **volume 24h ≥ $1M** để loại các token neo giá/RWA có volume bằng 0 dù chưa có trong danh sách stablecoin.
3. **Futures** — Bảng funding rate của 12 cặp USDT perpetual swap trên OKX (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, LINK, AVAX, NEAR, SUI, HYPE): funding % mỗi kỳ, đồng hồ đếm ngược trực tiếp tới kỳ chốt funding tiếp theo, và cảnh báo squeeze khi funding cực trị (|funding| ≥ 0,05%/kỳ = đám đông đang nghiêng mạnh một phía).
4. **Danh mục (Portfolio)** — Thêm khoản nắm giữ (coin, số lượng, giá mua): lãi/lỗ live từng khoản và toàn danh mục, % phân bổ. Lưu localStorage.
5. **Công cụ** —
   - *Position Size:* vốn, % rủi ro, entry, stop-loss, take-profit, đòn bẩy → position size, số lượng, margin cần thiết, lãi/lỗ tiềm năng, tỉ lệ R:R và giá thanh lý futures ước tính.
   - *DCA Simulator:* số tiền mỗi lần mua, số lần mua, giá hiện tại hoặc dãy giá tự nhập → tổng vốn, số lượng tích lũy, giá mua trung bình.
   - *Kế hoạch DCA:* danh sách kế hoạch (coin, số tiền mỗi lần, tần suất hằng ngày / hằng tuần, ngày bắt đầu) lưu localStorage — chỉ là nhắc việc, app không tự mua coin.
   - *Nguyên tắc quản trị rủi ro:* các nguyên tắc tĩnh (rủi ro 1–2%/lệnh, luôn có stop-loss, R:R ≥ 1:2, …).
6. **Nhật ký trade** — Ghi lệnh (coin, long/short, entry, exit, size, ngày, ghi chú): P&L từng lệnh, win rate, tổng P&L, lệnh tốt nhất / tệ nhất. Lưu localStorage. **Lưu ý:** trường *size* là **khối lượng lệnh tính theo USD** (giá trị danh nghĩa/notional của vị thế), không phải số lượng coin — P&L được tính theo % biến động giá nhân khối lượng USD: Long = (exit − entry) / entry × size USD; Short = (entry − exit) / entry × size USD.
7. **Airdrop / Memecoin Tracker** — Danh sách task (dự án, việc cần làm, deadline, trạng thái chưa làm / đang làm / xong, ghi chú tiềm năng). Có sẵn vài task mẫu **chỉ để làm ví dụ** — hãy sửa hoặc xoá và thay bằng dự án thật của bạn.

## Cách chạy local

Không cần cài đặt, không cần build.

Cách 1 — mở trực tiếp: mở file `index.html` bằng trình duyệt.

Cách 2 — chạy server tĩnh (khuyên dùng, tránh một số giới hạn của `file://`):

```bash
cd coin-terminal
python3 -m http.server 8000
# mở http://localhost:8000 trên trình duyệt
```

## Cách deploy

### GitHub Pages

1. Tạo một repository mới trên GitHub (qua giao diện web), ví dụ `coin-terminal`.
2. Push toàn bộ thư mục này lên nhánh `main`.
3. Vào **Settings → Pages → Build and deployment → Source: Deploy from a branch**, chọn nhánh `main`, thư mục `/ (root)`, rồi Save.
4. Đợi vài phút, trang sẽ có địa chỉ dạng `https://<username>.github.io/coin-terminal/`.

### Vercel

1. Đưa code lên một Git repository (GitHub/GitLab/Bitbucket).
2. Vào Vercel → **Add New → Project** → chọn repo.
3. Framework preset: **Other**, không cần build command, output directory để mặc định (root).
4. Deploy — Vercel phục vụ `index.html` như một trang tĩnh.

Lưu ý: dữ liệu người dùng (watchlist, portfolio, nhật ký, task) lưu trong `localStorage` của trình duyệt trên máy của từng người dùng, không đồng bộ lên server.

## API sử dụng

- **CoinGecko Public API** (không cần API key): `GET /api/v3/coins/markets` (top 100, kèm sparkline 7d và % thay đổi 24h/7d, % cách ATH), `GET /api/v3/global` (tổng vốn hoá, volume, BTC dominance) và `GET /api/v3/search/trending` (coin trending).
- **Alternative.me Fear & Greed Index**: `GET https://api.alternative.me/fng/`.
- **OKX Public API**: `GET https://www.okx.com/api/v5/public/funding-rate?instId=<SYMBOL>-USDT-SWAP` cho 12 cặp perpetual swap (funding rate và thời điểm chốt funding).

Nếu API lỗi, bị rate-limit (free tier của CoinGecko khá thấp) hoặc mất mạng, app sẽ thử dùng dữ liệu đã cache trong `localStorage`, và nếu không có cache thì hiển thị **dữ liệu mẫu với nhãn rõ ràng "dữ liệu mẫu (API không khả dụng)"** — giá mẫu này không phải giá live.

## Cấu trúc thư mục

```
coin-terminal/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── api.js    # Lớp gọi API + cache + fallback dữ liệu mẫu
│   └── app.js    # Logic giao diện và các tính năng
├── .gitignore
└── README.md
```

## Khác biệt so với bản hosted trong app

Coin Terminal còn một bản hosted chạy trong app (bản Muse dựng riêng cho người dùng). Hai bản đã được căn chỉnh để **giống nhau về tính năng, bố cục tab và nguồn dữ liệu** (CoinGecko, Alternative.me, OKX), chỉ khác về cách lưu trữ và cách tạo bản tin:

| | Bản GitHub Pages này (tĩnh) | Bản hosted trong app |
|---|---|---|
| Lưu dữ liệu người dùng | Trong `localStorage` của trình duyệt, trên từng thiết bị | Phía server, dùng được xuyên thiết bị |
| Bản tin sáng | Tự tạo ngay tại trình duyệt (client-side) mỗi khi bạn mở trang, từ dữ liệu live lúc đó | Được tổng hợp sẵn tự động lúc 07:30 mỗi ngày (giờ Bangkok) |
| Cảnh báo giá | Kiểm tra khi trang đang mở và dữ liệu làm mới | Theo cơ chế của bản hosted |

## Giới hạn đã biết

- CoinGecko free API có rate-limit; reload quá nhanh có thể tạm thời rơi vào dữ liệu cache/mẫu.
- OKX có thể chặn theo khu vực địa lý hoặc CORS ở một số trình duyệt/khu vực; khi đó riêng tab Futures sẽ hiện thông báo lỗi, các tab khác vẫn hoạt động.
- Thêm coin vào watchlist/portfolio/cảnh báo chỉ hỗ trợ các coin nằm trong top 100 theo vốn hoá.
- Cảnh báo giá chỉ được kiểm tra trong lúc trang đang mở (trang tĩnh không có server chạy nền).
- Giá thanh lý futures là ước tính đơn giản (chưa gồm phí giao dịch và maintenance margin của từng sàn).
- Dữ liệu localStorage chỉ tồn tại trên một trình duyệt / một thiết bị.
