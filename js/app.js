/* Coin Terminal - main logic (vanilla JS, dữ liệu lưu localStorage) */
(function () {
  'use strict';

  var LS = { watch: 'ct_watchlist_v1', pf: 'ct_portfolio_v1', journal: 'ct_journal_v1', air: 'ct_airdrop_v1' };
  var DEFAULT_WATCH = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple'];
  var state = { markets: [], byId: {}, isFallback: false };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function load(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function fmtUsd(n, dec) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1) return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: dec == null ? 2 : dec });
    return '$' + Number(n).toPrecision(4);
  }
  function fmtBig(n) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    return fmtUsd(n);
  }
  function fmtPct(n) { if (n == null || isNaN(n)) return '—'; return (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%'; }
  function pctClass(n) { return n == null || isNaN(n) ? '' : (n >= 0 ? 'up' : 'down'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function findCoin(q) {
    if (!q) return null;
    q = String(q).trim().toLowerCase();
    return state.byId[q] || state.markets.find(function (c) { return c.symbol.toLowerCase() === q || c.name.toLowerCase() === q; }) || null;
  }
  function sparklineSvg(prices) {
    if (!prices || prices.length < 2) return '—';
    var w = 120, h = 32, min = Math.min.apply(null, prices), max = Math.max.apply(null, prices), range = (max - min) || 1;
    var pts = prices.map(function (p, i) { return (i / (prices.length - 1) * w).toFixed(1) + ',' + (h - 3 - (p - min) / range * (h - 6)).toFixed(1); }).join(' ');
    var color = prices[prices.length - 1] >= prices[0] ? '#0ecb81' : '#f6465d';
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><polyline fill="none" stroke="' + color + '" stroke-width="1.5" points="' + pts + '"/></svg>';
  }

  // ---------- dashboard ----------
  function renderDashboard(data) {
    var g = (data.globalData && data.globalData.data) || {};
    $('mcap').textContent = fmtBig(g.total_market_cap && g.total_market_cap.usd);
    $('vol24').textContent = fmtBig(g.total_volume && g.total_volume.usd);
    $('btcDom').textContent = g.market_cap_percentage && g.market_cap_percentage.btc != null ? Number(g.market_cap_percentage.btc).toFixed(1) + '%' : '—';
    var f = data.fng && data.fng.data && data.fng.data[0];
    $('fng').textContent = f ? f.value : '—';
    $('fngLabel').textContent = f ? f.value_classification : '';

    var sorted = state.markets.slice().filter(function (c) { return c.price_change_percentage_24h != null; });
    sorted.sort(function (a, b) { return b.price_change_percentage_24h - a.price_change_percentage_24h; });
    var gainer = sorted[0], loser = sorted[sorted.length - 1];
    var sentiment = f ? ('Chỉ số Fear & Greed đang ở ' + f.value + ' (' + f.value_classification + ')') : 'Chưa có dữ liệu Fear & Greed';
    var lines = [];
    lines.push('☀️ Bản tin sáng Coin Terminal' + (state.isFallback ? ' — dữ liệu mẫu (API không khả dụng)' : ''));
    if (gainer) lines.push('• Coin tăng mạnh nhất trong top: ' + gainer.name + ' (' + gainer.symbol.toUpperCase() + ') ' + fmtPct(gainer.price_change_percentage_24h) + ' trong 24h, giá ' + fmtUsd(gainer.current_price) + '.');
    if (loser) lines.push('• Coin giảm mạnh nhất: ' + loser.name + ' (' + loser.symbol.toUpperCase() + ') ' + fmtPct(loser.price_change_percentage_24h) + ' trong 24h, giá ' + fmtUsd(loser.current_price) + '.');
    lines.push('• Tổng vốn hoá: ' + fmtBig(g.total_market_cap && g.total_market_cap.usd) + ' — BTC dominance: ' + (g.market_cap_percentage ? Number(g.market_cap_percentage.btc).toFixed(1) + '%' : '—') + '.');
    lines.push('• Tâm lý thị trường: ' + sentiment + '.');
    lines.push('• Gợi ý theo dõi hôm nay: kiểm tra watchlist, mức stop-loss của các vị thế đang mở và các task airdrop sắp tới deadline bên dưới.');
    $('briefing').textContent = lines.join('\n');
  }

  // ---------- watchlist ----------
  function getWatch() { var w = load(LS.watch, null); return Array.isArray(w) ? w : DEFAULT_WATCH.slice(); }
  function renderWatchlist() {
    var watch = getWatch();
    var rows = watch.map(function (id) {
      var c = state.byId[id];
      if (!c) return '<tr><td>' + esc(id) + '</td><td colspan="6" class="sub">Không có trong top 100 / chưa tải được</td><td><button class="danger" data-remove-watch="' + esc(id) + '">Xoá</button></td></tr>';
      return '<tr><td><strong>' + esc(c.name) + '</strong> <span class="sub">' + esc(c.symbol.toUpperCase()) + '</span></td>' +
        '<td>' + fmtUsd(c.current_price) + '</td>' +
        '<td class="' + pctClass(c.price_change_percentage_24h) + '">' + fmtPct(c.price_change_percentage_24h) + '</td>' +
        '<td class="' + pctClass(c.price_change_percentage_7d_in_currency) + '">' + fmtPct(c.price_change_percentage_7d_in_currency) + '</td>' +
        '<td>' + fmtBig(c.market_cap) + '</td><td>' + fmtBig(c.total_volume) + '</td>' +
        '<td>' + sparklineSvg(c.sparkline_in_7d && c.sparkline_in_7d.price) + '</td>' +
        '<td><button class="danger" data-remove-watch="' + esc(c.id) + '">Xoá</button></td></tr>';
    }).join('');
    $('watchlistBody').innerHTML = rows || '<tr><td colspan="8">Watchlist trống.</td></tr>';
    $('coinList').innerHTML = state.markets.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + ' (' + esc(c.symbol.toUpperCase()) + ')</option>'; }).join('');
  }

  // ---------- scanner ----------
  function miniRows(list, extra) {
    return list.map(function (c) {
      return '<tr><td><strong>' + esc(c.symbol.toUpperCase()) + '</strong> <span class="sub">' + esc(c.name) + '</span></td><td>' + fmtUsd(c.current_price) + '</td><td class="' + (extra ? '' : pctClass(c.price_change_percentage_24h)) + '">' + (extra ? extra(c) : fmtPct(c.price_change_percentage_24h)) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">Chưa có dữ liệu</td></tr>';
  }
  function renderScanner() {
    var withCh = state.markets.filter(function (c) { return c.price_change_percentage_24h != null; });
    var gainers = withCh.slice().sort(function (a, b) { return b.price_change_percentage_24h - a.price_change_percentage_24h; }).slice(0, 10);
    var losers = withCh.slice().sort(function (a, b) { return a.price_change_percentage_24h - b.price_change_percentage_24h; }).slice(0, 10);
    var spikes = state.markets.filter(function (c) { return c.market_cap > 0; }).slice()
      .sort(function (a, b) { return (b.total_volume / b.market_cap) - (a.total_volume / a.market_cap); }).slice(0, 10);
    $('gainersBody').innerHTML = miniRows(gainers);
    $('losersBody').innerHTML = miniRows(losers);
    $('spikeBody').innerHTML = miniRows(spikes, function (c) { return (c.total_volume / c.market_cap).toFixed(3); });
  }

  // ---------- portfolio ----------
  function getPf() { return load(LS.pf, []); }
  function renderPortfolio() {
    var pf = getPf(), totalVal = 0, totalCost = 0;
    var rows = pf.map(function (h, i) {
      var c = findCoin(h.coin), price = c ? c.current_price : null;
      var val = price != null ? price * h.amount : null, cost = h.buy * h.amount;
      if (val != null) totalVal += val;
      totalCost += cost;
      var pnl = val != null ? val - cost : null;
      return { h: h, i: i, price: price, val: val, cost: cost, pnl: pnl };
    });
    $('portfolioBody').innerHTML = rows.map(function (r) {
      var alloc = r.val != null && totalVal > 0 ? (r.val / totalVal * 100).toFixed(1) + '%' : '—';
      return '<tr><td><strong>' + esc(r.h.coin) + '</strong></td><td>' + r.h.amount + '</td><td>' + fmtUsd(r.h.buy) + '</td>' +
        '<td>' + (r.price != null ? fmtUsd(r.price) : 'N/A') + '</td><td>' + (r.val != null ? fmtUsd(r.val) : '—') + '</td>' +
        '<td class="' + pctClass(r.pnl) + '">' + (r.pnl != null ? fmtUsd(r.pnl) : '—') + '</td><td>' + alloc + '</td>' +
        '<td><button class="danger" data-remove-pf="' + r.i + '">Xoá</button></td></tr>';
    }).join('') || '<tr><td colspan="8">Chưa có khoản nắm giữ nào.</td></tr>';
    $('pfValue').textContent = fmtUsd(totalVal);
    $('pfCost').textContent = fmtUsd(totalCost);
    var tp = totalVal - totalCost;
    $('pfPnl').textContent = fmtUsd(tp) + (totalCost > 0 ? ' (' + fmtPct(tp / totalCost * 100) + ')' : '');
    $('pfPnl').className = 'value ' + pctClass(tp);
  }

  // ---------- journal ----------
  function tradePnl(t) { return t.side === 'long' ? (t.exit - t.entry) * t.size : (t.entry - t.exit) * t.size; }
  function getJournal() { return load(LS.journal, []); }
  function renderJournal() {
    var j = getJournal();
    $('journalBody').innerHTML = j.map(function (t, i) {
      var pnl = tradePnl(t);
      return '<tr><td>' + esc(t.date || '') + '</td><td><strong>' + esc(t.coin) + '</strong></td><td>' + (t.side === 'long' ? 'Long' : 'Short') + '</td>' +
        '<td>' + fmtUsd(t.entry) + '</td><td>' + fmtUsd(t.exit) + '</td><td>' + t.size + '</td>' +
        '<td class="' + pctClass(pnl) + '">' + fmtUsd(pnl) + '</td><td>' + esc(t.note || '') + '</td>' +
        '<td><button class="danger" data-remove-trade="' + i + '">Xoá</button></td></tr>';
    }).join('') || '<tr><td colspan="9">Chưa có lệnh nào.</td></tr>';
    if (!j.length) { $('jWinRate').textContent = '—'; $('jTotalPnl').textContent = '—'; $('jBest').textContent = '—'; $('jWorst').textContent = '—'; return; }
    var pnls = j.map(tradePnl), wins = pnls.filter(function (p) { return p > 0; }).length;
    var total = pnls.reduce(function (a, b) { return a + b; }, 0);
    var bi = pnls.indexOf(Math.max.apply(null, pnls)), wi = pnls.indexOf(Math.min.apply(null, pnls));
    $('jWinRate').textContent = (wins / j.length * 100).toFixed(1) + '% (' + wins + '/' + j.length + ')';
    $('jTotalPnl').textContent = fmtUsd(total); $('jTotalPnl').className = 'value ' + pctClass(total);
    $('jBest').textContent = j[bi].coin + ' ' + fmtUsd(pnls[bi]);
    $('jWorst').textContent = j[wi].coin + ' ' + fmtUsd(pnls[wi]);
  }

  // ---------- airdrop ----------
  var SEED_AIR = [
    { project: 'Dự án mẫu A (testnet)', task: 'Làm task testnet hằng tuần — sửa task này thành dự án thật của bạn', deadline: '', status: 'todo', note: 'Ví dụ mẫu, có thể sửa/xoá' },
    { project: 'Dự án mẫu B (Galxe/Zealy)', task: 'Hoàn thành nhiệm vụ social / quest', deadline: '', status: 'doing', note: 'Ví dụ mẫu, có thể sửa/xoá' },
    { project: 'Memecoin mẫu C', task: 'Theo dõi cộng đồng, kiểm tra contract trước khi mua', deadline: '', status: 'todo', note: 'Ví dụ mẫu — rủi ro memecoin rất cao' }
  ];
  function getAir() { var a = load(LS.air, null); if (!Array.isArray(a)) { save(LS.air, SEED_AIR); return SEED_AIR.slice(); } return a; }
  var STATUS_LABEL = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Xong' };
  function renderAirdrop() {
    var a = getAir();
    $('airdropBody').innerHTML = a.map(function (t, i) {
      return '<tr><td><strong>' + esc(t.project) + '</strong></td><td>' + esc(t.task) + '</td><td>' + esc(t.deadline || '—') + '</td>' +
        '<td><select data-air-status="' + i + '">' + Object.keys(STATUS_LABEL).map(function (k) { return '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + STATUS_LABEL[k] + '</option>'; }).join('') + '</select></td>' +
        '<td>' + esc(t.note || '') + '</td><td><button class="danger" data-remove-air="' + i + '">Xoá</button></td></tr>';
    }).join('') || '<tr><td colspan="6">Chưa có task nào.</td></tr>';
  }

  // ---------- risk calculators ----------
  function calcPosition(e) {
    e.preventDefault();
    var side = $('pSide').value, cap = parseFloat($('pCapital').value), riskPct = parseFloat($('pRisk').value);
    var entry = parseFloat($('pEntry').value), sl = parseFloat($('pSL').value), tp = parseFloat($('pTP').value), lev = parseFloat($('pLev').value) || 1;
    if (!(entry > 0) || !(sl > 0) || entry === sl) { $('posResult').textContent = 'Kiểm tra lại: entry và stop-loss phải > 0 và khác nhau.'; return; }
    var riskAmt = cap * riskPct / 100, dist = Math.abs(entry - sl);
    var qty = riskAmt / dist, posValue = qty * entry, margin = posValue / lev;
    var profit = isNaN(tp) ? null : qty * Math.abs(tp - entry);
    var rr = profit != null && riskAmt > 0 ? (profit / riskAmt) : null;
    var liq = lev > 1 ? (side === 'long' ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev)) : null;
    $('posResult').textContent =
      'Số tiền rủi ro tối đa: ' + fmtUsd(riskAmt) + '\n' +
      'Position size (giá trị vị thế): ' + fmtUsd(posValue) + '\n' +
      'Số lượng (quantity): ' + qty.toPrecision(6) + '\n' +
      'Margin cần thiết (đòn bẩy ' + lev + 'x): ' + fmtUsd(margin) + '\n' +
      'Lỗ tiềm năng nếu chạm SL: -' + fmtUsd(riskAmt).slice(0) + '\n' +
      (profit != null ? 'Lãi tiềm năng nếu chạm TP: ' + fmtUsd(profit) + '\nTỉ lệ R:R = 1 : ' + rr.toFixed(2) + '\n' : 'Chưa nhập take-profit nên chưa tính R:R.\n') +
      (liq != null ? 'Giá thanh lý ước tính (futures, isolated, chưa gồm phí/maintenance margin): ~' + fmtUsd(liq) : 'Spot / đòn bẩy 1x: không có giá thanh lý.');
  }
  function calcDca(e) {
    e.preventDefault();
    var amount = parseFloat($('dAmount').value), count = parseInt($('dCount').value, 10);
    var seriesTxt = $('dSeries').value.trim(), prices = [];
    if (seriesTxt) {
      prices = seriesTxt.split(',').map(function (s) { return parseFloat(s.trim()); }).filter(function (n) { return n > 0; });
      if (!prices.length) { $('dcaResult').textContent = 'Dãy giá không hợp lệ.'; return; }
    } else {
      var p = parseFloat($('dPrice').value);
      if (!(p > 0)) { var btc = state.byId['bitcoin']; p = btc ? btc.current_price : NaN; }
      if (!(p > 0)) { $('dcaResult').textContent = 'Chưa có giá để mô phỏng (nhập giá hiện tại hoặc đợi dữ liệu live).'; return; }
      for (var i = 0; i < count; i++) prices.push(p);
    }
    var invested = 0, qty = 0;
    prices.forEach(function (pr, i) { var spend = i < count ? amount : 0; if (spend > 0) { invested += spend; qty += spend / pr; } });
    var avg = qty > 0 ? invested / qty : 0, last = prices[prices.length - 1], curVal = qty * last;
    $('dcaResult').textContent =
      'Số lần mua thực tế: ' + Math.min(count, prices.length) + ' (dãy giá có ' + prices.length + ' mức)\n' +
      'Tổng vốn đã đầu tư: ' + fmtUsd(invested) + '\n' +
      'Tổng số lượng tích lũy: ' + qty.toPrecision(6) + '\n' +
      'Giá mua trung bình (average entry): ' + fmtUsd(avg) + '\n' +
      'Giá trị ở mức giá cuối (' + fmtUsd(last) + '): ' + fmtUsd(curVal) + ' (' + fmtPct((curVal - invested) / invested * 100) + ')';
  }

  // ---------- load / events ----------
  function renderAll(data) {
    state.markets = data.markets || [];
    state.byId = {}; state.markets.forEach(function (c) { state.byId[c.id] = c; });
    state.isFallback = !!data.isFallback;
    $('fallbackBanner').classList.toggle('hidden', !state.isFallback);
    $('statusLine').textContent = (data.fromCache ? 'Đang dùng dữ liệu đã cache (API tạm lỗi). ' : 'Đã tải dữ liệu. ') + 'Cập nhật lúc ' + new Date().toLocaleString('vi-VN') + (state.isFallback ? ' — dữ liệu mẫu (API không khả dụng).' : ' — nguồn: CoinGecko / Alternative.me.');
    renderDashboard(data); renderWatchlist(); renderScanner(); renderPortfolio(); renderJournal(); renderAirdrop();
  }
  function refresh() {
    $('statusLine').textContent = 'Đang tải dữ liệu thị trường…';
    window.CoinAPI.getMarketData().then(renderAll).catch(function (err) {
      $('statusLine').textContent = 'Lỗi tải dữ liệu: ' + err.message;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('refreshBtn').addEventListener('click', refresh);
    $('addCoinForm').addEventListener('submit', function (e) {
      e.preventDefault(); var c = findCoin($('coinSearch').value);
      if (!c) { alert('Không tìm thấy coin trong top 100. Thử nhập CoinGecko id, vd: solana, bitcoin, ethereum.'); return; }
      var w = getWatch(); if (w.indexOf(c.id) === -1) { w.push(c.id); save(LS.watch, w); }
      $('coinSearch').value = ''; renderWatchlist();
    });
    $('holdingForm').addEventListener('submit', function (e) {
      e.preventDefault(); var c = findCoin($('hCoin').value);
      var coin = c ? c.id : $('hCoin').value.trim(); if (!coin) return;
      var pf = getPf(); pf.push({ coin: coin, amount: parseFloat($('hAmount').value), buy: parseFloat($('hBuy').value) }); save(LS.pf, pf);
      e.target.reset(); renderPortfolio();
    });
    $('tradeForm').addEventListener('submit', function (e) {
      e.preventDefault(); var j = getJournal();
      j.push({ coin: $('tCoin').value.trim().toUpperCase(), side: $('tSide').value, entry: parseFloat($('tEntry').value), exit: parseFloat($('tExit').value), size: parseFloat($('tSize').value), date: $('tDate').value, note: $('tNote').value.trim() });
      save(LS.journal, j); e.target.reset(); renderJournal();
    });
    $('airForm').addEventListener('submit', function (e) {
      e.preventDefault(); var a = getAir();
      a.push({ project: $('aProject').value.trim(), task: $('aTask').value.trim(), deadline: $('aDeadline').value, status: $('aStatus').value, note: $('aNote').value.trim() });
      save(LS.air, a); e.target.reset(); renderAirdrop();
    });
    $('posForm').addEventListener('submit', calcPosition);
    $('dcaForm').addEventListener('submit', calcDca);

    document.body.addEventListener('click', function (e) {
      var rw = e.target.getAttribute && e.target.getAttribute('data-remove-watch');
      if (rw) { save(LS.watch, getWatch().filter(function (id) { return id !== rw; })); renderWatchlist(); return; }
      var rp = e.target.getAttribute && e.target.getAttribute('data-remove-pf');
      if (rp != null && rp !== undefined && e.target.hasAttribute('data-remove-pf')) { var pf = getPf(); pf.splice(Number(rp), 1); save(LS.pf, pf); renderPortfolio(); return; }
      if (e.target.hasAttribute && e.target.hasAttribute('data-remove-trade')) { var j = getJournal(); j.splice(Number(e.target.getAttribute('data-remove-trade')), 1); save(LS.journal, j); renderJournal(); return; }
      if (e.target.hasAttribute && e.target.hasAttribute('data-remove-air')) { var a = getAir(); a.splice(Number(e.target.getAttribute('data-remove-air')), 1); save(LS.air, a); renderAirdrop(); }
    });
    document.body.addEventListener('change', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-air-status')) {
        var a = getAir(), idx = Number(e.target.getAttribute('data-air-status'));
        if (a[idx]) { a[idx].status = e.target.value; save(LS.air, a); renderAirdrop(); }
      }
    });

    refresh();
  });
})();
