/* SolanaClock.com v1 — live prices from public, keyless exchange APIs. No placeholder data. */
(function () {
  'use strict';

  var REFRESH_MS = 20000;      // prices
  var SPARK_MS = 5 * 60000;    // sparkline candles
  var TIMEOUT_MS = 8000;

  // Binance market-data host first (api.binance.com returns HTTP 451 in some regions, e.g. the US).
  var BINANCE_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];
  var COINBASE = 'https://api.exchange.coinbase.com';
  var KRAKEN = 'https://api.kraken.com';

  var COINS = [
    { sym: 'BTC',  name: 'Bitcoin',   c1: '#ffa94d', c2: '#e8590c', glow: 'rgba(255,140,40,.6)',  icon: '₿' },
    { sym: 'ETH',  name: 'Ethereum',  c1: '#7aa2ff', c2: '#2948d6', glow: 'rgba(80,120,255,.6)',  icon: 'Ξ' },
    { sym: 'XRP',  name: 'XRP',       c1: '#5a6170', c2: '#2a2f39', glow: 'rgba(160,170,190,.35)', icon: 'X' },
    { sym: 'ADA',  name: 'Cardano',   c1: '#6fd2ff', c2: '#1b6fa8', glow: 'rgba(80,190,255,.5)',  icon: 'A' },
    { sym: 'DOGE', name: 'Dogecoin',  c1: '#f2f25a', c2: '#a8a815', glow: 'rgba(230,230,60,.55)', icon: 'Ð' },
    { sym: 'AVAX', name: 'Avalanche', c1: '#5ff5f0', c2: '#0f9d9a', glow: 'rgba(60,240,230,.55)', icon: 'A' }
  ];

  var state = {
    binance: {},          // sym -> {price, chg, vol} | undefined
    binanceOk: null,
    cbSol: null, cbOk: null,
    cbFallback: {},       // sym -> {...} when Binance lacks it
    krSol: null, krOk: null,
    spark: null, sparkSrc: null,
    updated: null
  };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function fetchJSON(url) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' }).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
      return r.json();
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmtPrice(p) {
    if (p == null) return '—';
    var d = p >= 1 ? 2 : (p >= 0.01 ? 4 : 6);
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtChg(c) { return c == null ? '—' : (c >= 0 ? '+' : '') + c.toFixed(2) + '%'; }
  function fmtVol(v) {
    if (v == null) return '—';
    var u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (var i = 0; i < u.length; i++) if (v >= u[i][0]) return '$' + (v / u[i][0]).toFixed(1) + u[i][1];
    return '$' + v.toFixed(0);
  }
  function setChg(el, c) {
    el.textContent = c == null ? 'Unavailable' : fmtChg(c) + (c >= 0 ? ' ▲' : ' ▼');
    el.className = el.className.replace(/\b(up|down|unavail)\b/g, '').trim() + ' ' + (c == null ? 'unavail' : c >= 0 ? 'up' : 'down');
  }

  // ---------- fetchers ----------
  function fetchBinance() {
    var syms = ['SOL'].concat(COINS.map(function (c) { return c.sym; }));
    var q = encodeURIComponent(JSON.stringify(syms.map(function (s) { return s + 'USDT'; })));
    function tryHost(i) {
      if (i >= BINANCE_HOSTS.length) return Promise.reject(new Error('Binance unavailable'));
      return fetchJSON(BINANCE_HOSTS[i] + '/api/v3/ticker/24hr?symbols=' + q).catch(function () { return tryHost(i + 1); });
    }
    return tryHost(0).then(function (arr) {
      var out = {};
      arr.forEach(function (t) {
        var s = t.symbol.replace(/USDT$/, '');
        var price = num(t.lastPrice);
        if (price == null || price <= 0) return;
        out[s] = { price: price, chg: num(t.priceChangePercent), vol: num(t.quoteVolume), src: 'Binance' };
      });
      state.binance = out; state.binanceOk = true;
    }).catch(function (e) { console.warn(e.message); state.binance = {}; state.binanceOk = false; });
  }

  function cbStats(sym) {
    return fetchJSON(COINBASE + '/products/' + sym + '-USD/stats').then(function (s) {
      var last = num(s.last), open = num(s.open), vol = num(s.volume);
      if (last == null || last <= 0) throw new Error('Coinbase ' + sym + ' bad data');
      return { price: last, chg: open ? (last - open) / open * 100 : null, vol: vol != null ? vol * last : null, src: 'Coinbase' };
    });
  }
  function fetchCoinbaseSol() {
    return cbStats('SOL').then(function (d) { state.cbSol = d; state.cbOk = true; })
      .catch(function (e) { console.warn(e.message); state.cbSol = null; state.cbOk = false; });
  }
  function fetchCoinbaseFallbacks() {
    var missing = COINS.filter(function (c) { return !state.binance[c.sym]; });
    state.cbFallback = {};
    return Promise.all(missing.map(function (c) {
      return cbStats(c.sym).then(function (d) { state.cbFallback[c.sym] = d; }).catch(function () {});
    }));
  }

  function fetchKrakenSol() {
    var since = Math.floor(Date.now() / 1000) - 26 * 3600;
    var ticker = fetchJSON(KRAKEN + '/0/public/Ticker?pair=SOLUSD');
    var ohlc = fetchJSON(KRAKEN + '/0/public/OHLC?pair=SOLUSD&interval=60&since=' + since);
    return Promise.all([ticker, ohlc.catch(function () { return null; })]).then(function (r) {
      var t = r[0];
      if (t.error && t.error.length) throw new Error('Kraken ' + t.error.join(','));
      var k = t.result[Object.keys(t.result)[0]];
      var last = num(k.c[0]);
      if (last == null || last <= 0) throw new Error('Kraken bad data');
      // Rolling 24h change: open of the hourly candle that started 24h before the current one.
      var chg = null, candles = null;
      if (r[1] && r[1].result) {
        var key = Object.keys(r[1].result).filter(function (x) { return x !== 'last'; })[0];
        candles = r[1].result[key];
        var target = Math.floor(Date.now() / 3600000) * 3600 - 24 * 3600;
        for (var i = 0; i < candles.length; i++) {
          if (candles[i][0] === target) { var o = num(candles[i][1]); if (o) chg = (last - o) / o * 100; break; }
        }
      }
      state.krSol = { price: last, chg: chg, vol: num(k.v[1]) * num(k.p[1]), src: 'Kraken', candles: candles };
      state.krOk = true;
    }).catch(function (e) { console.warn(e.message); state.krSol = null; state.krOk = false; });
  }

  function fetchSpark() {
    function binanceK(i) {
      if (i >= BINANCE_HOSTS.length) return Promise.reject(new Error('no binance klines'));
      return fetchJSON(BINANCE_HOSTS[i] + '/api/v3/klines?symbol=SOLUSDT&interval=1h&limit=24')
        .catch(function () { return binanceK(i + 1); });
    }
    return binanceK(0).then(function (k) {
      state.spark = k.map(function (c) { return num(c[4]); }); state.sparkSrc = 'Binance';
    }).catch(function () {
      return fetchJSON(COINBASE + '/products/SOL-USD/candles?granularity=3600').then(function (k) {
        state.spark = k.slice(0, 24).reverse().map(function (c) { return num(c[4]); }); state.sparkSrc = 'Coinbase';
      });
    }).catch(function () {
      var c = state.krSol && state.krSol.candles;
      if (c && c.length) { state.spark = c.slice(-24).map(function (x) { return num(x[4]); }); state.sparkSrc = 'Kraken'; }
      else { state.spark = null; state.sparkSrc = null; }
    }).then(renderSpark);
  }

  // ---------- derived ----------
  function solSources() { return [state.binance.SOL, state.cbSol, state.krSol].filter(Boolean); }
  function solBlend() {
    var s = solSources();
    if (!s.length) return null;
    var p = s.reduce(function (a, x) { return a + x.price; }, 0) / s.length;
    var cs = s.filter(function (x) { return x.chg != null; });
    var c = cs.length ? cs.reduce(function (a, x) { return a + x.chg; }, 0) / cs.length : null;
    return { price: p, chg: c, n: s.length, list: s };
  }
  function coinData(sym) { return state.binance[sym] || state.cbFallback[sym] || null; }

  // ---------- render ----------
  function render() {
    var b = solBlend();
    var tip = b ? b.list.map(function (x) { return x.src + ': ' + fmtPrice(x.price); }).join(' · ') : 'All sources unavailable';
    [['clock-price', 'clock-change'], ['orbit-price', 'orbit-change']].forEach(function (ids) {
      var pe = $(ids[0]);
      pe.textContent = b ? fmtPrice(b.price) : 'Unavailable';
      pe.parentNode.title = tip;
      pe.parentNode.classList.toggle('unavail', !b);
      setChg($(ids[1]), b ? b.chg : null);
    });
    document.title = (b ? fmtPrice(b.price) + ' SOL · ' : '') + 'SolanaClock.com';

    // sources footer
    var ok = { binance: state.binanceOk && !!state.binance.SOL, coinbase: state.cbOk, kraken: state.krOk };
    document.querySelectorAll('#sources span').forEach(function (s) {
      var on = ok[s.dataset.src];
      s.classList.toggle('off', on === false);
      s.title = on === false ? 'Unavailable' : '';
    });
    $('updated').textContent = state.updated
      ? 'Updated ' + state.updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) +
        (b && b.n > 1 ? ' · SOL = average of ' + b.n + ' exchanges' : '')
      : '';

    renderTable();
    renderOrbitCoins();
  }

  function icon(sym, c) {
    if (sym === 'SOL') return '<span class="ic" style="background:linear-gradient(135deg,#ffb347,#c84bff 55%,#5b6cff)"><svg viewBox="0 0 100 100"><use href="#sol-mark"/></svg></span>';
    return '<span class="ic" style="background:radial-gradient(circle at 40% 35%,' + c.c1 + ',' + c.c2 + ')">' + c.icon + '</span>';
  }
  function row(sym, name, d, exch, cls, c) {
    var chgCls = d && d.chg != null ? (d.chg >= 0 ? 'up' : 'down') : 'unavail';
    return '<tr class="' + cls + '"><td><div class="asset">' + icon(sym, c) + '<div>' + sym + '<small>' + name + '</small></div></div></td>' +
      '<td class="num price' + (d ? '' : ' unavail') + '">' + (d ? fmtPrice(d.price) : 'Unavailable') + '</td>' +
      '<td class="num ' + chgCls + '">' + (d && d.chg != null ? fmtChg(d.chg) + (d.chg >= 0 ? ' ↑' : ' ↓') : '—') + '</td>' +
      '<td class="num hide-xs">' + (d ? fmtVol(d.vol) : '—') + '</td>' +
      '<td class="exch">' + exch + '</td></tr>';
  }
  function renderTable() {
    var h = '';
    h += row('SOL', 'Solana', state.binance.SOL, 'Binance <small>(USDT)</small>', 'sol');
    h += row('SOL', 'Solana', state.cbSol, 'Coinbase', 'sol');
    h += row('SOL', 'Solana', state.krSol, 'Kraken', 'sol');
    COINS.forEach(function (c) {
      var d = coinData(c.sym);
      var ex = d ? (d.src === 'Binance' ? 'Binance <small>(USDT)</small>' : d.src) : '—';
      h += row(c.sym, c.name, d, ex, '', c);
    });
    $('mkt-body').innerHTML = h;
  }

  function renderSpark() {
    var svg = $('spark'), note = $('spark-note');
    var pts = (state.spark || []).filter(function (v) { return v != null; });
    if (pts.length < 2) { svg.innerHTML = ''; note.textContent = 'Chart unavailable'; return; }
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), rng = max - min || 1;
    var d = pts.map(function (v, i) {
      return (i ? 'L' : 'M') + (i / (pts.length - 1) * 300).toFixed(1) + ' ' + (36 - (v - min) / rng * 32).toFixed(1);
    }).join(' ');
    svg.innerHTML = '<path class="area" d="' + d + ' L300 40 L0 40 Z"/><path d="' + d + '"/>';
    note.textContent = '24h · ' + state.sparkSrc;
  }

  // ---------- orbit ----------
  var orbitEls = [], angle0 = 0, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function buildOrbit() {
    var ring = $('orbit-ring'), lines = $('orbit-lines');
    COINS.forEach(function (c) {
      var el = document.createElement('div');
      el.className = 'coin';
      el.style.setProperty('--c1', c.c1); el.style.setProperty('--c2', c.c2); el.style.setProperty('--glow', c.glow);
      el.innerHTML = '<b>' + c.sym + '</b><span class="cp">—</span><span class="cc">—</span>';
      ring.appendChild(el);
      var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', 50); ln.setAttribute('y1', 50);
      lines.appendChild(ln);
      orbitEls.push({ el: el, ln: ln, coin: c });
    });
    placeOrbit();
    if (!reduce) requestAnimationFrame(tick);
  }
  function placeOrbit() {
    var n = orbitEls.length;
    orbitEls.forEach(function (o, i) {
      var a = angle0 + i / n * Math.PI * 2 - Math.PI / 2;
      var r = i % 2 ? 37 : 41;
      var x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r;
      o.el.style.left = x + '%'; o.el.style.top = y + '%';
      o.ln.setAttribute('x2', x.toFixed(2)); o.ln.setAttribute('y2', y.toFixed(2));
    });
  }
  var last = 0;
  function tick(t) {
    if (last && $('view-orbit').classList.contains('active')) { angle0 += (t - last) * 0.00004; placeOrbit(); }
    last = t; requestAnimationFrame(tick);
  }
  function renderOrbitCoins() {
    orbitEls.forEach(function (o) {
      var d = coinData(o.coin.sym);
      o.el.querySelector('.cp').textContent = d ? fmtPrice(d.price) : 'Unavailable';
      var cc = o.el.querySelector('.cc');
      cc.textContent = d ? fmtChg(d.chg) : '';
      o.el.title = o.coin.name + (d ? ' · ' + d.src : ' · unavailable');
    });
  }

  // ---------- tabs ----------
  function initTabs() {
    var btns = document.querySelectorAll('.tabs button');
    function show(v) {
      btns.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'); });
      document.querySelectorAll('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + v); });
      if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });
    function fromHash() { var h = location.hash.slice(1); if (h === 'orbit' || h === 'table' || h === 'clock') show(h); }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  // ---------- loop ----------
  var busy = false;
  function refresh() {
    if (busy) return; busy = true;
    Promise.all([fetchBinance(), fetchCoinbaseSol(), fetchKrakenSol()])
      .then(fetchCoinbaseFallbacks)
      .then(function () { state.updated = new Date(); render(); window.__scReady = true; })
      .catch(function (e) { console.error(e); })
      .then(function () { busy = false; });
  }

  initTabs();
  buildOrbit();
  render();
  refresh();
  fetchSpark();
  setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
  setInterval(function () { if (!document.hidden) fetchSpark(); }, SPARK_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.__sc = state;
})();
