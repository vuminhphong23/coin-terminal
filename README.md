# Coin Terminal

Web app "terminal" all-in-one cho coin thủ: theo dõi thị trường buổi sáng, watchlist, scanner cơ hội, quản lý portfolio, máy tính rủi ro, nhật ký trade và tracker airdrop / memecoin. Giao diện tiếng Việt, theme tối kiểu sàn giao dịch, chạy được trên điện thoại.

> ⚠️ **Không phải lời khuyên tài chính.** Coin Terminal chỉ là công cụ tổng hợp thông tin và tính toán hỗ trợ ra quyết định. Giá crypto biến động rất mạnh — hãy tự nghiên cứu (DYOR), quản lý rủi ro và không đầu tư số tiền bạn không thể mất.

## Tính năng

1. **Dashboard / Bản tin sáng** — Tổng vốn hoá thị trường, khối lượng 24h, BTC dominance, chỉ số Fear & Greed, và đoạn bản tin sáng tự tạo từ dữ liệu live (coin tăng/giảm mạnh nhất trong top, tâm lý thị trường).
2. **Watchlist** — Mặc định BTC, ETH, SOL, BNB, XRP: giá live, biến động 24h / 7 ngày, vốn hoá, volume 24h, sparkline 7 ngày. Thêm coin bằng CoinGecko id / symbol / tên (từ top 100), xoá coin, lưu tự động trong trình duyệt (localStorage).
3. **Scanner cơ hội** — Từ top 100 coin: top tăng 24h, top giảm 24h, và coin có volume đột biến (tỉ lệ volume 24h / vốn hoá cao).
4. **Portfolio** — Thêm khoản nắm giữ (coin, số lượng, giá mua): lãi/lỗ live từng khoản và toàn danh mục, % phân bổ. Lưu localStorage.
5. **Công cụ quản lý rủi ro**
   - *Position Size:* vốn, % rủi ro, entry, stop-loss, take-profit, đòn bẩy → position size, số lượng, margin cần thiết, lãi/lỗ tiềm năng, tỉ lệ R:R và giá thanh lý futures ước tính.
   - *DCA Simulator:* số tiền mỗi lần mua, số lần mua, giá hiện tại hoặc dãy giá tự nhập → tổng vốn, số lượng tích lũy, giá mua trung bình.
6. **Nhật ký trade** — Ghi lệnh (coin, long/short, entry, exit, size, ngày, ghi chú): P&L từng lệnh, win rate, tổng P&L, lệnh tốt nhất / tệ nhất. Lưu localStorage.
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

- **CoinGecko Public API** (không cần API key): `GET /api/v3/coins/markets` (top 100, kèm sparkline 7d và % thay đổi 24h/7d) và `GET /api/v3/global` (tổng vốn hoá, volume, BTC dominance).
- **Alternative.me Fear & Greed Index**: `GET https://api.alternative.me/fng/`.

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

## Giới hạn đã biết

- CoinGecko free API có rate-limit; reload quá nhanh có thể tạm thời rơi vào dữ liệu cache/mẫu.
- Thêm coin vào watchlist/portfolio chỉ hỗ trợ các coin nằm trong top 100 theo vốn hoá.
- Giá thanh lý futures là ước tính đơn giản (chưa gồm phí giao dịch và maintenance margin của từng sàn).
- Dữ liệu localStorage chỉ tồn tại trên một trình duyệt / một thiết bị.
