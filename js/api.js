/* Coin Terminal - API layer
 * Nguồn dữ liệu runtime:
 *  - CoinGecko public API: /coins/markets (top 100 + sparkline 7d), /global
 *  - Alternative.me: Fear & Greed Index
 * Nếu API lỗi / rate-limit (429) / offline: trả về SAMPLE với cờ isFallback=true
 * để UI hiển thị rõ nhãn "dữ liệu mẫu (API không khả dụng)". Giá mẫu KHÔNG phải giá live.
 */
(function (global) {
  'use strict';

  var COINGECKO = 'https://api.coingecko.com/api/v3';
  var FNG_URL = 'https://api.alternative.me/fng/?limit=1&format=json';
  var CACHE_KEY = 'ct_cache_v1';
  var CACHE_TTL_MS = 5 * 60 * 1000;

  // --- Dữ liệu mẫu: chỉ dùng khi API không khả dụng, luôn được UI gắn nhãn rõ ràng ---
  function fakeSpark(base) {
    var out = [], v = base * 0.92;
    for (var i = 0; i < 28; i++) { v *= 1 + (Math.sin(i / 3) * 0.012); out.push(Math.round(v * 100) / 100); }
    out.push(base); return out;
  }
  function sampleCoin(id, symbol, name, price, ch24, ch7, mcap, vol, athCh) {
    return { id: id, symbol: symbol, name: name, current_price: price,
      price_change_percentage_24h: ch24, price_change_percentage_7d_in_currency: ch7,
      ath_change_percentage: athCh, market_cap: mcap, total_volume: vol, sparkline_in_7d: { price: fakeSpark(price) } };
  }
  var SAMPLE = {
    markets: [
      sampleCoin('bitcoin', 'btc', 'Bitcoin', 67000, 1.2, 3.4, 1320000000000, 28000000000, -38.5),
      sampleCoin('ethereum', 'eth', 'Ethereum', 3500, 0.8, 2.1, 420000000000, 15000000000, -42.1),
      sampleCoin('solana', 'sol', 'Solana', 160, -2.1, 5.0, 73000000000, 3200000000, -11.8),
      sampleCoin('binancecoin', 'bnb', 'BNB', 590, 0.4, 1.0, 87000000000, 1600000000, -24.6),
      sampleCoin('ripple', 'xrp', 'XRP', 0.62, -0.6, -1.2, 34000000000, 1200000000, -55.3)
    ],
    globalData: { data: { total_market_cap: { usd: 2300000000000 }, total_volume: { usd: 90000000000 },
      market_cap_percentage: { btc: 54.2 } } },
    fng: { data: [{ value: '50', value_classification: 'Neutral' }] }
  };

  function fetchJson(url) {
    return fetch(url, { headers: { accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r.json();
    });
  }

  function saveCache(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), payload: payload })); } catch (e) { /* ignore */ }
  }
  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (Date.now() - c.t > CACHE_TTL_MS * 12) return null; // cache quá cũ (>1h) thì bỏ
      return c.payload;
    } catch (e) { return null; }
  }

  /**
   * Lấy toàn bộ dữ liệu thị trường.
   * @returns {Promise<{markets:Array, globalData:Object, fng:Object, isFallback:boolean, fromCache:boolean}>}
   */
  function getMarketData() {
    var marketsUrl = COINGECKO + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d';
    return Promise.allSettled([
      fetchJson(marketsUrl),
      fetchJson(COINGECKO + '/global'),
      fetchJson(FNG_URL)
    ]).then(function (res) {
      var markets = res[0].status === 'fulfilled' ? res[0].value : null;
      if (!Array.isArray(markets) || markets.length === 0) throw new Error('CoinGecko markets unavailable');
      var payload = {
        markets: markets,
        globalData: res[1].status === 'fulfilled' ? res[1].value : SAMPLE.globalData,
        fng: res[2].status === 'fulfilled' ? res[2].value : SAMPLE.fng,
        isFallback: false, fromCache: false
      };
      saveCache(payload);
      return payload;
    }).catch(function () {
      var cached = loadCache();
      if (cached) { cached.fromCache = true; cached.isFallback = false; return cached; }
      return { markets: SAMPLE.markets, globalData: SAMPLE.globalData, fng: SAMPLE.fng, isFallback: true, fromCache: false };
    });
  }

  // --- OKX Futures: funding rate của 12 cặp USDT perpetual swap ---
  var OKX = 'https://www.okx.com/api/v5';
  var FUTURES_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'NEAR', 'SUI', 'HYPE'];

  /**
   * Lấy funding rate hiện tại từ OKX cho 12 cặp -USDT-SWAP, gọi song song.
   * Không bịa dữ liệu funding: lỗi cặp nào bỏ cặp đó; lỗi tất cả thì ok=false để UI báo lỗi rõ ràng.
   * @returns {Promise<{ok:boolean, rates:Array<{symbol,instId,fundingRate,fundingTime,nextFundingTime}>, failed:number}>}
   */
  function getFundingRates() {
    return Promise.allSettled(FUTURES_SYMBOLS.map(function (sym) {
      var instId = sym + '-USDT-SWAP';
      return fetchJson(OKX + '/public/funding-rate?instId=' + instId).then(function (res) {
        var d = res && res.data && res.data[0];
        if (!d) throw new Error('OKX empty ' + instId);
        return { symbol: sym, instId: instId, fundingRate: parseFloat(d.fundingRate),
          fundingTime: Number(d.fundingTime), nextFundingTime: Number(d.nextFundingTime) };
      });
    })).then(function (res) {
      var rates = res.filter(function (r) { return r.status === 'fulfilled'; }).map(function (r) { return r.value; });
      return { ok: rates.length > 0, rates: rates, failed: res.length - rates.length };
    });
  }

  /** Coin trending trên CoinGecko: GET /search/trending. Lỗi thì throw để UI ẩn section kèm ghi chú nhỏ. */
  function getTrending() {
    return fetchJson(COINGECKO + '/search/trending').then(function (res) {
      var coins = (res && res.coins) || [];
      if (!coins.length) throw new Error('Trending empty');
      return coins;
    });
  }

  global.CoinAPI = { getMarketData: getMarketData, getFundingRates: getFundingRates, getTrending: getTrending, FUTURES_SYMBOLS: FUTURES_SYMBOLS };
})(window);
