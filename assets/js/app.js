/* =========================================================
   数学分析刷题 · 应用逻辑
   ========================================================= */
(function () {
  'use strict';

  var DATA = window.MAQ_DATA || { meta: { chapters: [], total: 0 }, questions: [] };
  var QS = DATA.questions || [];
  var QMAP = {};
  QS.forEach(function (q) { QMAP[q.id] = q; });
  var META = DATA.meta || { chapters: [], total: QS.length };
  var CHMAP = {};
  (META.chapters || []).forEach(function (c) { CHMAP[c.n] = c; });
  var CLUSTERS = META.clusters || [];
  var CMAP = {};
  CLUSTERS.forEach(function (c) { CMAP[c.id] = c; });
  var REFS = META.refs || {};
  var KNOWLEDGE = window.MAQ_KNOWLEDGE || { chapters: [] };
  var TYPES = ['证明', '计算', '讨论', '辨析', '作图', '解答'];
  var DAY = 86400000;
  var REVIEW_DAYS = [1, 2, 4, 7, 15, 30, 60];
  var VOCAB = (function () {
    var counts = {};
    QS.forEach(function (q) {
      var list = q.knowledge || q.tags || [];
      list.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); })
      .filter(function (k) { return k !== '综合题'; })
      .map(function (k) { return { k: k, n: counts[k] }; });
  })();

  var LS_KEY = 'maq.state.v1';
  var SESSION_KEY = 'maq.active.v1';
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  /* ---------------- utils ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function fmtDuration(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(ss);
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function todayKey() { return dayKey(Date.now()); }
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2100);
  }
  function latexToText(src) {
    var s = String(src || '');
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    s = s.replace(/\\dfrac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '[$1]√($2)');
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
    s = s.replace(/\\(?:text|mathrm|mathbf|mathbb|mathcal)\s*\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\lim\s*_\{([^{}]*)\}/g, 'lim($1)');
    s = s.replace(/\\lim/g, 'lim');
    var sym = {
      '\\neq': '≠', '\\ne': '≠', '\\leqslant': '≤', '\\leq': '≤', '\\le': '≤',
      '\\geqslant': '≥', '\\geq': '≥', '\\ge': '≥', '\\to': '→', '\\rightarrow': '→',
      '\\infty': '∞', '\\cdot': '·', '\\times': '×', '\\div': '÷', '\\pm': '±',
      '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆', '\\cup': '∪', '\\cap': '∩',
      '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫', '\\partial': '∂',
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\Delta': 'Δ',
      '\\varepsilon': 'ε', '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
      '\\lambda': 'λ', '\\mu': 'μ', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ',
      '\\tau': 'τ', '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      '\\Omega': 'Ω', '\\Gamma': 'Γ', '\\Lambda': 'Λ', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ',
      '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\cot': 'cot', '\\sec': 'sec', '\\csc': 'csc',
      '\\arcsin': 'arcsin', '\\arccos': 'arccos', '\\arctan': 'arctan',
      '\\lg': 'lg', '\\ln': 'ln', '\\log': 'log', '\\exp': 'exp',
      '\\max': 'max', '\\min': 'min', '\\sup': 'sup', '\\inf': 'inf',
      '\\left': '', '\\right': '', '\\,': ' ', '\\;': ' ', '\\!': '', '\\quad': ' ', '\\qquad': ' ',
      '\\cdots': '…', '\\dots': '…', '\\ldots': '…', '\\circ': '°', '\\prime': '′'
    };
    Object.keys(sym).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) { s = s.split(k).join(sym[k]); });
    s = s.replace(/\\[a-zA-Z]+/g, '');
    s = s.replace(/[{}]/g, '');
    s = s.replace(/\s+/g, ' ');
    return s.trim();
  }
  function plainPreview(body) {
    return String(body || '')
      .replace(/\[\[FIG1_4\]\]/g, '［图 1-4］')
      .replace(/\$\$([\s\S]*?)\$\$/g, function (m, s) { return ' ' + latexToText(s) + ' '; })
      .replace(/\$([^$]*)\$/g, function (m, s) { return ' ' + latexToText(s) + ' '; })
      .replace(/\s+/g, ' ').trim();
  }
  function snippet(body, n) {
    var t = plainPreview(body);
    return t.length > (n || 90) ? t.slice(0, n || 90) + '…' : t;
  }
  function hashQuery() {
    var h = location.hash.replace(/^#/, '') || '/home';
    var parts = h.split('?');
    var query = {};
    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      query[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join('=') || '');
    });
    return { path: parts[0], query: query };
  }
  function parseRoute() {
    var hq = hashQuery();
    var seg = hq.path.split('/').filter(Boolean);
    return { name: seg[0] || 'home', param: seg[1] || '', query: hq.query };
  }
  function navigate(hash) {
    if (location.hash === hash) { render(); }
    else { location.hash = hash; }
  }

  /* ---------------- state ---------------- */
  var DEFAULT_SETTINGS = { theme: 'auto', font: 'md', autoReveal: true, confirmSubmit: true };
  function defaults() {
    return { v: 1, createdAt: Date.now(), updatedAt: Date.now(), progress: {}, sessions: [], reviews: {}, checkins: {}, settings: Object.assign({}, DEFAULT_SETTINGS) };
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaults();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return defaults();
      s.progress = s.progress || {};
      s.sessions = Array.isArray(s.sessions) ? s.sessions : [];
      s.reviews = s.reviews || {};
      s.checkins = s.checkins || {};
      s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
      s.updatedAt = s.updatedAt || s.createdAt || Date.now();
      // 老版本记录迁移：练过的题直接进入“待首次复习”
      Object.keys(s.progress).forEach(function (id) {
        var p = s.progress[id];
        if (QMAP[id] && p && p.attempts && !s.reviews[id]) {
          s.reviews[id] = { stage: 0, nextAt: Date.now(), lastAt: p.lastAt || Date.now(), history: [] };
        }
      });
      // 老练习记录补成打卡记录
      s.sessions.forEach(function (rec) {
        if (!rec.at) return;
        var k = dayKey(rec.at);
        if (!s.checkins[k]) s.checkins[k] = { at: rec.at, count: (rec.correct || 0) + (rec.wrong || 0) };
      });
      return s;
    } catch (e) { return defaults(); }
  }
  var state = loadState();

  var CLOUD_CFG_KEY = 'maq.supabase.config';
  var CLOUD_META_KEY = 'maq.cloud.v1';
  var CLOUD_CFG = readCloudConfig();
  var CLOUD = loadCloudMeta();
  var CLOUD_SB = null;
  var CLOUD_USER = null;
  var CLOUD_CHANNEL = null;
  var CLOUD_APPLYING = false;
  var CLOUD_SYNCING = false;
  var CLOUD_PUSH_TIMER = null;
  var CLOUD_ACCOUNT_ROUTE = false;

  function readCloudConfig() {
    try {
      var raw = localStorage.getItem(CLOUD_CFG_KEY);
      if (raw) {
        var x = JSON.parse(raw);
        if (x && x.url && x.anonKey) return { url: String(x.url), anonKey: String(x.anonKey) };
      }
    } catch (e) { /* ignore */ }
    var y = window.MAQ_SUPABASE || {};
    return { url: y.url || '', anonKey: y.anonKey || '' };
  }
  function loadCloudMeta() {
    try {
      var raw = localStorage.getItem(CLOUD_META_KEY);
      var m = raw ? JSON.parse(raw) : {};
      return Object.assign({ lastSyncAt: 0, lastRemoteAt: 0, pending: false, ownerId: null, deletions: [] }, m || {});
    } catch (e) {
      return { lastSyncAt: 0, lastRemoteAt: 0, pending: false, ownerId: null, deletions: [] };
    }
  }
  function saveCloudMeta() {
    try { localStorage.setItem(CLOUD_META_KEY, JSON.stringify(CLOUD)); } catch (e) { /* ignore */ }
  }
  function saveState(opts) {
    opts = opts || {};
    if (opts.touch !== false) state.updatedAt = Date.now();
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { toast('本地存储空间不足，记录可能未保存'); }
    if (opts.cloud !== false) scheduleCloudPush();
  }
  function getP(id) { return state.progress[id] || {}; }
  function ensureP(id) {
    if (!state.progress[id]) state.progress[id] = { attempts: 0, correct: 0, wrong: 0, favorite: false, inWrongBook: false, note: '' };
    var p = state.progress[id];
    if (typeof p.attempts !== 'number') p.attempts = 0;
    if (typeof p.correct !== 'number') p.correct = 0;
    if (typeof p.wrong !== 'number') p.wrong = 0;
    if (typeof p.note !== 'string') p.note = '';
    if (typeof p.flagged !== 'boolean') p.flagged = false;
    return p;
  }

  /* ---------------- Ebbinghaus review ---------------- */
  function getReview(id) { return state.reviews[id] || null; }
  function dueReviewIds() {
    var now = Date.now();
    return Object.keys(state.reviews).filter(function (id) {
      var r = state.reviews[id];
      return QMAP[id] && r && r.nextAt && r.nextAt <= now && (r.stage || 0) < 7;
    }).sort(function (a, b) { return state.reviews[a].nextAt - state.reviews[b].nextAt; });
  }
  function reviewDueCount() { return dueReviewIds().length; }
  function reviewStageText(r) {
    if (!r) return '未开始';
    var stage = r.stage || 0;
    if (stage >= 7) return '已巩固 7/7';
    if (stage === 0) return '待首次复习';
    return '复习 ' + stage + '/7';
  }
  function nextReviewText(r) {
    if (!r) return '—';
    if ((r.stage || 0) >= 7) return '已完成 7 次';
    if (!r.nextAt) return '—';
    var diff = r.nextAt - Date.now();
    if (diff <= 0) return '已到期';
    var days = Math.ceil(diff / DAY);
    return days <= 1 ? '明天' : days + ' 天后';
  }
  function updateReview(qid, result) {
    var now = Date.now();
    var r = state.reviews[qid];
    if (!r) { r = { stage: 0, nextAt: 0, lastAt: 0, history: [] }; state.reviews[qid] = r; }
    if (!r.history) r.history = [];
    var due = r.nextAt && r.nextAt <= now;
    if (!r.lastAt) {
      r.stage = 0;
      r.lastAt = now;
      r.nextAt = now + REVIEW_DAYS[0] * DAY;
    } else if (result === 'correct') {
      if (due && (r.stage || 0) < 7) {
        r.stage = (r.stage || 0) + 1;
        r.nextAt = r.stage >= 7 ? 0 : now + REVIEW_DAYS[r.stage] * DAY;
      }
      r.lastAt = now;
    } else {
      r.stage = 0;
      r.lastAt = now;
      r.nextAt = now + DAY;
    }
    r.history.push({ at: now, result: result, stage: r.stage });
    if (r.history.length > 40) r.history.shift();
  }
  function markCheckin() {
    var k = todayKey();
    var c = state.checkins[k] || { at: Date.now(), count: 0 };
    c.at = Date.now();
    c.count = (c.count || 0) + 1;
    state.checkins[k] = c;
  }
  function checkinStreak() {
    var d = new Date();
    if (!state.checkins[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    var n = 0;
    while (state.checkins[dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------------- local trace images (IndexedDB) ---------------- */
  var MEDIA_DB = null;
  var TRACE_URLS = [];
  function openMediaDB() {
    if (MEDIA_DB) return MEDIA_DB;
    MEDIA_DB = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB 不可用')); return; }
      var req = indexedDB.open('maq-media', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('traces')) {
          var store = db.createObjectStore('traces', { keyPath: 'id', autoIncrement: true });
          store.createIndex('qid', 'qid', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB 打开失败')); };
    });
    return MEDIA_DB;
  }
  function addTrace(qid, blob, name) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('traces', 'readwrite');
        var store = tx.objectStore('traces');
        var req = store.add({ qid: qid, blob: blob, name: name || 'trace.jpg', createdAt: Date.now(), cloudId: null, cloudPath: null, synced: false });
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error('保存失败')); };
      });
    });
  }
  function listTraces(qid) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('traces', 'readonly');
        var store = tx.objectStore('traces');
        var idx = store.index('qid');
        var req = idx.getAll(qid);
        req.onsuccess = function () {
          var arr = req.result || [];
          arr.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
          resolve(arr);
        };
        req.onerror = function () { reject(req.error || new Error('读取失败')); };
      });
    });
  }
  function deleteTrace(id) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('traces', 'readwrite');
        var req = tx.objectStore('traces').delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error || new Error('删除失败')); };
      });
    });
  }
  function getTrace(id) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction('traces', 'readonly').objectStore('traces').get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error('读取失败')); };
      });
    });
  }
  function updateTrace(id, patch) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('traces', 'readwrite');
        var store = tx.objectStore('traces');
        var get = store.get(id);
        get.onsuccess = function () {
          var rec = get.result;
          if (!rec) { resolve(null); return; }
          Object.assign(rec, patch || {});
          var put = store.put(rec);
          put.onsuccess = function () { resolve(rec); };
          put.onerror = function () { reject(put.error || new Error('更新失败')); };
        };
        get.onerror = function () { reject(get.error || new Error('读取失败')); };
      });
    });
  }
  function listAllTraces() {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction('traces', 'readonly').objectStore('traces').getAll();
        req.onsuccess = function () {
          var arr = req.result || [];
          arr.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
          resolve(arr);
        };
        req.onerror = function () { reject(req.error || new Error('读取失败')); };
      });
    });
  }
  function clearTraces() {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('traces', 'readwrite');
        var req = tx.objectStore('traces').clear();
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error || new Error('清空失败')); };
      });
    });
  }
  function getTracesFor(qids) {
    return Promise.all(qids.map(function (qid) {
      return listTraces(qid).then(function (items) { return [qid, items]; }).catch(function () { return [qid, []]; });
    })).then(function (entries) {
      var map = {};
      entries.forEach(function (x) { map[x[0]] = x[1]; });
      return map;
    });
  }
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('不是图片')); return; }
      if (file.size > 20 * 1024 * 1024) { reject(new Error('图片超过 20MB')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1600;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            resolve(blob || file);
          }, 'image/jpeg', 0.82);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error('读取图片失败')); };
      r.readAsDataURL(blob);
    });
  }
  function fetchDataURL(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('fetch failed');
      return r.blob();
    }).then(blobToDataURL).catch(function () { return ''; });
  }
  function openLightbox(src) {
    var old = document.getElementById('lightbox');
    if (old) old.remove();
    var dlg = document.createElement('dialog');
    dlg.id = 'lightbox';
    dlg.className = 'lightbox';
    dlg.innerHTML = '<button class="icon-btn lightbox-close" data-close aria-label="关闭">✕</button><img src="' + src + '" alt="作答痕迹">';
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); });
  }
  function loadTraceGallery(el) {
    var qid = el.dataset.traceGallery;
    listTraces(qid).then(function (items) {
      if (el._urls) el._urls.forEach(function (u) { URL.revokeObjectURL(u); });
      el._urls = [];
      el.innerHTML = '';
      if (!items.length) {
        el.innerHTML = '<span class="tiny faint">还没有上传；可以拍答题纸、草稿纸或错题订正。</span>';
        return;
      }
      items.forEach(function (item) {
        var url = URL.createObjectURL(item.blob);
        el._urls.push(url);
        TRACE_URLS.push(url);
        var fig = document.createElement('figure');
        fig.className = 'trace-item';
        var img = document.createElement('img');
        img.src = url;
        img.loading = 'lazy';
        img.alt = item.name || '作答痕迹';
        img.dataset.action = 'view-trace';
        img.dataset.src = url;
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'trace-del';
        del.dataset.action = 'del-trace';
        del.dataset.id = item.id;
        del.title = '删除这张图片';
        del.textContent = '×';
        fig.appendChild(img);
        fig.appendChild(del);
        el.appendChild(fig);
      });
    }).catch(function () {
      el.innerHTML = '<span class="tiny faint">图片存储不可用（浏览器不支持 IndexedDB）</span>';
    });
  }
  function refreshTraceGalleries(root) {
    TRACE_URLS.forEach(function (u) { URL.revokeObjectURL(u); });
    TRACE_URLS = [];
    $$('[data-trace-gallery]', root || document).forEach(loadTraceGallery);
  }
  function handleTraceFiles(input) {
    var qid = input.dataset.qid;
    var files = Array.prototype.slice.call(input.files || []).slice(0, 12);
    if (!files.length) return;
    toast('正在保存图片…');
    Promise.all(files.map(function (f) {
      return compressImage(f).then(function (blob) { return addTrace(qid, blob, f.name); });
    })).then(function (res) {
      input.value = '';
      var gallery = document.querySelector('[data-trace-gallery="' + qid + '"]');
      if (gallery) loadTraceGallery(gallery);
      toast('已保存 ' + res.length + ' 张作答图片');
      if (CLOUD_USER && navigator.onLine) cloudSyncAll();
    }).catch(function (e) {
      input.value = '';
      toast(e.message || '图片保存失败');
    });
  }

  /* ---------------- Supabase cloud sync ---------------- */
  function cloudConfigured() {
    return !!(CLOUD_CFG && CLOUD_CFG.url && CLOUD_CFG.anonKey);
  }
  function cloudBaseUrl() {
    return location.origin + location.pathname;
  }
  function cloudErrorText(e) {
    if (!e) return '未知错误';
    var m = e.message || e.error_description || String(e);
    if (/Invalid login credentials/i.test(m)) return '邮箱或密码不正确';
    if (/Email not confirmed/i.test(m)) return '邮箱还没确认，请先点邮件里的确认链接';
    if (/User already registered/i.test(m)) return '这个邮箱已经注册过了，直接登录即可';
    if (/Password should be at least/i.test(m)) return '密码至少 6 位';
    if (/rate limit/i.test(m)) return '操作太频繁，稍等一会儿再试';
    return m;
  }
  function initCloud() {
    updateAccountTop();
    if (!cloudConfigured()) return;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase SDK 未加载');
      return;
    }
    try {
      CLOUD_SB = window.supabase.createClient(CLOUD_CFG.url, CLOUD_CFG.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (e) {
      console.error('Supabase 初始化失败', e);
      return;
    }
    CLOUD_SB.auth.getSession().then(function (res) {
      setCloudUser(res.data && res.data.session ? res.data.session.user : null);
    }).catch(function (e) { console.warn('读取登录状态失败', e); });
    CLOUD_SB.auth.onAuthStateChange(function (event, session) {
      // 避免在 Supabase 回调里直接再调 Supabase（会死锁）
      setTimeout(function () { setCloudUser(session && session.user ? session.user : null, event); }, 0);
    });
    window.addEventListener('online', function () {
      if (!CLOUD_USER) return;
      toast('网络已恢复，正在同步云端…');
      startCloudRealtime();
      cloudSyncAll();
    });
    window.addEventListener('offline', function () { updateAccountTop(); });
  }
  function setCloudUser(user, event) {
    var prev = CLOUD_USER;
    if (user && prev && user.id === prev.id) { updateAccountTop(); return; }
    CLOUD_USER = user || null;
    if (!CLOUD_USER) {
      stopCloudRealtime();
      updateAccountTop();
      if (CLOUD_ACCOUNT_ROUTE || parseRoute().name === 'settings') render();
      return;
    }
    if (CLOUD.ownerId && CLOUD.ownerId !== CLOUD_USER.id) {
      toast('这个浏览器已绑定另一个云账号；请先导出并清空本地记录，再登录新账号');
      setTimeout(function () { CLOUD_SB.auth.signOut(); }, 50);
      return;
    }
    CLOUD.ownerId = CLOUD_USER.id;
    saveCloudMeta();
    updateAccountTop();
    startCloudRealtime();
    cloudSyncAll({ initial: true });
    if (CLOUD_ACCOUNT_ROUTE || parseRoute().name === 'settings') render();
  }
  function updateAccountTop() {
    var a = document.getElementById('accountTop');
    if (!a) return;
    if (CLOUD_USER) {
      var email = CLOUD_USER.email || '已登录';
      a.textContent = email.length > 16 ? email.slice(0, 14) + '…' : email;
      a.title = '账号与云同步：' + email;
      a.classList.add('on');
      if (CLOUD.pending) a.textContent = '待同步';
    } else {
      a.textContent = cloudConfigured() ? '登录' : '云同步';
      a.title = cloudConfigured() ? '登录以同步进度' : '配置 Supabase 云同步';
      a.classList.remove('on');
    }
  }
  function stopCloudRealtime() {
    if (CLOUD_CHANNEL && CLOUD_SB) {
      try { CLOUD_SB.removeChannel(CLOUD_CHANNEL); } catch (e) { /* ignore */ }
    }
    CLOUD_CHANNEL = null;
  }
  function startCloudRealtime() {
    stopCloudRealtime();
    if (!CLOUD_SB || !CLOUD_USER) return;
    var uid = CLOUD_USER.id;
    CLOUD_CHANNEL = CLOUD_SB.channel('maq-cloud-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: 'user_id=eq.' + uid }, function (payload) {
        if (payload && payload.new) handleRemoteState(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traces', filter: 'user_id=eq.' + uid }, function (payload) {
        if (payload && payload.new) downloadCloudTraceRow(payload.new);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'traces', filter: 'user_id=eq.' + uid }, function (payload) {
        if (payload && payload.old && payload.old.id) removeLocalTraceByCloudId(payload.old.id);
      })
      .subscribe(function (status) {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('云同步实时连接异常：', status);
      });
  }

  /* ---------------- merge / push / pull ---------------- */
  function normalizeCloudState(obj) {
    var s = Object.assign(defaults(), obj || {});
    s.progress = s.progress && typeof s.progress === 'object' ? s.progress : {};
    s.sessions = Array.isArray(s.sessions) ? s.sessions : [];
    s.reviews = s.reviews && typeof s.reviews === 'object' ? s.reviews : {};
    s.checkins = s.checkins && typeof s.checkins === 'object' ? s.checkins : {};
    s.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings || {});
    s.updatedAt = s.updatedAt || s.createdAt || 0;
    return s;
  }
  function mergeStates(local, remote) {
    remote = normalizeCloudState(remote);
    Object.keys(remote.progress).forEach(function (id) {
      var a = local.progress[id], b = remote.progress[id];
      if (!a) { local.progress[id] = b; return; }
      if (!b) return;
      if ((b.updatedAt || 0) > (a.updatedAt || 0)) local.progress[id] = b;
      else if ((b.updatedAt || 0) === (a.updatedAt || 0)) {
        a.attempts = Math.max(a.attempts || 0, b.attempts || 0);
        a.correct = Math.max(a.correct || 0, b.correct || 0);
        a.wrong = Math.max(a.wrong || 0, b.wrong || 0);
        a.favorite = !!(a.favorite || b.favorite);
        a.flagged = !!(a.flagged || b.flagged);
        a.inWrongBook = !!(a.inWrongBook || b.inWrongBook);
        if (!a.note && b.note) a.note = b.note;
        a.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
      }
    });
    Object.keys(remote.reviews).forEach(function (id) {
      var a = local.reviews[id], b = remote.reviews[id];
      if (!a) { local.reviews[id] = b; return; }
      if (!b) return;
      if ((b.lastAt || 0) > (a.lastAt || 0) || (b.stage || 0) > (a.stage || 0)) local.reviews[id] = b;
    });
    var byId = {};
    local.sessions.forEach(function (s) { if (s && s.id) byId[s.id] = s; });
    remote.sessions.forEach(function (s) {
      if (!s || !s.id) return;
      var a = byId[s.id];
      if (!a || (s.at || 0) > (a.at || 0)) byId[s.id] = s;
    });
    local.sessions = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 300);
    Object.keys(remote.checkins).forEach(function (k) {
      var a = local.checkins[k], b = remote.checkins[k];
      if (!a || (b.count || 0) > (a.count || 0)) local.checkins[k] = b;
    });
    local.v = Math.max(local.v || 1, remote.v || 1);
    local.createdAt = Math.min(local.createdAt || Date.now(), remote.createdAt || Date.now());
    local.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
    return local;
  }
  function applyCloudRow(row, replace) {
    if (!row || !row.data) return false;
    CLOUD_APPLYING = true;
    var localSettings = state.settings;
    if (replace) state = normalizeCloudState(row.data);
    else mergeStates(state, row.data);
    state.settings = Object.assign({}, DEFAULT_SETTINGS, localSettings || {});
    state.updatedAt = Math.max(state.updatedAt || 0, row.client_updated_at || 0);
    saveState({ cloud: false, touch: false });
    CLOUD.lastRemoteAt = Math.max(CLOUD.lastRemoteAt || 0, row.client_updated_at || 0);
    CLOUD.lastSyncAt = Date.now();
    saveCloudMeta();
    CLOUD_APPLYING = false;
    updateAccountTop();
    render();
    return true;
  }
  function handleRemoteState(row) {
    if (!row || !row.data || CLOUD_APPLYING) return;
    var ts = row.client_updated_at || 0;
    if (ts <= (state.updatedAt || 0)) return;
    applyCloudRow(row, false);
    toast('已从云端同步最新进度');
  }
  function isLocalStateEmpty() {
    return !Object.keys(state.progress).length && !state.sessions.length && !Object.keys(state.checkins).length;
  }
  function scheduleCloudPush() {
    if (!CLOUD_USER || CLOUD_APPLYING) return;
    if (!navigator.onLine) {
      CLOUD.pending = true; saveCloudMeta(); updateAccountTop(); return;
    }
    clearTimeout(CLOUD_PUSH_TIMER);
    CLOUD_PUSH_TIMER = setTimeout(function () { cloudSyncAll(); }, 1100);
  }
  async function cloudSyncAll(opts) {
    opts = opts || {};
    if (!CLOUD_SB || !CLOUD_USER) return;
    if (!navigator.onLine) { CLOUD.pending = true; saveCloudMeta(); updateAccountTop(); return; }
    if (CLOUD_SYNCING) { CLOUD.pending = true; saveCloudMeta(); return; }
    CLOUD_SYNCING = true;
    updateAccountTop();
    try {
      var uid = CLOUD_USER.id;
      var q = await CLOUD_SB.from('user_state').select('*').eq('user_id', uid).maybeSingle();
      if (q.error) throw q.error;
      var row = q.data;
      if (row && row.data && !opts.forcePush) {
        if (opts.forcePull || isLocalStateEmpty() || (row.client_updated_at || 0) > (state.updatedAt || 0)) {
          applyCloudRow(row, opts.forcePull || isLocalStateEmpty());
        }
      }
      var payload = { user_id: uid, data: state, client_updated_at: state.updatedAt || Date.now() };
      var up = await CLOUD_SB.from('user_state').upsert(payload, { onConflict: 'user_id' });
      if (up.error) throw up.error;
      CLOUD.lastSyncAt = Date.now();
      CLOUD.lastRemoteAt = Math.max(CLOUD.lastRemoteAt || 0, payload.client_updated_at);
      CLOUD.pending = false;
      saveCloudMeta();
      await flushCloudDeletions();
      await uploadCloudTraces();
      await downloadCloudTraces();
      updateAccountTop();
      if (CLOUD_ACCOUNT_ROUTE) render();
    } catch (e) {
      console.warn('云同步失败', e);
      CLOUD.pending = true; saveCloudMeta(); updateAccountTop();
      toast('云同步暂未完成：' + cloudErrorText(e));
    } finally {
      CLOUD_SYNCING = false;
      if (CLOUD.pending && navigator.onLine) {
        clearTimeout(CLOUD_PUSH_TIMER);
        CLOUD_PUSH_TIMER = setTimeout(function () { cloudSyncAll(); }, 2500);
      }
    }
  }

  /* ---------------- cloud trace images ---------------- */
  async function uploadCloudTraces() {
    if (!CLOUD_SB || !CLOUD_USER || !navigator.onLine) return;
    var userId = CLOUD_USER.id;
    var items = await listAllTraces().catch(function () { return []; });
    for (var i = 0; i < items.length; i++) {
      var rec = items[i];
      if (!rec || !rec.blob || rec.cloudId) continue;
      try {
        var path = userId + '/' + rec.qid + '/' + uid() + '.jpg';
        var up = await CLOUD_SB.storage.from('traces').upload(path, rec.blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        var ins = await CLOUD_SB.from('traces').insert({
          user_id: userId, qid: rec.qid, storage_path: path, name: rec.name || 'trace.jpg'
        }).select().single();
        if (ins.error) throw ins.error;
        await updateTrace(rec.id, { cloudId: ins.data.id, cloudPath: path, synced: true, ownerId: userId });
      } catch (e) {
        console.warn('图片上传失败，稍后重试', e);
        CLOUD.pending = true;
        saveCloudMeta();
        updateAccountTop();
        break;
      }
    }
  }
  async function downloadCloudTraces() {
    if (!CLOUD_SB || !CLOUD_USER || !navigator.onLine) return;
    var rows = await CLOUD_SB.from('traces').select('*').eq('user_id', CLOUD_USER.id);
    if (rows.error || !rows.data) return;
    var local = await listAllTraces().catch(function () { return []; });
    var have = {};
    local.forEach(function (x) { if (x.cloudId) have[x.cloudId] = true; });
    for (var i = 0; i < rows.data.length; i++) {
      var r = rows.data[i];
      if (have[r.id]) continue;
      await downloadCloudTraceRow(r);
    }
  }
  async function downloadCloudTraceRow(row) {
    if (!CLOUD_SB || !CLOUD_USER || !row || !row.storage_path) return;
    try {
      var local = await listAllTraces();
      if (local.some(function (x) { return x.cloudId === row.id; })) return;
      var dl = await CLOUD_SB.storage.from('traces').download(row.storage_path);
      if (dl.error) throw dl.error;
      var id = await addTrace(row.qid, dl.data, row.name || 'trace.jpg');
      await updateTrace(id, { cloudId: row.id, cloudPath: row.storage_path, synced: true, ownerId: CLOUD_USER.id });
      // 下载完成后刷新当前页面里的缩略图
      refreshTraceGalleries(document);
    } catch (e) {
      console.warn('图片下载失败', e);
      CLOUD.pending = true;
      saveCloudMeta();
      updateAccountTop();
    }
  }
  async function flushCloudDeletions() {
    if (!CLOUD_SB || !CLOUD_USER || !navigator.onLine) return;
    if (!CLOUD.deletions || !CLOUD.deletions.length) return;
    var rest = [];
    for (var i = 0; i < CLOUD.deletions.length; i++) {
      var d = CLOUD.deletions[i];
      try {
        if (d.path) await CLOUD_SB.storage.from('traces').remove([d.path]);
        if (d.cloudId) await CLOUD_SB.from('traces').delete().eq('id', d.cloudId);
      } catch (e) { rest.push(d); }
    }
    CLOUD.deletions = rest;
    saveCloudMeta();
  }
  function queueCloudDeletion(rec) {
    if (!rec || !rec.cloudId) return;
    CLOUD.deletions = CLOUD.deletions || [];
    CLOUD.deletions.push({ cloudId: rec.cloudId, path: rec.cloudPath });
    saveCloudMeta();
    if (navigator.onLine) flushCloudDeletions();
  }
  async function clearAllLocalTraces() {
    var items = await listAllTraces().catch(function () { return []; });
    items.forEach(function (rec) { if (rec.cloudId) queueCloudDeletion(rec); });
    await clearTraces();
  }
  async function removeLocalTraceByCloudId(cloudId) {
    if (!cloudId) return;
    var items = await listAllTraces().catch(function () { return []; });
    var rec = items.find(function (x) { return x.cloudId === cloudId; });
    if (rec) {
      await deleteTrace(rec.id);
      refreshTraceGalleries(document);
    }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.qids)) return null;
      s.results = s.results || {};
      s.revealed = s.revealed || {};
      s.display = s.display === 'paper' ? 'paper' : 'single';
      s.index = Math.max(0, parseInt(s.index, 10) || 0);
      s.title = s.title || '练习';
      s.review = !!s.review;
      return s;
    } catch (e) { return null; }
  }
  var S = loadSession();
  function saveSession() {
    try {
      if (S) localStorage.setItem(SESSION_KEY, JSON.stringify(S));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- theme ---------------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var pref = state.settings.theme || 'auto';
    var dark = pref === 'dark' || (pref === 'auto' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = dark ? '☀' : '☾';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#121417' : '#f7f4ec');
  }
  function applyFont() {
    document.documentElement.setAttribute('data-font', state.settings.font || 'md');
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (state.settings.theme === 'auto') applyTheme(); });

  /* ---------------- math ---------------- */
  function renderMath(root) {
    if (!window.renderMathInElement || !root) return;
    try {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        strict: false,
        trust: false,
        macros: {
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\eps': '\\varepsilon'
        }
      });
    } catch (e) { console.warn('math render', e); }
  }

  /* ---------------- progress helpers ---------------- */
  function chapterStats(ch) {
    var list = QS.filter(function (q) { return q.chapter === ch; });
    var attempted = 0, correct = 0, wrong = 0, wrongBook = 0;
    list.forEach(function (q) {
      var p = getP(q.id);
      if (p.attempts) attempted++;
      correct += p.correct || 0;
      wrong += p.wrong || 0;
      if (p.inWrongBook) wrongBook++;
    });
    return { total: list.length, attempted: attempted, correct: correct, wrong: wrong, wrongBook: wrongBook, accuracy: (correct + wrong) ? Math.round(correct * 100 / (correct + wrong)) : 0 };
  }
  function globalStats() {
    var attempted = 0, correct = 0, wrong = 0, wrongBook = 0, fav = 0, flagged = 0;
    QS.forEach(function (q) {
      var p = getP(q.id);
      if (p.attempts) attempted++;
      correct += p.correct || 0;
      wrong += p.wrong || 0;
      if (p.inWrongBook) wrongBook++;
      if (p.favorite) fav++;
      if (p.flagged) flagged++;
    });
    return {
      total: QS.length, attempted: attempted, correct: correct, wrong: wrong, wrongBook: wrongBook, fav: fav,
      flagged: flagged, due: reviewDueCount(),
      accuracy: (correct + wrong) ? Math.round(correct * 100 / (correct + wrong)) : 0
    };
  }
  function streakDays() {
    if (Object.keys(state.checkins || {}).length) return checkinStreak();
    var set = {};
    state.sessions.forEach(function (s) { if (s.at) set[dayKey(s.at)] = true; });
    var d = new Date();
    if (!set[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    var n = 0;
    while (set[dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function todayDone() {
    var k = todayKey(), n = 0;
    state.sessions.forEach(function (s) {
      if (dayKey(s.at) !== k) return;
      n += (s.correct || 0) + (s.wrong || 0);
    });
    return n;
  }
  function chapterRange() { return '第 1–' + ((META.chapters || [])[META.chapters.length - 1] || { n: 4 }).n + ' 章'; }
  function secLabel(id) { return id.indexOf('.rev') >= 0 ? '总练习' : id; }
  function complexityLabel(n) { return n === 1 ? '小题' : n === 2 ? '中题' : '大题'; }
  function qStatus(id) {
    var p = getP(id);
    if (p.inWrongBook) return 'wrong';
    if (p.lastResult === 'correct') return 'correct';
    if (p.attempts) return 'attempted';
    return 'new';
  }
  function statusLabel(id) {
    var s = qStatus(id);
    return { wrong: '错题', correct: '做对过', attempted: '练过', 'new': '未做' }[s];
  }

  /* ---------------- rendering helpers ---------------- */
  function bodyHTML(q) {
    var b = String(q.body || '');
    var FIG = '@@FIG1_4@@';
    b = b.replace(/\[\[FIG1_4\]\]/g, FIG);
    b = esc(b);
    if (q.refs && q.refs.length) {
      b = b.replace(/(定理\s*\d+(?:\.\d+)?)/g, '$1<sup class="ref-pin">引</sup>');
      b = b.replace(/(第\s*\d+\s*题)/g, '$1<sup class="ref-pin">引</sup>');
    }
    return b.replace(FIG,
      '<figure class="q-fig"><img src="assets/img/fig-1-4.png" alt="图 1-4：两条折线，f1 过 (0,0)、(1/2,2)、(1,0)，f2 过 (0,0)、(1/4,4)、(1/2,0)"><figcaption>图 1-4</figcaption></figure>');
  }
  function refBlock(q) {
    var ids = q.refs || [];
    if (!ids.length) return '';
    var items = ids.map(function (id) {
      var r = REFS[id];
      if (!r) return '';
      var label = r.qid ? '<a href="#/q/' + r.qid + '">' + esc(r.label) + '</a>' : esc(r.label);
      return '<div class="ref-item"><span class="ref-label">' + label + '</span><div class="ref-text">' + esc(r.text) + '</div></div>';
    }).join('');
    if (!items) return '';
    return '<div class="ref-box"><div class="ref-head">题目引用 · 教材原文</div>' + items + '</div>';
  }
  function clusterBox(q) {
    var c = CMAP[q.cluster];
    if (!c) return '';
    var open = c.rep === q.id ? ' open' : '';
    return '<details class="cluster-box"' + open + '><summary><span class="tag accent">题型</span><b>' + esc(c.name) + '</b><span class="tiny muted">知识点 / 答题模板</span></summary>' +
      '<div class="cluster-inner">' +
        '<div class="cluster-sec"><b>知识点总结</b><p>' + esc(c.summary) + '</p></div>' +
        '<div class="cluster-sec"><b>答题模板 · 关键步骤</b><ol>' + (c.template || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' +
        '<div class="cluster-foot">代表题：<a href="#/q/' + c.rep + '">' + c.rep + '</a>' + (c.rep === q.id ? '（本题）' : '') + '</div>' +
      '</div></details>';
  }
  function renderSolution(q) {
    if (!q.solution && !q.answer) {
      return '<section class="solution"><div class="solution-head">解析</div>' + clusterBox(q) + '<div class="solution-body muted">逐题解析正在整理中。先按上面的题型模板与教材推导，再对照答案自评。</div></section>';
    }
    var ans = q.answer ? '<div class="answer-box"><b>答案</b><div>' + esc(q.answer) + '</div></div>' : '';
    var hint = q.hint ? '<div class="hint-box"><b>教材提示：</b>' + esc(q.hint) + '</div>' : '';
    return '<section class="solution">' +
      '<div class="solution-head">解析</div>' + clusterBox(q) + ans +
      '<div class="solution-body">' + esc(q.solution || '') + hint + '</div></section>';
  }
  function noteBlock(q) {
    var p = getP(q.id);
    var open = p.note ? ' open' : '';
    return '<details class="note-wrap"' + open + '><summary>文字痕迹 / 笔记<span class="saved" data-saved="' + q.id + '"></span></summary>' +
      '<textarea data-note data-qid="' + q.id + '" placeholder="写下思路、关键步骤、错因或疑问，自动保存…">' + esc(p.note || '') + '</textarea></details>';
  }
  function traceBlock(q) {
    return '<div class="trace-block" data-trace-block="' + q.id + '">' +
      '<div class="trace-head"><b>我的作答痕迹</b>' +
        '<label class="btn sm trace-upload">＋ 上传图片<input type="file" accept="image/*" multiple data-trace-input data-qid="' + q.id + '"></label>' +
        '<span class="tiny faint">未登录只存本机；登录后会同步到云端</span></div>' +
      '<div class="trace-gallery" data-trace-gallery="' + q.id + '"><span class="tiny faint">加载中…</span></div></div>';
  }
  function qCard(q, idx, opts) {
    opts = opts || {};
    var p = getP(q.id);
    var res = S && S.results[q.id] ? S.results[q.id].status : '';
    var revealed = opts.alwaysSolution || (S && S.revealed[q.id]);
    var showGrade = opts.grade !== false;
    var num = opts.num != null ? opts.num : q.number;
    var cls = 'q-card' + (res ? ' graded-' + res : '');
    var r = getReview(q.id);
    var cl = CMAP[q.cluster];
    return '<article class="' + cls + '" id="q-' + q.id + '" data-qid="' + q.id + '">' +
      '<header class="q-head">' +
        '<div class="q-index">' + pad(num) + '</div>' +
        '<div class="q-head-main">' +
          '<div class="q-crumb"><b>' + esc(q.chapterTitle) + '</b><span>·</span><span>' + esc(q.sectionTitle) + '</span><span>·</span><span class="q-origin">原题 ' + q.number + '</span></div>' +
          '<div class="q-meta-tags" style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap">' +
            '<span class="tag accent">' + esc(q.type) + '</span>' +
            (cl && cl.rep === q.id ? '<span class="tag green">代表题</span>' : '') +
            q.tags.slice(0, 2).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
            '<span class="tag ' + (r && (r.stage || 0) >= 7 ? 'green' : 'amber') + '" data-review-tag="' + q.id + '" style="' + (r ? '' : 'display:none') + '">' + (r ? reviewStageText(r) : '') + '</span>' +
            '<span class="tag" title="难度">' + '●'.repeat(q.difficulty) + '○'.repeat(3 - q.difficulty) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="q-tools no-print">' +
          (q.chapter >= 5 ? '<a class="icon-btn" href="#/knowledge?ch=' + q.chapter + (q.section.indexOf('.rev') < 0 ? '&sec=' + q.section : '') + '" aria-label="本章知识点" title="查看本章知识点">▤</a>' : '') +
          '<button class="icon-btn ' + (p.flagged ? 'on' : '') + '" data-action="flag" data-qid="' + q.id + '" aria-label="标记" title="标记这道题">' + (p.flagged ? '⚑' : '⚐') + '</button>' +
          '<button class="icon-btn ' + (p.favorite ? 'on' : '') + '" data-action="fav" data-qid="' + q.id + '" aria-label="收藏" title="收藏">' + (p.favorite ? '★' : '☆') + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="q-body">' + bodyHTML(q) + '</div>' + refBlock(q) +
      (q.hint ? '<div class="q-hint"><b>提示</b> ' + esc(q.hint) + '</div>' : '') +
      ((opts.alwaysSolution || opts.hideFoot) ? '' : '<div class="q-foot no-print">' +
        '<button class="btn sm ghost" data-action="reveal" data-qid="' + q.id + '">' + (revealed ? '收起解析' : '查看解析') + '</button>' +
        '<button class="icon-btn" data-action="zoom" data-qid="' + q.id + '" title="放大题目" aria-label="放大题目">⤢</button>' +
        '<span class="spacer"></span>' +
        (showGrade ? '<div class="grade-group" role="group" aria-label="自评">' +
          '<button class="grade-btn ' + (res === 'correct' ? 'on-correct' : '') + '" data-action="grade" data-qid="' + q.id + '" data-result="correct">✓ 做对了</button>' +
          '<button class="grade-btn ' + (res === 'wrong' ? 'on-wrong' : '') + '" data-action="grade" data-qid="' + q.id + '" data-result="wrong">✕ 做错了</button>' +
        '</div>' : '') +
      '</div>') +
      (revealed ? renderSolution(q) : '') +
      (opts.note === false ? '' : noteBlock(q) + traceBlock(q)) +
      '</article>';
  }

  /* ---------------- views: home ---------------- */
  function viewHome() {
    var g = globalStats();
    var st = streakDays();
    var active = S && !S.finished && S.qids && S.qids.length ? S : null;
    var resume = '';
    if (active) {
      var done = Object.keys(active.results || {}).length;
      resume = '<div class="resume"><span class="pulse"></span><span class="txt">上次练习还没结束：<b>' + esc(active.title) + '</b> · 已完成 ' + done + ' / ' + active.qids.length + ' 题</span>' +
        '<a class="btn sm primary" href="#/session">继续练习</a>' +
        '<button class="btn sm ghost" data-action="discard-session">放弃</button></div>';
    }
    var chapterCards = (META.chapters || []).map(function (c) {
      var cs = chapterStats(c.n);
      var pct = cs.total ? Math.round(cs.attempted * 100 / cs.total) : 0;
      var secs = c.sections.map(function (s) {
        return '<button class="tag" data-action="start-section" data-sec="' + s.id + '" title="练这一节">' + esc(secLabel(s.id)) + ' · ' + s.count + '</button>';
      }).join('');
      return '<article class="chapter-card">' +
        '<div class="chapter-top"><div class="chapter-num">' + c.n + '</div>' +
          '<div><h3>' + esc(c.title.replace(/^第.章\s*/, '')) + '</h3><div class="meta">' + c.count + ' 题 · 已练 ' + cs.attempted + ' · 正确率 ' + (cs.correct + cs.wrong ? cs.accuracy + '%' : '—') + '</div></div>' +
          '<div class="chapter-pct">' + pct + '%<small>进度</small></div></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="chapter-sections">' + secs + '</div>' +
        '<div class="chapter-foot"><button class="btn sm" data-action="start-chapter" data-ch="' + c.n + '">练本章</button>' +
          '<button class="btn sm ghost" data-action="start-chapter-wrong" data-ch="' + c.n + '">本章错题</button></div>' +
      '</article>';
    }).join('');

    return '<section class="hero">' +
      '<div class="eyebrow">Mathematical Analysis · 6th Edition</div>' +
      '<h1>把课后题，<em>刷透</em>。</h1>' +
      '<p class="lede">华东师范大学《数学分析》第六版上册 · ' + chapterRange() + '。随机抽题、整卷或单题、题型总结、错题本与艾宾浩斯复习，学习记录自动保存在本机。</p>' +
      '<div class="btn-row"><button class="btn primary lg" data-action="start-setup">开始刷题 →</button>' +
        '<button class="btn lg" data-action="quick-start">随机 10 题</button>' +
        '<a class="btn lg ghost" href="#/bank">浏览题库</a></div>' +
      '<div class="hero-meta"><div><b>' + META.total + '</b><span>课后习题</span></div>' +
        '<div><b>' + (META.chapters || []).length + '</b><span>章节</span></div>' +
        '<div><b>' + g.attempted + '</b><span>已练题目</span></div>' +
        '<div><b>' + (g.correct + g.wrong ? g.accuracy + '%' : '—') + '</b><span>累计正确率</span></div></div>' +
    '</section>' +
    resume +
    '<div class="kb-promo"><div><div class="eyebrow">TEXTBOOK · 第 5–6 章</div><h3>导数与微分 · 微分中值定理</h3><p>定义、定理、公式、证明步骤与易混注记，按小节整理，支持全文搜索。</p></div><a class="btn primary" href="#/knowledge">打开知识点 →</a></div>' +
    (function () {
      var checked = !!state.checkins[todayKey()];
      return '<div class="review-panel">' +
        '<div class="review-copy"><div class="eyebrow">EBBINGHAUS · 7 次复习</div><h3>今日复习</h3>' +
          '<p>到期 <b>' + g.due + '</b> 题 · ' + (checked ? '<span class="tag green">今日已打卡</span>' : '<span class="tag amber">今日未打卡</span>') + ' · 连续 ' + checkinStreak() + ' 天</p></div>' +
        '<div class="review-actions"><button class="btn primary" data-action="start-review"' + (g.due ? '' : ' disabled') + '>开始今日复习</button>' +
          (checked ? '' : '<button class="btn" data-action="checkin">打卡</button>') + '</div>' +
      '</div>';
    })() +
    '<div class="stats-grid">' +
      '<div class="stat"><div class="k">已练题目</div><div class="v">' + g.attempted + '<small>/ ' + g.total + '</small></div><div class="d">今日完成 ' + todayDone() + ' 题</div></div>' +
      '<div class="stat"><div class="k">累计正确率</div><div class="v">' + (g.correct + g.wrong ? g.accuracy : 0) + '<small>%</small></div><div class="d">对 ' + g.correct + ' · 错 ' + g.wrong + '</div></div>' +
      '<div class="stat"><div class="k">错题本</div><div class="v">' + g.wrongBook + '<small>题</small></div><div class="d"><a href="#/wrong">去重练 →</a></div></div>' +
      '<div class="stat"><div class="k">连续学习</div><div class="v">' + st + '<small>天</small></div><div class="d">收藏 ' + g.fav + ' · 标记 ' + g.flagged + '</div></div>' +
    '</div>' +
    '<div class="section-title"><h2>按章节练习</h2><span class="line"></span><span class="more">点击小节可直接开练</span></div>' +
    '<div class="chapter-grid">' + chapterCards + '</div>' +
    '<div class="section-title"><h2>怎么用</h2><span class="line"></span></div>' +
    '<div class="chapter-grid" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card card-pad"><h3 style="font-size:16px">1 · 选题</h3><p class="small muted" style="margin-top:6px">按章节、错题、未做、标记或自定义勾选；随机抽题可自由设定数量，支持打乱顺序与“换一题”。</p></div>' +
      '<div class="card card-pad"><h3 style="font-size:16px">2 · 作答</h3><p class="small muted" style="margin-top:6px">整卷一次看完，单题逐题推进；可放大题目、标记重点，做完对照解析与题型模板自评。</p></div>' +
      '<div class="card card-pad"><h3 style="font-size:16px">3 · 复盘</h3><p class="small muted" style="margin-top:6px">错题重练、收藏夹、章节正确率，以及按 1/2/4/7/15/30/60 天安排的 7 次复习与每日打卡。</p></div>' +
    '</div>';
  }

  /* ---------------- views: bank ---------------- */
  function filteredQuestions(query) {
    var ch = query.ch ? parseInt(query.ch, 10) : 0;
    var sec = query.sec || '';
    var status = query.status || 'all';
    var kw = (query.q || '').trim().toLowerCase();
    return QS.filter(function (q) {
      if (ch && q.chapter !== ch) return false;
      if (sec && q.section !== sec) return false;
      var st = qStatus(q.id);
      if (status === 'new' && st !== 'new') return false;
      if (status === 'wrong' && st !== 'wrong') return false;
      if (status === 'correct' && st !== 'correct') return false;
      if (status === 'fav' && !getP(q.id).favorite) return false;
      if (status === 'flagged' && !getP(q.id).flagged) return false;
      if (status === 'due' && !(getReview(q.id) && getReview(q.id).nextAt && getReview(q.id).nextAt <= Date.now() && (getReview(q.id).stage || 0) < 7)) return false;
      if (kw) {
        var hay = (q.id + ' ' + q.source + ' ' + q.body + ' ' + q.tags.join(' ') + ' ' + (CMAP[q.cluster] ? CMAP[q.cluster].name : '')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
  }
  function bankRow(q) {
    var p = getP(q.id);
    var st = qStatus(q.id);
    var r = getReview(q.id);
    return '<div class="bank-row" data-qid="' + q.id + '">' +
      '<div class="bank-id">' + q.id + '</div>' +
      '<div class="bank-main"><a href="#/q/' + q.id + '">' + esc(snippet(q.body, 70)) + '</a>' +
        '<div class="snippet">' + esc(q.source) + ' · 第 ' + q.number + ' 题' + (r ? ' · ' + reviewStageText(r) : '') + '</div></div>' +
      '<div class="bank-tags">' + q.tags.slice(0, 2).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="bank-status ' + (st === 'correct' ? 'correct' : st === 'wrong' ? 'wrong' : '') + '"><span class="dot"></span>' + statusLabel(q.id) + '</div>' +
      '<div class="bank-actions"><button class="icon-btn ' + (p.flagged ? 'on' : '') + '" data-action="flag" data-qid="' + q.id + '" title="标记">' + (p.flagged ? '⚑' : '⚐') + '</button>' +
        '<button class="icon-btn ' + (p.favorite ? 'on' : '') + '" data-action="fav" data-qid="' + q.id + '" title="收藏">' + (p.favorite ? '★' : '☆') + '</button>' +
        '<a class="icon-btn" href="#/q/' + q.id + '" title="查看">›</a></div>' +
    '</div>';
  }
  function viewBank(route) {
    var q = route.query;
    var list = filteredQuestions(q);
    var chips = '<div class="seg">' +
      '<a href="#/bank" class="' + (!q.ch ? 'active' : '') + '" style="text-decoration:none;padding:5px 11px;border-radius:6px;' + (!q.ch ? 'background:var(--card);color:var(--ink);font-weight:600' : 'color:var(--muted)') + '">全部</a>' +
      (META.chapters || []).map(function (c) {
        return '<a href="#/bank?ch=' + c.n + '" style="text-decoration:none;padding:5px 11px;border-radius:6px;' + (parseInt(q.ch, 10) === c.n ? 'background:var(--card);color:var(--ink);font-weight:600' : 'color:var(--muted)') + '">第' + c.n + '章</a>';
      }).join('') + '</div>';
    var statusSel = '<select id="bankStatus" data-nav-select="status" aria-label="状态筛选">' +
      [['all', '全部状态'], ['new', '未做'], ['wrong', '错题'], ['correct', '做对过'], ['fav', '收藏'], ['flagged', '标记'], ['due', '待复习']].map(function (x) {
        return '<option value="' + x[0] + '"' + ((q.status || 'all') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select>';
    var search = '<form class="searchbox" data-search-form><input class="input" name="q" value="' + esc(q.q || '') + '" placeholder="搜索题目、知识点…" aria-label="搜索题目"></form>';
    return '<div class="page-head"><div><h1>题库</h1><div class="sub">' + chapterRange() + '共 ' + QS.length + ' 道课后习题 · 当前 ' + list.length + ' 道</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="start-setup">选题练习</button><button class="btn" data-action="start-filtered">练当前筛选</button></div></div>' +
      '<div class="filterbar">' + chips + statusSel + search + '</div>' +
      (list.length ? '<div class="bank-list">' + list.map(bankRow).join('') + '</div>' :
        '<div class="empty"><div class="big">∅</div><h3>没有符合条件的题目</h3><p>换个章节、状态或关键词试试。</p></div>');
  }

  /* ---------------- views: textbook knowledge ---------------- */
  function kbType(p) {
    var t = p.type || '';
    return t === '定理' ? '定理' : t === '定义' ? '定义' : t === '推论' ? '推论' : t === '命题' ? '命题' : t === '注' ? '易混/注意' : t === '公式' ? '公式' : t === '步骤' ? '作图步骤' : t === '方法' ? '方法' : '补充';
  }
  function kbAllItems() {
    var out = [];
    (KNOWLEDGE.chapters || []).forEach(function (c) {
      (c.sections || []).forEach(function (s) {
        (s.points || []).forEach(function (p) { out.push({ ch: c, sec: s, p: p }); });
      });
    });
    return out;
  }
  function kbCard(item) {
    var p = item.p, sec = item.sec, ch = item.ch;
    var proof = p.proof ? '<details class="kb-proof"><summary>证明步骤（展开）</summary><div class="kb-proof-body">' + esc(p.proof) + '</div></details>' : '';
    var short = (p.title || '').split(/[：:]/)[0].trim();
    var repeated = short && p.text.trim().indexOf(short) === 0;
    var heading = (repeated || p.type === '注') ? '' : '<h3>' + esc(p.title) + '</h3>';
    return '<article class="kb-card">' +
      '<div class="kb-card-top"><span class="kb-type t-' + esc(p.type || '') + '">' + kbType(p) + '</span>' +
        '<span class="kb-crumb">第 ' + ch.n + ' 章 · ' + sec.id + ' ' + esc(sec.title) + '</span></div>' +
      heading + '<div class="kb-text">' + esc(p.text) + '</div>' + proof +
    '</article>';
  }
  function viewKnowledge(route) {
    var q = (route.query.q || '').trim();
    var chapters = (KNOWLEDGE.chapters || []).filter(function (c) { return c.sections && c.sections.length; });
    if (!chapters.length) {
      return '<div class="page-head"><div><h1>课本知识点</h1></div></div><div class="empty"><div class="big">∅</div><h3>知识点数据未加载</h3></div>';
    }
    var chN = parseInt(route.query.ch, 10) || chapters[0].n;
    var chapter = chapters.find(function (c) { return c.n === chN; }) || chapters[0];
    var secId = route.query.sec || (chapter.sections[0] && chapter.sections[0].id);
    var section = chapter.sections.find(function (s) { return s.id === secId; }) || chapter.sections[0];
    var all = kbAllItems();
    var total = all.length;
    var searchForm = '<form class="kb-search" data-kb-search><input class="input" name="q" value="' + esc(q) + '" placeholder="搜索定义、定理、公式、证明步骤…" aria-label="搜索知识点"><button class="btn sm primary" type="submit">搜索</button></form>' +
      (q ? '<a class="kb-clear" href="#/knowledge">清除搜索</a>' : '');
    var chapterTabs = chapters.map(function (c) {
      return '<a class="kb-chapter-tab ' + (c.n === chapter.n ? 'on' : '') + '" href="#/knowledge?ch=' + c.n + '">第 ' + c.n + ' 章 · ' + esc(c.title) + '</a>';
    }).join('');
    var sectionList = '<div class="kb-sec-list">' + chapter.sections.map(function (s) {
      return '<a class="kb-sec ' + (s.id === section.id ? 'on' : '') + '" href="#/knowledge?ch=' + chapter.n + '&sec=' + s.id + '">' +
        '<span>' + s.id + ' ' + esc(s.title) + '</span><em>' + s.points.length + '</em></a>';
    }).join('') + '</div>';
    var main;
    if (q) {
      var kw = q.toLowerCase();
      var hits = all.filter(function (it) {
        var p = it.p;
        return [p.title, p.text, p.key, p.proof, it.sec.title, it.ch.title].join(' ').toLowerCase().indexOf(kw) >= 0;
      });
      main = '<div class="kb-main-head"><div><div class="kb-kicker">搜索结果</div><h2>“' + esc(q) + '” · ' + hits.length + ' 条</h2></div><a class="btn sm" href="#/knowledge">返回章节</a></div>' +
        (hits.length ? '<div class="kb-grid">' + hits.map(kbCard).join('') + '</div>' : '<div class="empty"><div class="big">∅</div><h3>没有找到相关知识点</h3><p>试试“导数”“中值定理”“泰勒”“极值”等关键词。</p></div>');
    } else {
      main = '<div class="kb-main-head"><div><div class="kb-kicker">第 ' + chapter.n + ' 章</div><h2>' + esc(chapter.title) + '</h2><p class="kb-overview">' + esc(chapter.overview || '') + '</p></div><span class="kb-count">' + section.points.length + ' 个要点</span></div>' +
        (section.overview ? '<div class="kb-section-note">' + esc(section.overview) + '</div>' : '') +
        '<div class="kb-grid">' + section.points.map(function (p) { return kbCard({ ch: chapter, sec: section, p: p }); }).join('') + '</div>';
    }
    return '<div class="page-head"><div><h1>课本知识点</h1><div class="sub">第 5–6 章 · 定义、定理、公式、证明步骤与易混注记 · 共 ' + total + ' 条</div></div></div>' +
      '<div class="kb-layout"><aside class="kb-side">' + searchForm + '<div class="kb-chapter-tabs">' + chapterTabs + '</div>' + sectionList +
      '<div class="kb-side-note">知识点来自教材 OCR，公式已保留；定理证明折叠在卡片底部。</div></aside><div class="kb-main">' + main + '</div></div>';
  }

  /* ---------------- views: wrong / favorites ---------------- */
  function viewWrong() {
    var list = QS.filter(function (q) { return getP(q.id).inWrongBook; })
      .sort(function (a, b) { return (getP(b.id).lastAt || 0) - (getP(a.id).lastAt || 0); });
    var head = '<div class="page-head"><div><h1>错题本</h1><div class="sub">做错过的题会自动进来；重做并自评“做对了”或手动移出即可。</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="start-wrong-all"' + (list.length ? '' : ' disabled') + '>全部重练（' + list.length + '）</button>' +
      '<a class="btn" href="#/export">导出复习文档</a><button class="btn" data-action="start-setup">自定义练题</button></div></div>';
    if (!list.length) {
      return head + '<div class="empty"><div class="big">✓</div><h3>错题本是空的</h3><p>去刷几题吧。做错的题会自动收录，之后可以集中重练。</p><a class="btn primary" href="#/bank">去题库</a></div>';
    }
    var rows = list.map(function (q) {
      var p = getP(q.id);
      return '<div class="bank-row" data-qid="' + q.id + '">' +
        '<div class="bank-id">' + q.id + '</div>' +
        '<div class="bank-main"><a href="#/q/' + q.id + '">' + esc(snippet(q.body, 72)) + '</a>' +
          '<div class="snippet">' + esc(q.source) + ' · 错了 ' + (p.wrong || 0) + ' 次 · 最近 ' + (p.lastAt ? fmtDate(p.lastAt) : '—') + '</div></div>' +
        '<div class="bank-tags"><span class="tag red">错题</span></div>' +
        '<div class="bank-status wrong"><span class="dot"></span>' + statusLabel(q.id) + '</div>' +
        '<div class="bank-actions"><button class="icon-btn ' + (p.flagged ? 'on' : '') + '" data-action="flag" data-qid="' + q.id + '" title="标记">' + (p.flagged ? '⚑' : '⚐') + '</button>' +
          '<button class="icon-btn" data-action="start-one" data-qid="' + q.id + '" title="重练本题">▶</button>' +
          '<button class="icon-btn" data-action="remove-wrong" data-qid="' + q.id + '" title="移出错题本">✓</button></div>' +
      '</div>';
    }).join('');
    return head + '<div class="bank-list">' + rows + '</div>';
  }
  function viewFavorites() {
    var list = QS.filter(function (q) { return getP(q.id).favorite; })
      .sort(function (a, b) { return (getP(b.id).updatedAt || 0) - (getP(a.id).updatedAt || 0); });
    var head = '<div class="page-head"><div><h1>收藏</h1><div class="sub">把想二刷、想整理进笔记的题收在这里。</div></div></div>';
    if (!list.length) {
      return head + '<div class="empty"><div class="big">☆</div><h3>还没有收藏</h3><p>在题目卡片右上角点星号，就能把题收进来。</p><a class="btn primary" href="#/bank">去题库</a></div>';
    }
    return head + '<div class="bank-list">' + list.map(bankRow).join('') + '</div>';
  }

  /* ---------------- views: stats ---------------- */
  function viewStats() {
    var g = globalStats();
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      var k = dayKey(d.getTime());
      var n = 0;
      state.sessions.forEach(function (s) { if (dayKey(s.at) === k) n += (s.correct || 0) + (s.wrong || 0); });
      days.push({ k: k, label: (d.getMonth() + 1) + '/' + d.getDate(), n: n });
    }
    var max = Math.max.apply(null, days.map(function (x) { return x.n; }).concat([1]));
    var chart = days.map(function (x) {
      return '<div class="col" title="' + x.k + ' · ' + x.n + ' 题"><i style="height:' + (x.n ? Math.max(4, Math.round(x.n * 100 / max)) : 3) + '%;opacity:' + (x.n ? 1 : .18) + '"></i><span>' + x.label + '</span></div>';
    }).join('');
    var chRows = (META.chapters || []).map(function (c) {
      var cs = chapterStats(c.n);
      var pct = cs.total ? Math.round(cs.attempted * 100 / cs.total) : 0;
      return '<div class="stat-ch"><div><b>第 ' + c.n + ' 章</b><div class="tiny muted">' + cs.attempted + '/' + cs.total + ' 题</div></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="num">' + (cs.correct + cs.wrong ? cs.accuracy + '%' : '—') + '</div></div>';
    }).join('');
    var history = state.sessions.slice(0, 10).map(function (s) {
      var total = s.correct + s.wrong + (s.unanswered || 0);
      return '<div class="history-row"><span class="h-date">' + (s.at ? fmtDate(s.at) : '') + '</span>' +
        '<span class="h-title">' + esc(s.title || '练习') + '</span>' +
        '<span class="h-num">对 ' + s.correct + ' / ' + total + '</span>' +
        '<span class="tag ' + ((s.correct + s.wrong) && s.correct / (s.correct + s.wrong) >= .8 ? 'green' : '') + '">' + ((s.correct + s.wrong) ? Math.round(s.correct * 100 / (s.correct + s.wrong)) + '%' : '—') + '</span></div>';
    }).join('');
    var stageCounts = [0, 0, 0, 0, 0, 0, 0, 0];
    Object.keys(state.reviews).forEach(function (id) {
      if (!QMAP[id]) return;
      var st = Math.min(7, Math.max(0, state.reviews[id].stage || 0));
      stageCounts[st]++;
    });
    var stageMax = Math.max.apply(null, stageCounts.concat([1]));
    var stageRows = stageCounts.map(function (n, i) {
      return '<div class="stage-row"><span class="stage-label">' + (i === 0 ? '待首次' : i === 7 ? '已巩固' : '第 ' + i + ' 次') + '</span>' +
        '<div class="bar"><i style="width:' + Math.round(n * 100 / stageMax) + '%"></i></div><span class="stage-num">' + n + '</span></div>';
    }).join('');
    var checkDays = [];
    for (var ci = 29; ci >= 0; ci--) {
      var cd = new Date(); cd.setHours(0, 0, 0, 0); cd.setDate(cd.getDate() - ci);
      var ck = dayKey(cd.getTime());
      var on = !!state.checkins[ck];
      checkDays.push('<span class="check-cell' + (on ? ' on' : '') + '" title="' + ck + (on ? ' · 已打卡' : '') + '">' + (cd.getDate()) + '</span>');
    }
    var checkedToday = !!state.checkins[todayKey()];
    var memoryCard = '<div class="card card-pad memory-card">' +
      '<div class="section-title" style="margin:0 0 14px"><h2 style="font-size:17px">艾宾浩斯记忆训练</h2><span class="line"></span>' +
        '<button class="btn sm primary" data-action="start-review"' + (g.due ? '' : ' disabled') + '>今日复习（' + g.due + '）</button></div>' +
      '<div class="memory-stats"><div><b>' + g.due + '</b><span>到期复习</span></div><div><b>' + stageCounts[7] + '</b><span>已巩固</span></div><div><b>' + checkinStreak() + '</b><span>连续打卡</span></div><div><b>' + (checkedToday ? '✓' : '—') + '</b><span>今日打卡</span></div></div>' +
      '<div class="memory-cols"><div><h4>7 次复习进度</h4><div class="stage-bars">' + stageRows + '</div></div>' +
        '<div><h4>最近 30 天打卡</h4><div class="checkin-grid">' + checkDays.join('') + '</div>' +
        (checkedToday ? '' : '<button class="btn sm" data-action="checkin" style="margin-top:10px">今日打卡</button>') + '</div></div>' +
      '<p class="tiny faint" style="margin:10px 0 0">复习间隔：1、2、4、7、15、30、60 天。答对到期题推进一次，答错回到第 0 次；任何作答都会记为当日打卡。</p>' +
    '</div>';
    return '<div class="page-head"><div><h1>学习统计</h1><div class="sub">所有记录都保存在这台设备的浏览器里。</div></div></div>' +
      '<div class="stats-grid">' +
        '<div class="stat"><div class="k">已练</div><div class="v">' + g.attempted + '<small>/ ' + g.total + '</small></div><div class="d">覆盖率 ' + Math.round(g.attempted * 100 / g.total) + '%</div></div>' +
        '<div class="stat"><div class="k">正确率</div><div class="v">' + (g.correct + g.wrong ? g.accuracy : 0) + '<small>%</small></div><div class="d">对 ' + g.correct + ' · 错 ' + g.wrong + '</div></div>' +
        '<div class="stat"><div class="k">错题</div><div class="v">' + g.wrongBook + '<small>题</small></div><div class="d">待重练</div></div>' +
        '<div class="stat"><div class="k">连续学习</div><div class="v">' + streakDays() + '<small>天</small></div><div class="d">今日 ' + todayDone() + ' 题</div></div>' +
      '</div>' +
      memoryCard +
      '<div class="card card-pad" style="margin-bottom:16px"><div class="section-title" style="margin:0 0 12px"><h2 style="font-size:17px">最近 14 天</h2><span class="line"></span></div><div class="chart">' + chart + '</div></div>' +
      '<div class="chapter-grid" style="grid-template-columns:1.4fr 1fr">' +
        '<div class="card card-pad"><div class="section-title" style="margin:0 0 14px"><h2 style="font-size:17px">章节掌握度</h2><span class="line"></span></div><div class="stat-chapters">' + chRows + '</div>' +
          '<p class="tiny faint" style="margin-top:14px">右侧百分比为该章累计正确率；进度条为“练过的题 / 总题数”。</p></div>' +
        '<div class="card card-pad"><div class="section-title" style="margin:0 0 14px"><h2 style="font-size:17px">最近练习</h2><span class="line"></span></div>' +
          (history ? '<div class="history-list">' + history + '</div>' : '<p class="muted small">还没有练习记录。</p>') + '</div>' +
      '</div>';
  }

  /* ---------------- export review document ---------------- */
  function readExportOptions() {
    var chapters = new Set($$('[data-exp-ch]:checked').map(function (x) { return parseInt(x.value, 10); }));
    var rangeEl = document.getElementById('expRange');
    return {
      range: rangeEl ? rangeEl.value : '30',
      chapters: chapters,
      marked: !!(document.getElementById('expMarked') && document.getElementById('expMarked').checked),
      full: !!(document.getElementById('expFull') && document.getElementById('expFull').checked),
      images: !!(document.getElementById('expImages') && document.getElementById('expImages').checked)
    };
  }
  function exportCandidates(opts) {
    var cutoff = opts.range === 'all' ? 0 : Date.now() - parseInt(opts.range, 10) * DAY;
    return QS.filter(function (q) {
      if (opts.chapters && !opts.chapters.has(q.chapter)) return false;
      var p = getP(q.id);
      if (!p.inWrongBook && !(opts.marked && p.flagged)) return false;
      var t = p.lastAt || p.updatedAt || 0;
      if (cutoff && !(t && t >= cutoff)) return false;
      return true;
    }).sort(function (a, b) {
      var pa = getP(a.id), pb = getP(b.id);
      return (pb.lastAt || pb.updatedAt || 0) - (pa.lastAt || pa.updatedAt || 0);
    });
  }
  function updateExportPreview() {
    var box = document.getElementById('expPreviewCount');
    if (!box) return;
    var qs = exportCandidates(readExportOptions());
    var cls = {};
    qs.forEach(function (q) { if (q.cluster) cls[q.cluster] = 1; });
    box.innerHTML = '<b>' + qs.length + '</b> 题 · 涉及 ' + Object.keys(cls).length + ' 个题型';
    var btn = document.querySelector('[data-action="generate-export"]');
    if (btn) btn.textContent = '生成并下载（' + qs.length + ' 题）';
  }
  function viewExport() {
    var allCh = (META.chapters || []).map(function (c) {
      return '<label class="chip on"><input type="checkbox" data-exp-ch value="' + c.n + '" checked>第 ' + c.n + ' 章</label>';
    }).join('');
    return '<div class="page-head"><div><h1>导出复习文档</h1><div class="sub">把近期错题、关键步骤与自己的作答痕迹打包成一个手机友好的 HTML 文件。</div></div></div>' +
      '<div class="export-grid"><div class="card card-pad">' +
        '<div class="section-title" style="margin:0 0 8px"><h2 style="font-size:17px">导出设置</h2><span class="line"></span></div>' +
        '<div class="export-row"><label>时间范围</label><select id="expRange"><option value="7">最近 7 天</option><option value="30" selected>最近 30 天</option><option value="90">最近 90 天</option><option value="all">全部错题</option></select></div>' +
        '<div class="export-row"><label>章节</label><div class="export-chips">' + allCh + '</div></div>' +
        '<div class="export-row"><label>内容</label><label class="checkline"><input type="checkbox" id="expMarked">同时包含标记题</label><label class="checkline"><input type="checkbox" id="expFull">包含完整解析</label><label class="checkline"><input type="checkbox" id="expImages" checked>包含我的图片痕迹</label></div>' +
        '<div class="export-row"><label>预览</label><div class="export-preview" id="expPreviewCount"></div></div>' +
        '<div class="btn-row" style="margin-top:14px"><button class="btn primary lg" data-action="generate-export">生成并下载</button><a class="btn lg ghost" href="#/wrong">返回错题本</a></div>' +
        '<div class="export-tip" style="margin-top:14px">生成的是单个 HTML 文件：公式转为 MathML，图片内嵌，不依赖网络；手机浏览器直接打开，也可以打印或“存为 PDF”。</div>' +
      '</div><div class="card card-pad"><h3 style="font-size:17px;margin-bottom:8px">文档里包含</h3>' +
        '<ul class="small" style="padding-left:18px;line-height:1.9;color:var(--ink-2)">' +
          '<li>每道错题的题干、所属章节、题型、难度与复杂度</li>' +
          '<li><b>题型知识点总结 + 答题模板 / 关键步骤</b></li>' +
          '<li><b>本题思路</b>（解析开头要点）与答案</li>' +
          '<li>题目引用的教材定理 / 前题结论</li>' +
          '<li>你自己写的文字痕迹与上传的作答图片</li>' +
          (readExportOptions().full ? '<li>完整解析</li>' : '<li>可选：勾选“包含完整解析”后附完整解析</li>') +
        '</ul>' +
        '<div class="export-tip" style="margin-top:12px">图片痕迹默认存在本机 IndexedDB；登录云同步后会跨设备。导出文档时仍会转成内嵌图片，单文件可离线查看。</div>' +
      '</div></div>';
  }
  function textToMathML(text) {
    var s = String(text == null ? '' : text);
    var out = '', last = 0, m;
    var re = /\$\$([\s\S]*?)\$\$|\$([^$]*?)\$/g;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index)).replace(/\n/g, '<br>');
      var display = m[1] != null;
      var tex = display ? m[1] : m[2];
      try {
        out += katex.renderToString(tex, { output: 'mathml', displayMode: display, throwOnError: false, strict: false });
      } catch (e) {
        out += '<code>' + esc(tex) + '</code>';
      }
      last = re.lastIndex;
    }
    out += esc(s.slice(last)).replace(/\n/g, '<br>');
    return out;
  }
  function thoughtOf(q) {
    var s = String(q.solution || '');
    var parts = s.split(/\n\s*\n/).filter(function (x) { return x.trim(); });
    var t = parts.slice(0, 2).join('\n');
    if (t.length > 560) t = t.slice(0, 560) + '…';
    return t;
  }
  async function buildExportDoc(qs, opts) {
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var traces = opts.images ? (opts._traces || await getTracesFor(qs.map(function (q) { return q.id; }))) : {};
    var fig = qs.some(function (q) { return q.body.indexOf('[[FIG1_4]]') >= 0; }) ? await fetchDataURL('assets/img/fig-1-4.png') : '';
    var cstat = {};
    qs.forEach(function (q) {
      var c = CMAP[q.cluster];
      var key = c ? c.name : '未分类';
      cstat[key] = (cstat[key] || 0) + 1;
    });
    var summaryLine = Object.keys(cstat).sort(function (a, b) { return cstat[b] - cstat[a]; })
      .map(function (k) { return esc(k) + ' ×' + cstat[k]; }).join(' · ');
    var cards = qs.map(function (q, i) {
      var p = getP(q.id);
      var c = CMAP[q.cluster];
      var images = traces[q.id] || [];
      var body = String(q.body || '').replace(/\[\[FIG1_4\]\]/g, '@@FIG@@');
      var bodyHTML = textToMathML(body);
      bodyHTML = bodyHTML.replace('@@FIG@@', fig ? '<figure class="doc-fig"><img src="' + fig + '" alt="图 1-4"><figcaption>图 1-4</figcaption></figure>' : '<p class="muted">［图 1-4 见教材］</p>');
      var refs = (q.refs || []).map(function (id) {
        var r = REFS[id]; if (!r) return '';
        return '<div class="doc-ref"><b>' + esc(r.label) + '</b><div>' + textToMathML(r.text) + '</div></div>';
      }).join('');
      var key = '';
      if (c) {
        key = '<div class="doc-key"><div class="doc-key-title">关键步骤 · ' + esc(c.name) + '</div>' +
          '<p>' + textToMathML(c.summary) + '</p>' +
          '<ol>' + (c.template || []).map(function (x) { return '<li>' + textToMathML(x) + '</li>'; }).join('') + '</ol></div>';
      }
      var thought = thoughtOf(q);
      var note = p.note ? '<div class="doc-block"><h4>我的文字痕迹 / 笔记</h4><div>' + textToMathML(p.note) + '</div></div>' : '';
      var traceImgs = '';
      if (opts.images && images.length) {
        traceImgs = '<div class="doc-block"><h4>我的图片痕迹（' + images.length + ' 张）</h4><div class="doc-imgs">' +
          images.map(function (it, idx) { return '<figure><img src="' + it.data + '" alt="作答图片 ' + (idx + 1) + '"><figcaption>图片 ' + (idx + 1) + '</figcaption></figure>'; }).join('') +
          '</div></div>';
      }
      var full = opts.full && q.solution ? '<details class="doc-full" open><summary>完整解析</summary><div>' + textToMathML(q.solution) + '</div></details>' : '';
      var review = getReview(q.id);
      return '<article class="doc-card">' +
        '<div class="doc-index">' + (i + 1) + '</div>' +
        '<div class="doc-top"><span class="doc-id">' + q.id + '</span><span class="doc-meta">' + esc(q.chapterTitle) + ' · ' + esc(q.source) + ' 第 ' + q.number + ' 题</span>' +
          (p.inWrongBook ? '<span class="doc-tag red">错题</span>' : '') + (p.flagged ? '<span class="doc-tag amber">标记</span>' : '') +
          '<span class="doc-tag">' + esc(q.type) + '</span><span class="doc-tag">' + complexityLabel(q.complexity) + '</span></div>' +
        '<div class="doc-body">' + bodyHTML + '</div>' + refs +
        (key ? '<div class="doc-block doc-key-wrap">' + key + '</div>' : '') +
        '<div class="doc-block"><h4>本题思路</h4><div>' + textToMathML(thought) + '</div></div>' +
        (q.answer ? '<div class="doc-answer"><b>答案</b><div>' + textToMathML(q.answer) + '</div></div>' : '') +
        note + traceImgs + full +
        '<div class="doc-foot">最近练习：' + (p.lastAt ? fmtDate(p.lastAt) : '—') + ' · 复习：' + reviewStageText(review) + '</div>' +
      '</article>';
    }).join('');
    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>数分错题复习 · ' + dateStr + '</title><style>' +
      'body{margin:0;background:#f6f2e9;color:#20242a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.85;font-size:17px}' +
      '.wrap{max-width:820px;margin:0 auto;padding:20px 16px 50px}' +
      'header.doc-head{background:#fffdf8;border:1px solid #e4ddce;border-radius:14px;padding:20px;margin-bottom:16px}' +
      'header.doc-head h1{font-family:Georgia,"Songti SC",serif;font-size:27px;margin:0 0 5px}' +
      'header.doc-head p{margin:2px 0;color:#727a84;font-size:13px}' +
      '.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}' +
      '.toolbar button,.toolbar a{border:1px solid #d3c9b5;background:#fffdf8;color:#20242a;border-radius:8px;padding:7px 12px;font-size:13px;text-decoration:none;cursor:pointer}' +
      '.stat{display:flex;gap:22px;flex-wrap:wrap;margin-top:14px}.stat b{font-family:Georgia,serif;font-size:23px;margin-right:3px}' +
      '.doc-card{background:#fffdf8;border:1px solid #e4ddce;border-radius:12px;padding:16px 18px;margin:14px 0;break-inside:avoid}' +
      '.doc-index{display:inline-grid;place-items:center;width:27px;height:27px;border-radius:8px;background:#e8eff7;color:#2f5d8a;font-weight:700;font-size:13px;margin-right:7px}' +
      '.doc-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:#727a84}' +
      '.doc-id{font-family:monospace;color:#2f5d8a;font-weight:700}' +
      '.doc-tag{display:inline-block;border:1px solid #e4ddce;background:#faf7ef;border-radius:5px;padding:0 6px;font-size:11px;color:#727a84}' +
      '.doc-tag.red{color:#b23b3b;background:#f9e9e7;border-color:transparent}.doc-tag.amber{color:#9a6a16;background:#fbf1dc;border-color:transparent}' +
      '.doc-body{font-size:17px}.doc-body br{line-height:2}' +
      'math{font-family:"Cambria Math","STIX Two Math","Latin Modern Math",serif;font-size:1.05em}' +
      'math[display="block"]{display:block;text-align:center;margin:8px auto;max-width:100%;overflow-x:auto}' +
      '.doc-fig{margin:10px 0;text-align:center}.doc-fig img{max-width:100%;border:1px solid #e4ddce;border-radius:6px}.doc-fig figcaption{font-size:11px;color:#727a84}' +
      '.doc-ref{margin-top:10px;border-left:3px solid #b4552d;background:#fdf6f1;border-radius:6px;padding:7px 10px;font-size:14px}' +
      '.doc-ref b{display:block;color:#b4552d;font-size:11px;letter-spacing:.06em;margin-bottom:2px}' +
      '.doc-block{margin-top:13px;border-top:1px dashed #e4ddce;padding-top:9px}' +
      '.doc-block h4{margin:0 0 4px;font-size:12px;letter-spacing:.08em;color:#2f5d8a}' +
      '.doc-key{background:#f5f8fc;border:1px solid #dce7f3;border-radius:8px;padding:10px 12px}' +
      '.doc-key-title{font-weight:700;color:#2f5d8a;font-size:13px;margin-bottom:4px}' +
      '.doc-key p{margin:0 0 6px;font-size:14px;color:#3c434c}' +
      '.doc-key ol{margin:4px 0 0;padding-left:20px;color:#3c434c;font-size:14px}.doc-key li{margin:4px 0}' +
      '.doc-answer{display:flex;gap:8px;background:#edf4fb;border-radius:7px;padding:8px 10px;margin-top:12px;font-size:15px}' +
      '.doc-answer b{color:#2f5d8a;flex:none;font-size:11px;letter-spacing:.08em;padding-top:2px}' +
      '.doc-full{margin-top:12px;border:1px solid #e4ddce;border-radius:8px;padding:8px 12px;background:#fcfaf5}' +
      '.doc-full summary{cursor:pointer;color:#2f5d8a;font-size:12px;font-weight:700}' +
      '.doc-full div{margin-top:8px;font-size:15px;color:#3c434c}' +
      '.doc-imgs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}' +
      '.doc-imgs figure{margin:0;border:1px solid #e4ddce;border-radius:7px;overflow:hidden;background:#faf7ef}' +
      '.doc-imgs img{width:100%;display:block}.doc-imgs figcaption{font-size:10px;color:#727a84;text-align:center;padding:2px}' +
      '.doc-foot{margin-top:12px;font-size:11px;color:#a0a7b0;border-top:1px solid #e4ddce;padding-top:7px}' +
      '.doc-summary{background:#fffdf8;border:1px solid #e4ddce;border-radius:10px;padding:10px 14px;margin:0 0 14px;font-size:13px;color:#3c434c}' +
      '.doc-summary b{display:block;color:#2f5d8a;font-size:11px;letter-spacing:.08em;margin-bottom:3px}.doc-summary p{margin:0;line-height:1.8}' +
      '.doc-end{text-align:center;color:#a0a7b0;font-size:11px;margin:24px 0}' +
      '@media(max-width:600px){body{font-size:16px}.wrap{padding:12px 10px 36px}.doc-card{padding:13px 13px}.doc-head h1{font-size:22px}.doc-imgs{grid-template-columns:1fr}.doc-body{font-size:16px}}' +
      '@media print{body{background:#fff}.toolbar{display:none}.wrap{max-width:none;padding:0}.doc-card{border:0;border-bottom:1px solid #ddd;border-radius:0;padding:10px 0}}' +
      '</style></head><body><div class="wrap">' +
      '<header class="doc-head"><h1>数学分析 · 近期错题复习</h1>' +
        '<p>华东师大《数学分析》第六版上册 · ' + chapterRange() + ' · 导出于 ' + dateStr + '</p>' +
        '<p>范围：' + (opts.range === 'all' ? '全部错题' : '最近 ' + opts.range + ' 天') + (opts.marked ? ' · 含标记题' : '') + '</p>' +
        '<div class="stat"><span><b>' + qs.length + '</b>道题</span><span><b>' + Object.keys(qs.reduce(function (m, q) { m[q.cluster] = 1; return m; }, {})).length + '</b>个题型</span><span><b>' + qs.filter(function (q) { return getP(q.id).inWrongBook; }).length + '</b>道错题</span></div>' +
        '<div class="toolbar"><button onclick="window.print()">打印 / 存为 PDF</button><a href="https://lucy2025-creator.github.io/math-analysis-quiz/">回到在线题库</a></div>' +
      '</header><div class="doc-summary"><b>题型分布</b><p>' + summaryLine + '</p></div>' + cards +
      '<div class="doc-end">共 ' + qs.length + ' 题 · 数分刷题 · 仅供个人学习</div>' +
      '</div></body></html>';
  }
  async function generateExport() {
    var opts = readExportOptions();
    var qs = exportCandidates(opts);
    if (!qs.length) { toast('这个范围内没有错题，换个时间范围或章节试试'); return; }
    var btn = document.querySelector('[data-action="generate-export"]');
    if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
    try {
      if (opts.images) {
        var traces = await getTracesFor(qs.map(function (q) { return q.id; }));
        for (var qid in traces) {
          traces[qid] = (await Promise.all(traces[qid].map(async function (it) {
            try { return { data: await blobToDataURL(it.blob), name: it.name }; }
            catch (e) { return null; }
          }))).filter(Boolean);
        }
        opts._traces = traces;
      }
      var html = await buildExportDoc(qs, opts);
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '数分错题复习-' + todayKey() + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast('已生成，正在下载：' + qs.length + ' 题');
    } catch (e) {
      console.error(e);
      toast('生成失败：' + (e.message || '请重试'));
    } finally {
      if (btn) { btn.disabled = false; updateExportPreview(); }
    }
  }

  /* ---------------- views: account / cloud sync ---------------- */
  function viewAccount() {
    var head = '<div class="page-head"><div><h1>账号与云同步</h1><div class="sub">登录后，做题进度、错题、笔记和作答图片会在手机/电脑之间同步。</div></div></div>';
    if (!cloudConfigured()) {
      return head + '<div class="card card-pad" style="max-width:760px">' +
        '<h3 style="font-size:18px;margin-bottom:6px">先配置 Supabase</h3>' +
        '<p class="small muted">云同步使用 Supabase（免费额度足够个人用）。它负责账号、数据库和图片存储；GitHub Pages 仍然只放前端页面。</p>' +
        '<ol class="small" style="line-height:2;padding-left:20px;margin:12px 0;color:var(--ink-2)">' +
          '<li>打开 <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>，新建一个免费项目。</li>' +
          '<li>进入 SQL Editor，运行仓库里的 <a href="supabase/schema.sql" target="_blank">supabase/schema.sql</a>（整段复制运行一次）。</li>' +
          '<li>Project Settings → API，复制 <b>Project URL</b> 和 <b>anon public</b> key。</li>' +
          '<li>填到下面并保存。不要填 service_role key。</li>' +
        '</ol>' +
        '<form data-supabase-config class="cloud-config-form">' +
          '<label class="field-label">Project URL</label><input class="input" name="url" placeholder="https://xxxx.supabase.co" value="' + esc(CLOUD_CFG.url || '') + '" required>' +
          '<label class="field-label">anon public key</label><input class="input" name="anonKey" placeholder="eyJhbGciOi..." value="' + esc(CLOUD_CFG.anonKey || '') + '" required>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn primary" type="submit">保存配置并重载</button><a class="btn" href="https://supabase.com/dashboard" target="_blank" rel="noopener">打开 Supabase</a></div>' +
        '</form>' +
        '<div class="export-tip" style="margin-top:14px">anon key 是公开的，受数据库 RLS 保护；每个用户只能读写自己的数据。图片存在私有 Storage 桶里，不会公开。</div>' +
      '</div>';
    }
    if (!CLOUD_SB) {
      return head + '<div class="empty"><div class="big">!</div><h3>Supabase SDK 没有加载</h3><p>请检查 assets/vendor/supabase/supabase.js 是否存在，然后刷新页面。</p></div>';
    }
    if (!CLOUD_USER) {
      return head + '<div class="account-grid"><div class="card card-pad">' +
        '<h3 style="font-size:18px;margin-bottom:10px">登录</h3>' +
        '<p class="small muted">用邮箱和密码登录后，自动开始云同步。</p>' +
        '<form data-auth-form="login" class="auth-form"><label class="field-label">邮箱</label><input class="input" type="email" name="email" autocomplete="email" required>' +
          '<label class="field-label">密码</label><input class="input" type="password" name="password" autocomplete="current-password" required>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn primary" type="submit">登录</button><button class="btn" type="button" data-auth-reset>忘记密码</button></div></form></div>' +
        '<div class="card card-pad"><h3 style="font-size:18px;margin-bottom:10px">注册新账号</h3>' +
        '<p class="small muted">建议用常用邮箱。若 Supabase 开启了邮箱确认，需要先点邮件里的链接。</p>' +
        '<form data-auth-form="signup" class="auth-form"><label class="field-label">昵称（可选）</label><input class="input" name="name" autocomplete="nickname">' +
          '<label class="field-label">邮箱</label><input class="input" type="email" name="email" autocomplete="email" required>' +
          '<label class="field-label">密码（至少 6 位）</label><input class="input" type="password" name="password" autocomplete="new-password" minlength="6" required>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn primary" type="submit">注册</button></div></form></div></div><div class="auth-msg" id="authMsg" style="max-width:760px"></div>';
    }
    var email = CLOUD_USER.email || '';
    var last = CLOUD.lastSyncAt ? fmtDate(CLOUD.lastSyncAt) : '还没同步过';
    return head + '<div class="account-grid"><div class="card card-pad">' +
      '<div class="account-badge">已登录</div><h3 style="font-size:20px;margin:6px 0 2px">' + esc(email) + '</h3>' +
      '<p class="small muted">账号 ID：' + esc(CLOUD_USER.id.slice(0, 8)) + '…</p>' +
      '<div class="cloud-stat-grid"><div><b>' + last + '</b><span>上次同步</span></div><div><b>' + (CLOUD.pending ? '待补传' : (CLOUD.lastSyncAt ? '已同步' : '未同步')) + '</b><span>状态</span></div><div><b>' + Object.keys(state.progress).length + '</b><span>本机练过</span></div></div>' +
      '<p class="small muted" style="margin-top:10px">联网时自动实时同步；断网期间改动会先留在本机，恢复网络后自动补传。</p>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn primary" data-cloud-action="sync">立即同步</button><button class="btn" data-cloud-action="logout">退出登录</button></div>' +
    '</div><div class="card card-pad"><h3 style="font-size:17px;margin-bottom:6px">冲突与恢复</h3>' +
      '<p class="small muted">默认按每道题的更新时间合并，不会整份覆盖。换设备或想强制对齐时，用下面两个按钮：</p>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn" data-cloud-action="force-pull">用云端覆盖本机</button><button class="btn" data-cloud-action="force-push">用本机覆盖云端</button></div>' +
      '<div class="export-tip" style="margin-top:12px">当前浏览器会绑定这个云账号，避免把 A 的进度传到 B。要换账号，请先导出数据、退出登录，再在设置里清空本地记录。</div>' +
    '</div></div>';
  }

  function setAuthMsg(text, kind) {
    var el = document.getElementById('authMsg');
    if (!el) { toast(text); return; }
    el.textContent = text;
    el.className = 'auth-msg' + (kind ? ' ' + kind : '');
  }
  function saveCloudConfig(form) {
    var url = String(form.url.value || '').trim().replace(/\/+$/, '');
    var key = String(form.anonKey.value || '').trim();
    if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) { toast('Project URL 格式不对，应类似 https://xxxx.supabase.co'); return; }
    if (key.length < 20) { toast('anon key 看起来不完整'); return; }
    try {
      localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify({ url: url, anonKey: key }));
      toast('配置已保存，正在重载…');
      setTimeout(function () { location.reload(); }, 450);
    } catch (e) { toast('保存配置失败'); }
  }
  async function handleAuth(form, mode) {
    if (!CLOUD_SB) { toast('云同步还没配置'); return; }
    var emailEl = form.querySelector('[name="email"]');
    var passEl = form.querySelector('[name="password"]');
    var email = String(emailEl ? emailEl.value : '').trim();
    var password = String(passEl ? passEl.value : '');
    if (!email || !password) { setAuthMsg('请填写邮箱和密码', 'err'); return; }
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.dataset.old = btn.textContent; btn.textContent = '处理中…'; }
    setAuthMsg(mode === 'login' ? '正在登录…' : '正在注册…', '');
    try {
      if (mode === 'login') {
        var r = await CLOUD_SB.auth.signInWithPassword({ email: email, password: password });
        if (r.error) throw r.error;
        setAuthMsg('登录成功，正在同步…', 'ok');
      } else {
        var nameEl = form.querySelector('[name="name"]');
        var name = nameEl ? String(nameEl.value || '').trim() : '';
        var s = await CLOUD_SB.auth.signUp({
          email: email, password: password,
          options: { data: { display_name: name || email.split('@')[0] }, emailRedirectTo: cloudBaseUrl() }
        });
        if (s.error) throw s.error;
        if (s.data && s.data.session) setAuthMsg('注册成功，正在登录…', 'ok');
        else setAuthMsg('注册成功。请到邮箱点确认链接，然后再回来登录。', 'ok');
      }
    } catch (e) {
      setAuthMsg(cloudErrorText(e), 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.old || (mode === 'login' ? '登录' : '注册'); }
    }
  }
  async function handleCloudAction(action) {
    if (action === 'logout') {
      if (!CLOUD_SB) return;
      await CLOUD_SB.auth.signOut();
      stopCloudRealtime();
      CLOUD_USER = null;
      updateAccountTop();
      toast('已退出云同步；本机记录仍然保留');
      render();
      return;
    }
    if (!CLOUD_USER) { toast('请先登录'); return; }
    if (action === 'sync') {
      toast('正在同步…');
      await cloudSyncAll();
      toast(CLOUD.pending ? '还有改动待补传，稍后会自动重试' : '云同步完成');
      return;
    }
    if (action === 'force-pull') {
      if (!confirm('用云端进度覆盖本机？本机尚未同步的改动会丢失。')) return;
      toast('正在从云端恢复…');
      await cloudSyncAll({ forcePull: true });
      toast(CLOUD.pending ? '同步未完成，请检查网络后重试' : '已用云端进度覆盖本机');
      return;
    }
    if (action === 'force-push') {
      if (!confirm('用本机进度覆盖云端？其他设备未同步的改动会丢失。')) return;
      toast('正在上传本机进度…');
      await cloudSyncAll({ forcePush: true });
      toast(CLOUD.pending ? '同步未完成，请检查网络后重试' : '已用本机进度覆盖云端');
    }
  }

  /* ---------------- views: settings ---------------- */
  function viewSettings() {
    var size = 0;
    try { size = new Blob([JSON.stringify(state)]).size; } catch (e) { size = 0; }
    return '<div class="page-head"><div><h1>设置</h1><div class="sub">外观、作答偏好与本地数据。</div></div></div>' +
      '<div class="settings-grid">' +
        '<div class="card card-pad"><h3 style="font-size:17px;margin-bottom:6px">外观</h3>' +
          '<div class="set-row"><div class="lbl"><b>主题</b><span>自动跟随系统，或固定浅色/深色</span></div>' +
            '<select id="setTheme"><option value="auto"' + (state.settings.theme === 'auto' ? ' selected' : '') + '>跟随系统</option><option value="light"' + (state.settings.theme === 'light' ? ' selected' : '') + '>浅色</option><option value="dark"' + (state.settings.theme === 'dark' ? ' selected' : '') + '>深色</option></select></div>' +
          '<div class="set-row"><div class="lbl"><b>题目字号</b><span>题干的显示大小</span></div>' +
            '<select id="setFont"><option value="sm"' + (state.settings.font === 'sm' ? ' selected' : '') + '>小</option><option value="md"' + (state.settings.font === 'md' ? ' selected' : '') + '>标准</option><option value="lg"' + (state.settings.font === 'lg' ? ' selected' : '') + '>大</option></select></div>' +
        '</div>' +
        '<div class="card card-pad"><h3 style="font-size:17px;margin-bottom:6px">作答</h3>' +
          '<div class="set-row"><div class="lbl"><b>作答后自动展开解析</b><span>自评“做对/做错”后立即显示解析</span></div><label class="checkline"><input type="checkbox" id="setAutoReveal"' + (state.settings.autoReveal ? ' checked' : '') + '><span></span></label></div>' +
          '<div class="set-row"><div class="lbl"><b>交卷前确认</b><span>还有未作答题时二次确认</span></div><label class="checkline"><input type="checkbox" id="setConfirmSubmit"' + (state.settings.confirmSubmit ? ' checked' : '') + '></label></div>' +
          '<div class="set-row"><div class="lbl"><b>快捷键</b><span>单题模式：←/→ 切题，空格展开解析，1 做对，2 做错，Z 放大，F 标记</span></div></div>' +
        '</div>' +
        '<div class="card card-pad"><h3 style="font-size:17px;margin-bottom:6px">数据</h3>' +
          '<p class="small muted">记录保存在浏览器 localStorage 中（当前约 ' + (size / 1024).toFixed(1) + ' KB）。换设备或清缓存前请先导出。</p>' +
          '<div class="btn-row" style="margin-top:12px"><a class="btn" href="#/export">导出错题文档</a><button class="btn" data-action="export-data">导出备份</button>' +
            '<button class="btn" data-action="import-data">导入备份</button>' +
            '<button class="btn" data-action="print-all">打印题库</button></div>' +
          '<p class="small muted" style="margin-top:9px">图片作答痕迹保存在 IndexedDB，登录后会同步到云端；导出错题文档时也会内嵌。JSON 备份只含文字与进度。</p>' +
          '<input type="file" id="importFile" accept="application/json,.json" class="hide">' +
        '</div>' +
        '<div class="card card-pad"><h3 style="font-size:17px;margin-bottom:6px">云同步</h3>' +
          '<p class="small muted">' + (cloudConfigured()
            ? (CLOUD_USER ? '已登录：' + esc(CLOUD_USER.email || '') + ' · ' + (CLOUD.pending ? '有待补传改动' : '自动同步已开启') : 'Supabase 已配置，登录后即可同步。')
            : '还没有配置 Supabase；配置后可在手机和电脑之间同步进度与图片。') + '</p>' +
          '<div class="btn-row" style="margin-top:12px"><a class="btn primary" href="#/account">打开账号与云同步</a></div>' +
        '</div>' +
        '<div class="card card-pad danger-zone"><h3 style="font-size:17px;margin-bottom:6px;color:var(--red)">危险操作</h3>' +
          '<p class="small muted">清空所有练习记录、错题、收藏和笔记，不可恢复。</p>' +
          '<div class="btn-row" style="margin-top:12px"><button class="btn danger" data-action="reset-data">清空全部记录</button></div>' +
        '</div>' +
      '</div>' +
      '<p class="tiny faint" style="margin-top:20px">题目文字取自教材 OCR，已人工校订；若发现公式错漏，可在题目笔记中标记。解析为学习参考，证明题建议先独立完成再对照。</p>';
  }

  /* ---------------- view: question detail ---------------- */
  function viewDetail(route) {
    var q = QMAP[route.param];
    if (!q) return '<div class="empty"><h3>没有找到这道题</h3><p>题号可能写错了。</p><a class="btn" href="#/bank">返回题库</a></div>';
    var p = getP(q.id);
    var r = getReview(q.id);
    var cl = CMAP[q.cluster];
    var idx = QS.indexOf(q);
    var prev = QS[idx - 1], next = QS[idx + 1];
    return '<div class="page-head"><div><h1 style="font-size:24px">' + q.id + ' <span style="font-family:var(--sans);font-size:14px;color:var(--muted);font-weight:400">' + esc(q.source) + ' 第 ' + q.number + ' 题</span></h1>' +
      '<div class="sub">' + esc(q.chapterTitle) + ' · ' + esc(q.sectionTitle) + ' · ' + esc(q.type) + '</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="start-one" data-qid="' + q.id + '">单题练习</button>' +
      '<button class="btn" data-action="zoom" data-qid="' + q.id + '">⤢ 放大</button>' +
      '<button class="btn" data-action="flag" data-qid="' + q.id + '">' + (p.flagged ? '⚑ 已标记' : '⚐ 标记') + '</button>' +
      '<button class="btn" data-action="fav" data-qid="' + q.id + '">' + (p.favorite ? '★ 已收藏' : '☆ 收藏') + '</button>' +
      '<button class="btn" data-action="toggle-wrong" data-qid="' + q.id + '">' + (p.inWrongBook ? '移出错题本' : '加入错题本') + '</button></div></div>' +
      '<div class="detail-grid"><div>' +
        '<article class="q-card" style="margin:0">' +
          '<div class="q-body">' + bodyHTML(q) + '</div>' + refBlock(q) +
          (q.hint ? '<div class="q-hint"><b>提示</b> ' + esc(q.hint) + '</div>' : '') +
          renderSolution(q) + noteBlock(q) + traceBlock(q) +
        '</article>' +
        '<div class="single-nav no-print"><a class="btn sm" href="#/q/' + (prev ? prev.id : q.id) + '">← 上一题</a>' +
          '<span class="small muted">' + (idx + 1) + ' / ' + QS.length + '</span>' +
          '<a class="btn sm" href="#/q/' + (next ? next.id : q.id) + '">下一题 →</a></div>' +
      '</div><aside class="detail-side">' +
        '<div class="side-card"><h4>题目信息</h4><dl><dt>题号</dt><dd>' + q.id + '</dd><dt>来源</dt><dd>' + esc(q.source) + ' 第 ' + q.number + ' 题</dd><dt>类型</dt><dd>' + esc(q.type) + '</dd>' +
          '<dt>难度</dt><dd>' + '●'.repeat(q.difficulty) + '○'.repeat(3 - q.difficulty) + '</dd><dt>复杂度</dt><dd>' + complexityLabel(q.complexity) + '</dd><dt>练习</dt><dd>' + (p.attempts ? '练过 ' + p.attempts + ' 次 · 对 ' + (p.correct || 0) + ' / 错 ' + (p.wrong || 0) : '还没练过') + '</dd></dl></div>' +
        '<div class="side-card"><h4>记忆训练</h4><dl><dt>状态</dt><dd>' + reviewStageText(r) + '</dd><dt>下次复习</dt><dd>' + nextReviewText(r) + '</dd></dl>' +
          (r && (r.stage || 0) < 7 ? '<button class="btn sm" style="margin-top:9px" data-action="start-one" data-qid="' + q.id + '">复习本题</button>' : '') + '</div>' +
        (cl ? '<div class="side-card"><h4>题型</h4><div class="small" style="font-weight:600">' + esc(cl.name) + '</div><div class="tiny muted" style="margin-top:3px">代表题 <a href="#/q/' + cl.rep + '">' + cl.rep + '</a></div></div>' : '') +
        '<div class="side-card"><h4>知识点</h4><div style="display:flex;gap:4px;flex-wrap:wrap">' + q.tags.map(function (t) { return '<span class="tag accent">' + esc(t) + '</span>'; }).join('') + '</div></div>' +
        '<div class="side-card"><h4>提示</h4><p class="small muted" style="margin:0">自评“做对了”会把题移出错题本；顶部按钮只改状态，不计入练习次数。</p></div>' +
      '</aside></div>';
  }

  /* ---------------- session ---------------- */
  function sessionCounts() {
    if (!S) return { correct: 0, wrong: 0, graded: 0, total: 0 };
    var c = 0, w = 0;
    Object.keys(S.results || {}).forEach(function (id) {
      var st = S.results[id].status;
      if (st === 'correct') c++;
      else if (st === 'wrong') w++;
    });
    return { correct: c, wrong: w, graded: c + w, total: S.qids.length };
  }
  function startSession(qids, opts) {
    opts = opts || {};
    if (!qids.length) { toast('没有可练的题目'); return; }
    if (S && !S.finished && S.qids && S.qids.length) {
      if (!confirm('当前还有一场练习没结束，开始新的会覆盖它。继续？')) return;
    }
    S = {
      id: 's' + uid(), qids: qids.slice(), display: opts.display || 'single', index: 0,
      results: {}, revealed: {}, startedAt: Date.now(), title: opts.title || '练习',
      scope: opts.scope || '', review: !!opts.review, finished: false
    };
    saveSession();
    navigate('#/session');
  }
  function startOne(qid) {
    var q = QMAP[qid];
    if (!q) return;
    startSession([qid], { title: q.source + ' 第 ' + q.number + ' 题', display: 'single', scope: q.id });
  }
  function sessionQuestions() {
    if (!S) return [];
    return S.qids.map(function (id) { return QMAP[id]; }).filter(Boolean);
  }
  function viewSession() {
    if (!S || S.finished) { navigate('#/home'); return ''; }
    var qs = sessionQuestions();
    if (!qs.length) { navigate('#/home'); return ''; }
    S.index = clamp(S.index || 0, 0, qs.length - 1);
    var counts = sessionCounts();
    var pct = Math.round(counts.graded * 100 / counts.total);
    var single = S.display === 'single';
    var list = single ? [qs[S.index]] : qs;
    var cards = list.map(function (q) {
      var idx = S.qids.indexOf(q.id) + 1;
      return qCard(q, idx - 1, { num: idx, note: true });
    }).join('');
    var pager = '';
    if (single) {
      var start = Math.max(0, S.index - 4), end = Math.min(qs.length, start + 9);
      start = Math.max(0, end - 9);
      var btns = '';
      for (var i = start; i < end; i++) {
        var q = qs[i], st = S.results[q.id] ? S.results[q.id].status : '';
        btns += '<button class="' + (i === S.index ? 'active' : '') + ' ' + (st === 'correct' ? 'ok' : st === 'wrong' ? 'no' : '') + '" data-action="goto" data-index="' + i + '">' + (i + 1) + '</button>';
      }
      pager = '<div class="single-nav no-print">' +
        '<button class="btn sm" data-action="prev"' + (S.index === 0 ? ' disabled' : '') + '>← 上一题</button>' +
        '<div class="pager">' + btns + '</div>' +
        '<button class="btn sm" data-action="next"' + (S.index === qs.length - 1 ? ' disabled' : '') + '>下一题 →</button></div>' +
        '<div class="center small muted" style="margin-top:8px">第 ' + (S.index + 1) + ' / ' + qs.length + ' 题</div>';
    }
    return '<div class="sessionbar">' +
      '<button class="btn sm ghost" data-action="exit-session" title="退出">← 退出</button>' +
      '<span class="title">' + esc(S.title) + '</span>' +
      (S.review ? '<span class="tag green">复习</span>' : '') +
      '<span class="progress-text" id="sessProgressText">' + counts.graded + ' / ' + counts.total + '</span>' +
      '<div class="bar"><i id="sessBar" style="width:' + pct + '%"></i></div>' +
      '<span class="clock" id="clock">' + fmtDuration(Date.now() - S.startedAt) + '</span>' +
      '<button class="btn sm" data-action="toggle-display">' + (single ? '整卷' : '单题') + '</button>' +
      (single && !S.review ? '<button class="btn sm" data-action="swap">换一题</button>' : '') +
      (single ? '' : '<button class="btn sm" data-action="sheet-open">答题卡</button>') +
      '<button class="btn sm primary" data-action="submit">交卷</button>' +
    '</div>' +
    '<div class="' + (single ? 'single-wrap' : '') + '"><div class="q-list">' + cards + '</div>' + pager +
      '<div class="center" style="margin-top:18px"><button class="btn sm ghost no-print" data-action="submit">结束并交卷</button></div>' +
    '</div>';
  }
  function updateSessionProgress() {
    if (!S) return;
    var c = sessionCounts();
    var pct = Math.round(c.graded * 100 / c.total);
    var t = document.getElementById('sessProgressText');
    var b = document.getElementById('sessBar');
    if (t) t.textContent = c.graded + ' / ' + c.total;
    if (b) b.style.width = pct + '%';
    $$('.sheet-grid button[data-index], .pager button[data-index]').forEach(function (btn) {
      var idx = parseInt(btn.dataset.index, 10);
      var q = S.qids[idx];
      var st = S.results[q] ? S.results[q].status : '';
      btn.classList.toggle('ok', st === 'correct');
      btn.classList.toggle('no', st === 'wrong');
      if (btn.closest('.sheet-grid')) btn.classList.toggle('cur', idx === S.index);
    });
  }
  function setGrade(qid, result) {
    if (!S) return;
    var r = S.results[qid] || {};
    var prev = r.status;
    if (prev === result) return;
    var p = ensureP(qid);
    if (prev) { p.attempts = Math.max(0, p.attempts - 1); p[prev] = Math.max(0, (p[prev] || 0) - 1); }
    p.attempts++;
    p[result] = (p[result] || 0) + 1;
    p.lastResult = result;
    p.lastAt = Date.now();
    p.updatedAt = Date.now();
    if (result === 'wrong') p.inWrongBook = true;
    else p.inWrongBook = false;
    r.status = result;
    r.at = Date.now();
    S.results[qid] = r;
    updateReview(qid, result);
    markCheckin();
    saveState(); saveSession();
    updateGradeUI(qid);
    updateSessionProgress();
    if (result === 'wrong') toast('已记入错题本');
    else if (prev === 'wrong') toast('已移出错题本');
    if (state.settings.autoReveal && !S.revealed[qid]) revealQ(qid, true);
  }
  function updateGradeUI(qid) {
    var card = document.getElementById('q-' + qid);
    if (!card) return;
    var st = S && S.results[qid] ? S.results[qid].status : '';
    card.classList.toggle('graded-correct', st === 'correct');
    card.classList.toggle('graded-wrong', st === 'wrong');
    $$('[data-action="grade"][data-qid="' + qid + '"]', card).forEach(function (b) {
      b.classList.toggle('on-correct', b.dataset.result === 'correct' && st === 'correct');
      b.classList.toggle('on-wrong', b.dataset.result === 'wrong' && st === 'wrong');
    });
    var rt = card.querySelector('[data-review-tag="' + qid + '"]');
    var rr = getReview(qid);
    if (rt && rr) {
      rt.style.display = '';
      rt.textContent = reviewStageText(rr);
      rt.className = 'tag ' + ((rr.stage || 0) >= 7 ? 'green' : 'amber');
    }
  }
  function revealQ(qid, force) {
    var q = QMAP[qid];
    if (!q || !S) return;
    var card = document.getElementById('q-' + qid);
    if (!card) return;
    var existing = card.querySelector('.solution');
    var btn = card.querySelector('[data-action="reveal"]');
    if (existing && !force) {
      existing.remove();
      S.revealed[qid] = false;
      if (btn) btn.textContent = '查看解析';
      saveSession();
      return;
    }
    if (!existing) {
      var wrap = document.createElement('div');
      wrap.innerHTML = renderSolution(q);
      var sec = wrap.firstElementChild;
      var foot = card.querySelector('.q-foot');
      if (foot && foot.nextSibling) card.insertBefore(sec, foot.nextSibling);
      else card.appendChild(sec);
      renderMath(sec);
    }
    S.revealed[qid] = true;
    if (btn) btn.textContent = '收起解析';
    saveSession();
  }
  function submitSession() {
    if (!S) return;
    var c = sessionCounts();
    if (c.graded < c.total && state.settings.confirmSubmit) {
      if (!confirm('还有 ' + (c.total - c.graded) + ' 题未作答，确定交卷？')) return;
    }
    var rec = {
      id: S.id, at: Date.now(), title: S.title, total: c.total, correct: c.correct,
      wrong: c.wrong, unanswered: c.total - c.graded, duration: Date.now() - S.startedAt,
      scope: S.scope, qids: S.qids.slice(), results: S.results
    };
    state.sessions.unshift(rec);
    if (state.sessions.length > 80) state.sessions.length = 80;
    if (c.graded > 0) markCheckin();
    saveState();
    S.finished = true;
    saveSession();
    navigate('#/result/' + rec.id);
  }
  function exitSession() {
    if (!S) { navigate('#/home'); return; }
    if (!confirm('退出练习？已作答的记录会保留，可以稍后继续。')) return;
    navigate('#/home');
  }
  function swapQuestion() {
    if (!S || S.display !== 'single' || S.review) return;
    var cur = S.qids[S.index];
    var curQ = QMAP[cur];
    var pool = QS.filter(function (q) {
      return q.id !== cur && S.qids.indexOf(q.id) < 0 && (!curQ || q.chapter === curQ.chapter);
    });
    if (!pool.length) pool = QS.filter(function (q) { return S.qids.indexOf(q.id) < 0; });
    if (!pool.length) { toast('没有可换的题目了'); return; }
    var nq = pool[Math.floor(Math.random() * pool.length)];
    S.qids[S.index] = nq.id;
    delete S.results[cur];
    delete S.revealed[cur];
    saveSession();
    render();
    window.scrollTo(0, 0);
    toast('已换一题：' + nq.id);
  }
  function startReview() {
    var ids = dueReviewIds();
    if (!ids.length) { toast('今天没有到期复习题，先去练几道新题吧'); return; }
    startSession(ids, { title: '今日复习 · ' + ids.length + ' 题（艾宾浩斯）', display: 'single', review: true });
  }

  /* ---------------- result ---------------- */
  function viewResult(route) {
    var rec = state.sessions.find(function (s) { return s.id === route.param; });
    if (!rec) return '<div class="empty"><h3>没有找到这次练习记录</h3><a class="btn" href="#/home">返回首页</a></div>';
    var total = rec.correct + rec.wrong + (rec.unanswered || 0);
    var pct = total ? Math.round(rec.correct * 100 / total) : 0;
    var phrase = pct >= 90 ? '漂亮，这一组基本吃透了。' : pct >= 75 ? '不错，把错题再过一遍就更稳。' : pct >= 50 ? '有收获，也有明显的漏洞，趁热复盘。' : '别急，先把错题对应的定义和定理回看一遍。';
    var r = 54, circ = 2 * Math.PI * r;
    var wrongs = (rec.qids || []).filter(function (id) { return rec.results && rec.results[id] && rec.results[id].status === 'wrong'; });
    var wrongHTML = wrongs.length ? wrongs.map(function (id) {
      var q = QMAP[id]; if (!q) return '';
      return '<div class="bank-row"><div class="bank-id">' + q.id + '</div><div class="bank-main"><a href="#/q/' + q.id + '">' + esc(snippet(q.body, 70)) + '</a><div class="snippet">' + esc(q.source) + ' 第 ' + q.number + ' 题</div></div><div class="bank-actions"><a class="icon-btn" href="#/q/' + q.id + '">›</a></div></div>';
    }).join('') : '<p class="small muted">这一组没有错题。</p>';
    return '<div class="card" style="overflow:hidden"><div class="result-hero">' +
      '<div class="ring"><svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="12"></circle>' +
        '<circle cx="75" cy="75" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ * (1 - pct / 100)) + '"></circle></svg>' +
        '<div class="center"><b>' + pct + '%</b><span>正确率</span></div></div>' +
      '<div class="result-summary"><h1>' + esc(rec.title) + '</h1><p class="phrase">' + phrase + '</p>' +
        '<div class="result-nums"><div><b>' + rec.correct + '</b><span>做对</span></div><div><b>' + rec.wrong + '</b><span>做错</span></div>' +
          '<div><b>' + (rec.unanswered || 0) + '</b><span>未作答</span></div><div><b>' + fmtDuration(rec.duration || 0) + '</b><span>用时</span></div></div>' +
        '<div class="result-actions"><button class="btn primary" data-action="retry-wrong" data-id="' + rec.id + '"' + (wrongs.length ? '' : ' disabled') + '>重练错题（' + wrongs.length + '）</button>' +
          '<button class="btn" data-action="start-setup">再来一组</button><a class="btn ghost" href="#/home">返回首页</a></div>' +
      '</div></div></div>' +
      '<div class="section-title"><h2>本组错题</h2><span class="line"></span></div>' +
      '<div class="bank-list">' + wrongHTML + '</div>' +
      '<div class="section-title"><h2>本组题目</h2><span class="line"></span></div>' +
      '<div class="q-list">' + (rec.qids || []).map(function (id, i) {
        var q = QMAP[id]; if (!q) return '';
        return qCard(q, i, { num: i + 1, grade: false, note: false, alwaysSolution: true });
      }).join('') + '</div>';
  }

  /* ---------------- setup ---------------- */
  var allSections = [];
  (META.chapters || []).forEach(function (c) { c.sections.forEach(function (s) { allSections.push(s); }); });
  var setupState = null;

  function defaultSetup(preset) {
    preset = preset || {};
    var secs = new Set(allSections.map(function (s) { return s.id; }));
    if (preset.chapter) {
      secs = new Set(allSections.filter(function (s) { return s.chapter === preset.chapter; }).map(function (s) { return s.id; }));
    }
    if (preset.section) secs = new Set([preset.section]);
    return {
      sections: secs, mode: preset.mode || 'random', count: preset.count || 10,
      order: 'shuffle', display: preset.display || 'single', custom: new Set(), chapter: preset.chapter || 0,
      difficulty: new Set([1, 2, 3]), complexity: new Set([1, 2, 3]),
      recency: 'all', knowledge: [],
      ratios: { '证明': 40, '计算': 30, '讨论': 10, '辨析': 8, '作图': 6, '解答': 6 }
    };
  }
  function setupFilters(q) {
    var p = setupState;
    if (!p.difficulty.has(q.difficulty)) return false;
    if (!p.complexity.has(q.complexity)) return false;
    var pr = getP(q.id), last = pr.lastAt || 0, now = Date.now();
    if (p.recency === 'never' && pr.attempts) return false;
    if (p.recency === '7d' && !(last && now - last <= 7 * DAY)) return false;
    if (p.recency === '30d' && !(last && now - last > 7 * DAY && now - last <= 30 * DAY)) return false;
    if (p.recency === 'old' && !(last && now - last > 30 * DAY)) return false;
    if (p.knowledge.length) {
      var hay = ((q.knowledge || []).join(' ') + ' ' + q.body + ' ' + q.tags.join(' ')).toLowerCase();
      var hit = p.knowledge.some(function (k) { return hay.indexOf(String(k).toLowerCase()) >= 0; });
      if (!hit) return false;
    }
    return true;
  }
  function orderedBase(arr) {
    var p = setupState;
    if (p.order === 'oldest') return arr.slice().sort(function (a, b) { return (getP(a.id).lastAt || 0) - (getP(b.id).lastAt || 0); });
    if (p.order === 'original') return arr.slice();
    return shuffle(arr);
  }
  function typeCounts(arr) {
    var map = {};
    TYPES.forEach(function (t) { map[t] = 0; });
    arr.forEach(function (q) { if (map[q.type] != null) map[q.type]++; });
    return map;
  }
  function selectByRatio(base, count) {
    var p = setupState;
    var weights = {};
    var sum = 0;
    TYPES.forEach(function (t) {
      weights[t] = Math.max(0, Number(p.ratios[t]) || 0);
      sum += weights[t];
    });
    if (sum <= 0) {
      TYPES.forEach(function (t) { weights[t] = 1; sum += 1; });
    }
    var pools = TYPES.map(function (t) {
      return { t: t, w: weights[t], list: orderedBase(base.filter(function (q) { return q.type === t; })) };
    });
    var desired = pools.map(function (x) { return count * x.w / sum; });
    var alloc = pools.map(function (x, i) { return Math.min(Math.floor(desired[i]), x.list.length); });
    var used = alloc.reduce(function (a, b) { return a + b; }, 0);
    var remaining = Math.min(count, base.length) - used;
    while (remaining > 0) {
      var candidates = pools.map(function (x, i) {
        return { i: i, deficit: desired[i] - alloc[i], cap: x.list.length - alloc[i], w: x.w };
      }).filter(function (c) { return c.cap > 0 && c.w > 0; });
      if (!candidates.length) break;
      candidates.sort(function (a, b) { return b.deficit - a.deficit || b.w - a.w; });
      alloc[candidates[0].i]++;
      remaining--;
    }
    var out = [];
    pools.forEach(function (x, i) { out = out.concat(x.list.slice(0, alloc[i])); });
    return shuffle(out);
  }
  function poolForSetup() {
    var p = setupState;
    if (p.mode === 'custom') {
      return orderedBase(QS.filter(function (q) { return p.custom.has(q.id); }));
    }
    var base = QS.filter(function (q) { return p.sections.has(q.section) && setupFilters(q); });
    if (p.mode === 'wrong') base = base.filter(function (q) { return getP(q.id).inWrongBook; });
    else if (p.mode === 'unseen') base = base.filter(function (q) { return !getP(q.id).attempts; });
    else if (p.mode === 'favorites') base = base.filter(function (q) { return getP(q.id).favorite; });
    else if (p.mode === 'flagged') base = base.filter(function (q) { return getP(q.id).flagged; });
    var n = clamp(parseInt(p.count, 10) || 10, 1, Math.max(1, base.length));
    if (p.mode === 'all') return orderedBase(base);
    if (p.mode === 'ratio') return selectByRatio(base, n);
    return orderedBase(base).slice(0, n);
  }
  function scopeLabel() {
    var n = setupState.sections.size;
    var chs = {};
    allSections.forEach(function (s) { if (setupState.sections.has(s.id)) chs[s.chapter] = true; });
    var chList = Object.keys(chs).map(function (x) { return '第' + x + '章'; }).join('、');
    if (n === allSections.length) return chapterRange() + ' · 全部小节';
    return chList + ' · ' + n + ' 个小节';
  }
  function setupBodyHTML() {
    var p = setupState;
    var scope = (META.chapters || []).map(function (c) {
      var allOn = c.sections.every(function (s) { return p.sections.has(s.id); });
      var someOn = c.sections.some(function (s) { return p.sections.has(s.id); });
      var chips = c.sections.map(function (s) {
        return '<label class="chip ' + (p.sections.has(s.id) ? 'on' : '') + '"><input type="checkbox" data-scope-sec="' + s.id + '"' + (p.sections.has(s.id) ? ' checked' : '') + '>' +
          esc(secLabel(s.id)) + ' <span class="n">' + s.count + '</span></label>';
      }).join('');
      return '<div class="scope-ch"><label class="scope-ch-head"><input type="checkbox" data-scope-ch="' + c.n + '"' + (allOn ? ' checked' : '') + (someOn && !allOn ? ' data-indeterminate="1"' : '') + '>' +
        '<span>' + esc(c.title) + '</span><span class="cnt">' + c.count + ' 题</span></label>' +
        '<div class="scope-secs">' + chips + '</div></div>';
    }).join('');
    var modes = [
      ['random', '⚄', '随机抽题', '从范围里随机取 N 题'],
      ['all', '☰', '全部题目', '范围内所有题'],
      ['wrong', '✕', '只练错题', '错题本中重新练'],
      ['unseen', '○', '只练未做', '跳过做过的题'],
      ['custom', '☑', '自定义勾选', '手动选题并打乱'],
      ['favorites', '★', '只练收藏', '从收藏夹取题'],
      ['flagged', '⚑', '只练标记', '标记过的重点题'],
      ['ratio', '⚖', '按题型比例', '自定计算/证明等比例']
    ].map(function (m) {
      return '<label class="mode ' + (p.mode === m[0] ? 'on' : '') + '"><input type="radio" name="setupMode" value="' + m[0] + '"' + (p.mode === m[0] ? ' checked' : '') + '>' +
        '<span class="mi">' + m[1] + '</span><span><b>' + m[2] + '</b><small>' + m[3] + '</small></span></label>';
    }).join('');
    var showCount = p.mode !== 'all' && p.mode !== 'custom';
    var countBlock = showCount ? '<div class="setup-block"><h4>数量</h4><div class="count-line"><input class="input" type="number" id="setupCount" min="1" max="' + QS.length + '" value="' + p.count + '"> <span class="small muted">题（当前范围最多 ' + QS.filter(function (q) { return p.sections.has(q.section) && setupFilters(q); }).length + ' 题）</span></div>' +
      '<div class="count-presets">' + [5, 10, 20, 30].map(function (n) { return '<button data-count="' + n + '">' + n + '</button>'; }).join('') + '<button data-count="9999">全部</button></div></div>' : '';
    var customBlock = p.mode === 'custom' ? '<div class="setup-block"><h4>自定义题目</h4><button class="btn sm" data-action="pick-open">勾选题目（已选 ' + p.custom.size + ' 题）</button></div>' : '';
    var diffChips = [1, 2, 3].map(function (d) {
      return '<label class="chip ' + (p.difficulty.has(d) ? 'on' : '') + '"><input type="checkbox" data-diff="' + d + '"' + (p.difficulty.has(d) ? ' checked' : '') + '>难度 ' + d + '</label>';
    }).join('');
    var compChips = [1, 2, 3].map(function (d) {
      var label = d === 1 ? '小题' : d === 2 ? '中题' : '大题';
      return '<label class="chip ' + (p.complexity.has(d) ? 'on' : '') + '"><input type="checkbox" data-comp="' + d + '"' + (p.complexity.has(d) ? ' checked' : '') + '>' + label + '</label>';
    }).join('');
    var recencySel = '<select id="setupRecency" aria-label="练习时间筛选">' +
      [['all', '不限时间'], ['never', '从未练过'], ['7d', '最近 7 天'], ['30d', '8–30 天前'], ['old', '30 天以上']].map(function (x) {
        return '<option value="' + x[0] + '"' + (p.recency === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select>';
    var kpSel = p.knowledge.map(function (k) {
      return '<button class="tag accent kp-chip" data-kp-remove="' + esc(k) + '">' + esc(k) + ' ×</button>';
    }).join('');
    var kpSuggest = VOCAB.filter(function (v) { return p.knowledge.indexOf(v.k) < 0; }).slice(0, 12).map(function (v) {
      return '<button class="tag" data-kp-add="' + esc(v.k) + '">＋ ' + esc(v.k) + ' <span class="faint">' + v.n + '</span></button>';
    }).join('');
    var kpDatalist = VOCAB.map(function (v) { return '<option value="' + esc(v.k) + '">' + v.n + ' 题</option>'; }).join('');
    var filterBlock = '<div class="setup-block"><h4>筛选条件 <span class="tiny faint">可叠加</span></h4>' +
      '<div class="filter-grid"><div><label class="filter-label">难度</label><div class="chip-row">' + diffChips + '</div></div>' +
        '<div><label class="filter-label">复杂度</label><div class="chip-row">' + compChips + '</div></div>' +
        '<div><label class="filter-label">练过时间</label>' + recencySel + '</div></div>' +
      '<div class="kp-filter"><label class="filter-label">知识点（命中任一）</label>' +
        '<div class="kp-selected">' + (kpSel || '<span class="tiny faint">未选，默认不限</span>') + '</div>' +
        '<div class="kp-input"><input class="input" id="kpSearch" list="kpList" placeholder="输入关键词，回车添加，例如：确界、一致连续、Stolz"><button class="btn sm" data-action="kp-add">添加</button></div>' +
        '<datalist id="kpList">' + kpDatalist + '</datalist>' +
        '<div class="kp-suggest">' + kpSuggest + '</div></div>' +
      '<div class="tiny faint" style="margin-top:7px">复杂度按题干 + 解析篇幅估算；难度是题目难度估计，可叠加筛选。</div></div>';
    var ratioSum = TYPES.reduce(function (a, t) { return a + (Number(p.ratios[t]) || 0); }, 0);
    var ratioAvail = QS.filter(function (q) { return p.sections.has(q.section) && setupFilters(q); });
    var ratioBlock = p.mode === 'ratio' ? '<div class="setup-block"><h4>题型比例</h4><div class="ratio-grid">' +
      TYPES.map(function (t) {
        var n = ratioAvail.filter(function (q) { return q.type === t; }).length;
        return '<label class="ratio-item"><span>' + t + '</span><input class="input" type="number" min="0" max="100" step="5" data-ratio="' + t + '" value="' + (p.ratios[t] || 0) + '"><span>%</span><em>可抽 ' + n + '</em></label>';
      }).join('') + '</div>' +
      '<div class="ratio-sum">合计 <b>' + ratioSum + '%</b> ' + (ratioSum === 100 ? '' : '<span class="tiny amber">（开始时会按比例归一化）</span>') +
        ' <button class="btn sm" data-action="ratio-equal">平均分配</button></div></div>' : '';
    var pool = poolForSetup();
    var typeLine = '';
    if (p.mode === 'ratio') {
      var tc = typeCounts(pool);
      typeLine = ' · ' + TYPES.filter(function (t) { return tc[t] > 0; }).map(function (t) { return t + ' ' + tc[t]; }).join(' / ');
    }
    return '<div class="setup-block"><h4>范围</h4><div class="scope-chapters">' + scope + '</div></div>' +
      '<div class="setup-block"><h4>选题方式</h4><div class="mode-grid">' + modes + '</div></div>' +
      filterBlock + ratioBlock + countBlock + customBlock +
      '<div class="setup-row"><div class="setup-block"><h4>顺序</h4><div class="seg full"><button data-order="shuffle" class="' + (p.order === 'shuffle' ? 'active' : '') + '">打乱</button><button data-order="original" class="' + (p.order === 'original' ? 'active' : '') + '">原顺序</button><button data-order="oldest" class="' + (p.order === 'oldest' ? 'active' : '') + '">久未练优先</button></div></div>' +
      '<div class="setup-block"><h4>展示</h4><div class="seg full"><button data-display="single" class="' + (p.display === 'single' ? 'active' : '') + '">单题</button><button data-display="paper" class="' + (p.display === 'paper' ? 'active' : '') + '">整卷</button></div></div></div>' +
      '<div class="small muted" style="border-top:1px dashed var(--line);padding-top:12px">本次将练 <b style="color:var(--accent);font-size:15px">' + pool.length + '</b> 题 · ' + esc(scopeLabel()) + typeLine + '</div>';
  }
  function openSetup(preset) {
    setupState = defaultSetup(preset);
    var dlg = document.createElement('dialog');
    dlg.id = 'setupDialog';
    dlg.innerHTML = '<div class="dlg-head"><div><h2>开始刷题</h2><div class="sub">选范围、选题方式和展示形式</div></div><button class="icon-btn" data-close aria-label="关闭">✕</button></div>' +
      '<div class="dlg-body" id="setupBody">' + setupBodyHTML() + '</div>' +
      '<div class="dlg-foot"><span class="small muted" id="setupFoot"></span><span class="spacer"></span><button class="btn" data-close>取消</button><button class="btn primary" data-action="setup-start" autofocus>开始练习 →</button></div>';
    document.body.appendChild(dlg);
    enhanceSelects(dlg);
    dlg.showModal();
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  function refreshSetup() {
    var body = document.getElementById('setupBody');
    if (!body) return;
    body.innerHTML = setupBodyHTML();
    var chks = $$('[data-scope-ch]', body);
    chks.forEach(function (c) {
      if (c.dataset.indeterminate) c.indeterminate = true;
    });
    enhanceSelects(body);
  }
  function openPicker() {
    var selected = new Set(setupState.custom);
    var dlg = document.createElement('dialog');
    dlg.id = 'pickDialog';
    dlg.style.maxWidth = '820px';
    function rowsHTML() {
      return QS.map(function (q) {
        return '<label class="pick-row"><input type="checkbox" data-pick="' + q.id + '"' + (selected.has(q.id) ? ' checked' : '') + '>' +
          '<span class="pid">' + q.id + '</span><span class="ptxt"><b>' + esc(q.source) + ' ' + q.number + '</b> · ' + esc(snippet(q.body, 120)) + '</span></label>';
      }).join('');
    }
    dlg.innerHTML = '<div class="dlg-head"><div><h2>勾选题目</h2><div class="sub">已选 <b id="pickCount">' + selected.size + '</b> 题；可先筛选再全选</div></div><button class="icon-btn" data-close aria-label="关闭">✕</button></div>' +
      '<div class="dlg-body"><div class="picker-tools"><input class="input" id="pickSearch" placeholder="搜索题号、题干、知识点" style="flex:1;min-width:160px">' +
        '<button class="btn sm" data-action="pick-all">全选当前</button><button class="btn sm" data-action="pick-none">清空</button></div>' +
        '<div class="picker-list" id="pickList">' + rowsHTML() + '</div></div>' +
      '<div class="dlg-foot"><span class="small muted">勾选后点“确定”，顺序仍由外层“打乱/原顺序”决定。</span><span class="spacer"></span><button class="btn" data-close>取消</button><button class="btn primary" data-action="pick-confirm">确定（<span id="pickCount2">' + selected.size + '</span>）</button></div>';
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    var search = dlg.querySelector('#pickSearch');
    search.addEventListener('input', function () {
      var kw = search.value.trim().toLowerCase();
      $$('.pick-row', dlg).forEach(function (row) {
        row.style.display = !kw || row.textContent.toLowerCase().indexOf(kw) >= 0 ? '' : 'none';
      });
    });
    dlg.addEventListener('change', function (e) {
      var cb = e.target.closest('[data-pick]');
      if (!cb) return;
      if (cb.checked) selected.add(cb.dataset.pick); else selected.delete(cb.dataset.pick);
      var c1 = dlg.querySelector('#pickCount'), c2 = dlg.querySelector('#pickCount2');
      if (c1) c1.textContent = selected.size;
      if (c2) c2.textContent = selected.size;
    });
    dlg.addEventListener('click', function (e) {
      var act = e.target.closest('[data-action]');
      if (!act) return;
      if (act.dataset.action === 'pick-all') {
        $$('.pick-row', dlg).forEach(function (row) {
          if (row.style.display === 'none') return;
          var cb = row.querySelector('[data-pick]');
          cb.checked = true; selected.add(cb.dataset.pick);
        });
      } else if (act.dataset.action === 'pick-none') {
        selected.clear();
        $$('[data-pick]', dlg).forEach(function (cb) { cb.checked = false; });
      } else if (act.dataset.action === 'pick-confirm') {
        setupState.custom = selected;
        setupState.mode = 'custom';
        dlg.close();
        refreshSetup();
        return;
      }
      var c1 = dlg.querySelector('#pickCount'), c2 = dlg.querySelector('#pickCount2');
      if (c1) c1.textContent = selected.size;
      if (c2) c2.textContent = selected.size;
    });
  }
  function startSetupSession() {
    var pool = poolForSetup();
    if (!pool.length) { toast('当前范围没有可练的题目，换一下条件吧'); return; }
    var modeName = { random: '随机', all: '全部', wrong: '错题', unseen: '未做', custom: '自定义', favorites: '收藏', flagged: '标记', ratio: '按比例' }[setupState.mode];
    var title = modeName + ' ' + pool.length + ' 题 · ' + scopeLabel();
    var dlg = document.getElementById('setupDialog');
    if (dlg) dlg.close();
    startSession(pool.map(function (q) { return q.id; }), { title: title, display: setupState.display, scope: scopeLabel() });
  }

  /* ---------------- print ---------------- */
  function viewPrint() {
    return '<div class="print-head"><h1>数学分析（第六版·上册）' + chapterRange() + '课后习题</h1><p>共 ' + QS.length + ' 题 · 数分刷题</p></div>' +
      '<div class="q-list">' + QS.map(function (q, i) {
        return qCard(q, i, { num: q.number, grade: false, note: false, hideFoot: true, alwaysSolution: false });
      }).join('') + '</div>';
  }

  /* ---------------- search ---------------- */
  function viewSearch(route) {
    var kw = (route.query.q || '').trim();
    var list = kw ? QS.filter(function (q) {
      var hay = (q.id + ' ' + q.source + ' ' + q.body + ' ' + q.tags.join(' ') + ' ' + (CMAP[q.cluster] ? CMAP[q.cluster].name : '')).toLowerCase();
      return hay.indexOf(kw.toLowerCase()) >= 0;
    }) : [];
    var body = '';
    if (!kw) {
      var tags = {};
      QS.forEach(function (q) { q.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
      var top = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 18);
      body = '<div class="empty" style="text-align:left"><h3 style="margin-bottom:10px">搜索题库</h3><p style="margin-left:0">输入题号、题干关键词或知识点，例如“一致连续”“确界”“Stolz”。</p>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + top.map(function (t) { return '<a class="tag" href="#/search?q=' + encodeURIComponent(t) + '">' + esc(t) + ' · ' + tags[t] + '</a>'; }).join('') + '</div></div>';
    } else if (!list.length) {
      body = '<div class="empty"><div class="big">⌕</div><h3>没有找到“' + esc(kw) + '”</h3><p>换个关键词，或去题库按章节浏览。</p></div>';
    } else {
      body = '<div class="bank-list">' + list.map(bankRow).join('') + '</div>';
    }
    return '<div class="page-head"><div><h1>搜索</h1><div class="sub">' + (kw ? '“' + esc(kw) + '” · ' + list.length + ' 条结果' : '题号、题干、知识点') + '</div></div></div>' +
      '<form class="filterbar" data-search-form><div class="searchbox"><input class="input" name="q" value="' + esc(kw) + '" placeholder="搜索题目、知识点…" autofocus></div><button class="btn primary" type="submit">搜索</button></form>' + body;
  }

  /* ---------------- dialogs / import ---------------- */
  function enhanceSelects(root) {
    $$('select', root || document).forEach(function (s) {
      if (s.dataset.enhanced) return;
      s.dataset.enhanced = '1';
    });
  }
  function exportData() {
    var blob = new Blob([JSON.stringify({ app: 'maq', version: 1, exportedAt: new Date().toISOString(), state: state }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '数分刷题-备份-' + todayKey() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    toast('备份已导出');
  }
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        var incoming = obj.state || obj;
        if (!incoming || !incoming.progress) throw new Error('bad');
        if (!confirm('导入会覆盖当前所有练习记录，确定继续？')) return;
        state = Object.assign(defaults(), incoming);
        state.settings = Object.assign({}, DEFAULT_SETTINGS, incoming.settings || {});
        state.sessions = Array.isArray(incoming.sessions) ? incoming.sessions : [];
        state.reviews = state.reviews && typeof state.reviews === 'object' ? state.reviews : {};
        state.checkins = state.checkins && typeof state.checkins === 'object' ? state.checkins : {};
        saveState(); applyTheme(); applyFont();
        toast('导入成功'); render();
      } catch (e) { toast('文件格式不对，导入失败'); }
    };
    reader.readAsText(file);
  }
  function resetData() {
    if (!confirm('确定清空所有练习记录、错题、收藏和笔记？此操作不可恢复。')) return;
    if (CLOUD_USER && !confirm('你已登录云同步：清空本地后会同步覆盖云端进度，确定继续？')) return;
    if (!confirm('再确认一次：真的要全部清空吗？')) return;
    state = defaults(); S = null; saveState(); saveSession();
    CLOUD.ownerId = null;
    saveCloudMeta();
    clearAllLocalTraces().catch(function () { /* IndexedDB 不可用时忽略 */ });
    applyTheme(); applyFont(); render(); toast('已清空');
  }
  function printAll() {
    if (parseRoute().name === 'print') { window.print(); return; }
    navigate('#/print');
    setTimeout(function () { window.print(); }, 3000);
  }

  /* ---------------- answer sheet ---------------- */
  function openSheet() {
    if (!S) return;
    var mask = document.createElement('div'); mask.className = 'drawer-mask';
    var drawer = document.createElement('aside'); drawer.className = 'drawer';
    drawer.innerHTML = '<div class="drawer-head"><h3>答题卡</h3><button class="icon-btn" data-action="sheet-close" aria-label="关闭">✕</button></div>' +
      '<div class="drawer-body"><div class="sheet-grid">' + S.qids.map(function (id, i) {
        var st = S.results[id] ? S.results[id].status : '';
        return '<button data-action="goto" data-index="' + i + '" class="' + (st === 'correct' ? 'ok' : st === 'wrong' ? 'no' : '') + (i === S.index ? ' cur' : '') + '">' + (i + 1) + '</button>';
      }).join('') + '</div><div class="sheet-legend"><span><i style="background:var(--green)"></i>做对</span><span><i style="background:var(--red)"></i>做错</span><span><i style="background:var(--card-2);border:1px solid var(--line)"></i>未答</span></div></div>' +
      '<div class="drawer-foot"><button class="btn sm" data-action="sheet-close">继续答题</button><span class="spacer"></span><button class="btn sm primary" data-action="submit">交卷</button></div>';
    document.body.appendChild(mask); document.body.appendChild(drawer);
    setTimeout(function () { mask.classList.add('open'); drawer.classList.add('open'); }, 10);
    mask.addEventListener('click', closeSheet);
  }
  function closeSheet() {
    var mask = document.querySelector('.drawer-mask'), drawer = document.querySelector('.drawer');
    if (mask) { mask.classList.remove('open'); setTimeout(function () { mask.remove(); }, 220); }
    if (drawer) { drawer.classList.remove('open'); setTimeout(function () { drawer.remove(); }, 240); }
  }

  /* ---------------- render ---------------- */
  function setNav(name) {
    $$('.mainnav a').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === name); });
  }
  function render() {
    var route = parseRoute();
    setNav(route.name === 'q' ? 'bank' : route.name === 'search' ? '' : route.name);
    var html = '';
    switch (route.name) {
      case 'home': html = viewHome(); break;
      case 'bank': html = viewBank(route); break;
      case 'knowledge': html = viewKnowledge(route); break;
      case 'wrong': html = viewWrong(); break;
      case 'favorites': html = viewFavorites(); break;
      case 'stats': html = viewStats(); break;
      case 'export': html = viewExport(); break;
      case 'account': html = viewAccount(); break;
      case 'settings': html = viewSettings(); break;
      case 'q': html = viewDetail(route); break;
      case 'search': html = viewSearch(route); break;
      case 'session': html = viewSession(); break;
      case 'result': html = viewResult(route); break;
      case 'print': html = viewPrint(); break;
      default: html = viewHome();
    }
    if (route.name === 'session' && !S) { html = viewHome(); setNav('home'); }
    app.innerHTML = html;
    renderMath(app);
    refreshTraceGalleries(app);
    CLOUD_ACCOUNT_ROUTE = route.name === 'account';
    updateAccountTop();
    if (route.name === 'export') updateExportPreview();
    if (route.name === 'session') {
      var counts = sessionCounts();
      document.title = (S ? S.title + ' · ' : '') + '数分刷题';
    } else {
      document.title = '数分刷题 · ' + chapterRange();
    }
    enhanceSelects(app);
  }
  function scrollToQ(qid) {
    var el = document.getElementById('q-' + qid);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- timer ---------------- */
  var timer = null;
  function startTimer() {
    stopTimer();
    if (!S || S.finished) return;
    timer = setInterval(function () {
      var el = document.getElementById('clock');
      if (el) el.textContent = fmtDuration(Date.now() - S.startedAt);
    }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (e) {
    var cloudBtn = e.target.closest('[data-cloud-action]');
    if (cloudBtn) {
      e.preventDefault();
      handleCloudAction(cloudBtn.dataset.cloudAction);
      return;
    }
    var resetBtn = e.target.closest('[data-auth-reset]');
    if (resetBtn) {
      e.preventDefault();
      var form = resetBtn.closest('form');
      var emailEl = form ? form.querySelector('[name="email"]') : null;
      var email = emailEl ? String(emailEl.value || '').trim() : '';
      if (!email) { setAuthMsg('先填邮箱，再点忘记密码', 'err'); return; }
      if (!CLOUD_SB) { setAuthMsg('云同步还没配置', 'err'); return; }
      CLOUD_SB.auth.resetPasswordForEmail(email, { redirectTo: cloudBaseUrl() }).then(function (r) {
        if (r.error) setAuthMsg(cloudErrorText(r.error), 'err');
        else setAuthMsg('重置密码邮件已发送，请查收邮箱。', 'ok');
      });
      return;
    }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action;
    var qid = el.dataset.qid;
    switch (a) {
      case 'start-setup': e.preventDefault(); openSetup(el.dataset.ch ? { chapter: parseInt(el.dataset.ch, 10) } : {}); break;
      case 'quick-start': e.preventDefault(); quickStart(10); break;
      case 'discard-session': if (confirm('放弃上次练习？已作答记录仍会保留在统计里，但不能再继续这场练习。')) { S = null; saveSession(); render(); } break;
      case 'reveal': e.preventDefault(); revealQ(qid); break;
      case 'grade': e.preventDefault(); setGrade(qid, el.dataset.result); break;
      case 'fav': e.preventDefault(); toggleFav(qid); break;
      case 'flag': e.preventDefault(); toggleFlag(qid); break;
      case 'checkin': e.preventDefault(); checkinNow(); break;
      case 'start-review': e.preventDefault(); startReview(); break;
      case 'kp-add': e.preventDefault(); addKpFromInput(); break;
      case 'ratio-equal': e.preventDefault(); ratioEqual(); break;
      case 'swap': e.preventDefault(); swapQuestion(); break;
      case 'zoom': e.preventDefault(); openZoom(qid); break;
      case 'view-trace': e.preventDefault(); if (el.dataset.src) openLightbox(el.dataset.src); break;
      case 'del-trace': {
        e.preventDefault();
        if (!confirm('删除这张作答图片？')) break;
        var tid = parseInt(el.dataset.id, 10);
        var gal = el.closest('[data-trace-gallery]');
        getTrace(tid).then(function (rec) {
          if (rec) queueCloudDeletion(rec);
          return deleteTrace(tid);
        }).then(function () {
          if (gal) loadTraceGallery(gal);
          toast('已删除图片');
        }).catch(function () { toast('删除失败'); });
        break;
      }
      case 'zoom-close': e.preventDefault(); { var zd = el.closest('dialog'); if (zd) zd.close(); } break;
      case 'zoom-reveal': {
        e.preventDefault();
        var zd2 = el.closest('dialog'); if (zd2) zd2.close();
        if (S) { revealQ(qid); setTimeout(function () { scrollToQ(qid); }, 120); }
        else {
          var sol = document.querySelector('#app .solution');
          if (sol) sol.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
      case 'remove-wrong': e.preventDefault(); if (S) break; removeWrong(qid); break;
      case 'toggle-wrong': e.preventDefault(); toggleWrong(qid); break;
      case 'start-one': e.preventDefault(); startOne(qid); break;
      case 'start-wrong-all': e.preventDefault(); startWrongAll(); break;
      case 'start-section': e.preventDefault(); startSection(el.dataset.sec); break;
      case 'start-chapter': e.preventDefault(); openSetup({ chapter: parseInt(el.dataset.ch, 10), mode: 'all', count: 9999 }); break;
      case 'start-chapter-wrong': e.preventDefault(); startChapterWrong(parseInt(el.dataset.ch, 10)); break;
      case 'start-filtered': e.preventDefault(); startFiltered(); break;
      case 'setup-start': e.preventDefault(); startSetupSession(); break;
      case 'pick-open': e.preventDefault(); openPicker(); break;
      case 'prev': e.preventDefault(); if (S && S.index > 0) { S.index--; saveSession(); render(); window.scrollTo(0, 0); } break;
      case 'next': e.preventDefault(); if (S && S.index < S.qids.length - 1) { S.index++; saveSession(); render(); window.scrollTo(0, 0); } break;
      case 'goto': {
        e.preventDefault();
        var i = parseInt(el.dataset.index, 10);
        if (!S || isNaN(i)) break;
        if (S.display === 'single') { S.index = i; saveSession(); render(); window.scrollTo(0, 0); }
        else { closeSheet(); setTimeout(function () { scrollToQ(S.qids[i]); }, 120); }
        break;
      }
      case 'toggle-display': e.preventDefault(); if (S) { S.display = S.display === 'single' ? 'paper' : 'single'; saveSession(); render(); } break;
      case 'submit': e.preventDefault(); submitSession(); break;
      case 'exit-session': e.preventDefault(); exitSession(); break;
      case 'sheet-open': e.preventDefault(); openSheet(); break;
      case 'sheet-close': e.preventDefault(); closeSheet(); break;
      case 'retry-wrong': e.preventDefault(); retryWrong(el.dataset.id); break;
      case 'generate-export': e.preventDefault(); generateExport(); break;
      case 'export-data': e.preventDefault(); exportData(); break;
      case 'import-data': e.preventDefault(); var f = document.getElementById('importFile'); if (f) f.click(); break;
      case 'reset-data': e.preventDefault(); resetData(); break;
      case 'print-all': e.preventDefault(); printAll(); break;
      case 'toggle-theme': e.preventDefault(); toggleTheme(); break;
      default: break;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-trace-input]')) { handleTraceFiles(t); return; }
    if (t.matches('#expRange') || t.matches('[data-exp-ch]') || t.matches('#expMarked')) { updateExportPreview(); return; }
    if (t.matches('#setTheme')) { state.settings.theme = t.value; saveState(); applyTheme(); }
    else if (t.matches('#setFont')) { state.settings.font = t.value; saveState(); applyFont(); }
    else if (t.matches('#setAutoReveal')) { state.settings.autoReveal = t.checked; saveState(); }
    else if (t.matches('#setConfirmSubmit')) { state.settings.confirmSubmit = t.checked; saveState(); }
    else if (t.matches('#importFile')) { if (t.files && t.files[0]) importData(t.files[0]); t.value = ''; }
    else if (t.matches('[data-scope-sec]')) {
      if (t.checked) setupState.sections.add(t.dataset.scopeSec); else setupState.sections.delete(t.dataset.scopeSec);
      refreshSetup();
    } else if (t.matches('[data-scope-ch]')) {
      var c = (META.chapters || []).find(function (x) { return String(x.n) === t.dataset.scopeCh; });
      if (c) c.sections.forEach(function (s) { if (t.checked) setupState.sections.add(s.id); else setupState.sections.delete(s.id); });
      refreshSetup();
    } else if (t.matches('input[name="setupMode"]')) {
      setupState.mode = t.value; refreshSetup();
    } else if (t.matches('#setupCount')) {
      setupState.count = clamp(parseInt(t.value, 10) || 1, 1, QS.length);
      refreshSetup();
    } else if (t.matches('[data-diff]')) {
      var d = parseInt(t.dataset.diff, 10);
      if (t.checked) setupState.difficulty.add(d); else setupState.difficulty.delete(d);
      refreshSetup();
    } else if (t.matches('[data-comp]')) {
      var cp = parseInt(t.dataset.comp, 10);
      if (t.checked) setupState.complexity.add(cp); else setupState.complexity.delete(cp);
      refreshSetup();
    } else if (t.matches('#setupRecency')) {
      setupState.recency = t.value;
      refreshSetup();
    } else if (t.matches('[data-ratio]')) {
      setupState.ratios[t.dataset.ratio] = clamp(parseInt(t.value, 10) || 0, 0, 100);
      refreshSetup();
    } else if (t.matches('#bankStatus')) {
      var r = parseRoute();
      var q = Object.assign({}, r.query, { status: t.value });
      navigate('#/bank?' + new URLSearchParams(q).toString());
    }
  });

  document.addEventListener('click', function (e) {
    // setup dialog internals (not data-action)
    var count = e.target.closest('[data-count]');
    if (count && document.getElementById('setupDialog')) {
      setupState.count = parseInt(count.dataset.count, 10) === 9999 ? QS.length : parseInt(count.dataset.count, 10);
      refreshSetup(); return;
    }
    var order = e.target.closest('[data-order]');
    if (order && document.getElementById('setupDialog')) { setupState.order = order.dataset.order; refreshSetup(); return; }
    var disp = e.target.closest('[data-display]');
    if (disp && document.getElementById('setupDialog')) { setupState.display = disp.dataset.display; refreshSetup(); return; }
    var kpa = e.target.closest('[data-kp-add]');
    if (kpa && document.getElementById('setupDialog')) { addKp(kpa.dataset.kpAdd); return; }
    var kpr = e.target.closest('[data-kp-remove]');
    if (kpr && document.getElementById('setupDialog')) {
      setupState.knowledge = setupState.knowledge.filter(function (x) { return x !== kpr.dataset.kpRemove; });
      refreshSetup(); return;
    }
    var close = e.target.closest('[data-close]');
    if (close) { var d = close.closest('dialog'); if (d) d.close(); }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches('[data-note]')) {
      var id = t.dataset.qid;
      clearTimeout(t._noteTimer);
      t._noteTimer = setTimeout(function () {
        var p = ensureP(id); p.note = t.value; p.updatedAt = Date.now(); saveState();
        var ind = document.querySelector('[data-saved="' + id + '"]');
        if (ind) { ind.textContent = '已保存'; setTimeout(function () { if (ind.textContent === '已保存') ind.textContent = ''; }, 1200); }
      }, 350);
    }
    if (t.matches('#pickSearch')) { /* handled in picker */ }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.matches('[data-supabase-config]')) {
      e.preventDefault();
      saveCloudConfig(e.target);
      return;
    }
    if (e.target.matches('[data-auth-form]')) {
      e.preventDefault();
      handleAuth(e.target, e.target.dataset.authForm);
      return;
    }
    if (e.target.matches('[data-search-form]')) {
      e.preventDefault();
      var val = e.target.querySelector('input[name="q"]').value.trim();
      if (stateRouteIs('search')) navigate('#/search' + (val ? '?q=' + encodeURIComponent(val) : ''));
      else navigate('#/bank' + (val ? '?q=' + encodeURIComponent(val) : ''));
    }
    if (e.target.matches('[data-kb-search]')) {
      e.preventDefault();
      var kv = e.target.querySelector('input[name="q"]').value.trim();
      navigate('#/knowledge' + (kv ? '?q=' + encodeURIComponent(kv) : ''));
    }
  });
  function stateRouteIs(name) { return parseRoute().name === name; }

  function toggleFav(qid) {
    var p = ensureP(qid);
    p.favorite = !p.favorite; p.updatedAt = Date.now();
    saveState();
    toast(p.favorite ? '已收藏' : '已取消收藏');
    // 局部更新所有同题按钮
    $$('[data-action="fav"][data-qid="' + qid + '"]').forEach(function (b) {
      b.textContent = p.favorite ? '★' : '☆';
      b.classList.toggle('on', !!p.favorite);
    });
    if (parseRoute().name === 'favorites' || parseRoute().name === 'q') render();
  }
  function toggleFlag(qid) {
    var p = ensureP(qid);
    p.flagged = !p.flagged; p.updatedAt = Date.now();
    saveState();
    toast(p.flagged ? '已标记这道题' : '已取消标记');
    $$('[data-action="flag"][data-qid="' + qid + '"]').forEach(function (b) {
      b.textContent = p.flagged ? '⚑' : '⚐';
      b.classList.toggle('on', !!p.flagged);
    });
    var route = parseRoute().name;
    if (route === 'q' || route === 'bank') render();
  }
  function checkinNow() {
    markCheckin(); saveState(); render();
    toast('今日已打卡，继续加油');
  }
  function addKp(kw) {
    kw = String(kw || '').trim();
    if (!kw) return;
    if (setupState.knowledge.indexOf(kw) >= 0) { toast('这个知识点已经加过了'); return; }
    setupState.knowledge.push(kw);
    refreshSetup();
    var inp = document.getElementById('kpSearch');
    if (inp) inp.focus();
  }
  function addKpFromInput() {
    var inp = document.getElementById('kpSearch');
    if (inp) addKp(inp.value);
  }
  function ratioEqual() {
    var avail = QS.filter(function (q) { return setupState.sections.has(q.section) && setupFilters(q); });
    var types = TYPES.filter(function (t) { return avail.some(function (q) { return q.type === t; }); });
    if (!types.length) return;
    var base = Math.floor(100 / types.length);
    var rem = 100 - base * types.length;
    TYPES.forEach(function (t) { setupState.ratios[t] = 0; });
    types.forEach(function (t, i) { setupState.ratios[t] = base + (i < rem ? 1 : 0); });
    refreshSetup();
  }
  function openZoom(qid) {
    var q = QMAP[qid];
    if (!q) return;
    var old = document.getElementById('zoomDialog');
    if (old) old.remove();
    var dlg = document.createElement('dialog');
    dlg.id = 'zoomDialog';
    dlg.className = 'zoom-dialog';
    dlg.innerHTML = '<div class="zoom-head"><div><div class="tiny muted">' + esc(q.chapterTitle) + ' · ' + esc(q.source) + ' 第 ' + q.number + ' 题</div>' +
      '<h2>' + q.id + '</h2></div><button class="icon-btn" data-action="zoom-close" aria-label="关闭">✕</button></div>' +
      '<div class="zoom-body q-body">' + bodyHTML(q) + '</div>' + refBlock(q) +
      '<div class="zoom-foot no-print"><button class="btn" data-action="zoom-close">关闭</button>' +
      '<button class="btn primary" data-action="zoom-reveal" data-qid="' + q.id + '">查看解析</button></div>';
    document.body.appendChild(dlg);
    dlg.showModal();
    renderMath(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); });
  }
  function toggleWrong(qid) {
    var p = ensureP(qid);
    p.inWrongBook = !p.inWrongBook;
    p.updatedAt = Date.now();
    if (p.inWrongBook) p.lastAt = Date.now();
    saveState();
    toast(p.inWrongBook ? '已加入错题本' : '已移出错题本');
    render();
  }
  function removeWrong(qid) {
    var p = ensureP(qid);
    p.inWrongBook = false; p.updatedAt = Date.now(); saveState();
    toast('已移出错题本'); render();
  }
  function startWrongAll() {
    var ids = QS.filter(function (q) { return getP(q.id).inWrongBook; }).map(function (q) { return q.id; });
    if (!ids.length) { toast('错题本是空的'); return; }
    startSession(shuffle(ids), { title: '错题重练 · ' + ids.length + ' 题', display: 'single', scope: '错题本' });
  }
  function startSection(sec) {
    var list = QS.filter(function (q) { return q.section === sec; });
    if (!list.length) return;
    var title = sec.indexOf('.rev') >= 0 ? '第 ' + sec.split('.')[0] + ' 章总练习题 · ' + list.length + ' 题' : '习题 ' + sec + ' · ' + list.length + ' 题';
    startSession(shuffle(list).map(function (q) { return q.id; }), { title: title, display: 'single', scope: sec });
  }
  function startChapterWrong(ch) {
    var ids = QS.filter(function (q) { return q.chapter === ch && getP(q.id).inWrongBook; }).map(function (q) { return q.id; });
    if (!ids.length) { toast('这一章暂时没有错题'); return; }
    startSession(shuffle(ids), { title: '第 ' + ch + ' 章错题 · ' + ids.length + ' 题', display: 'single', scope: '第' + ch + '章' });
  }
  function startFiltered() {
    var list = filteredQuestions(parseRoute().query);
    if (!list.length) { toast('当前筛选没有题目'); return; }
    startSession(shuffle(list).map(function (q) { return q.id; }), { title: '筛选练习 · ' + list.length + ' 题', display: 'single', scope: '题库筛选' });
  }
  function retryWrong(id) {
    var rec = state.sessions.find(function (s) { return s.id === id; });
    if (!rec) return;
    var ids = rec.qids.filter(function (q) { return rec.results && rec.results[q] && rec.results[q].status === 'wrong'; });
    if (!ids.length) { toast('这次没有错题'); return; }
    startSession(shuffle(ids), { title: '重练错题 · ' + ids.length + ' 题', display: 'single', scope: '错题' });
  }
  function quickStart(n) {
    startSession(shuffle(QS).slice(0, n).map(function (q) { return q.id; }), { title: '随机 ' + n + ' 题 · ' + chapterRange(), display: 'single', scope: '全部' });
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    state.settings.theme = cur === 'dark' ? 'light' : 'dark';
    saveState(); applyTheme();
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.id === 'kpSearch' && e.key === 'Enter') {
      e.preventDefault(); addKpFromInput(); return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input,textarea,select')) return;
    if (parseRoute().name !== 'session' || !S || S.display !== 'single') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); if (S.index < S.qids.length - 1) { S.index++; saveSession(); render(); window.scrollTo(0, 0); } }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (S.index > 0) { S.index--; saveSession(); render(); window.scrollTo(0, 0); } }
    else if (e.key === ' ') { e.preventDefault(); revealQ(S.qids[S.index]); }
    else if (e.key === '1') { e.preventDefault(); setGrade(S.qids[S.index], 'correct'); }
    else if (e.key === '2') { e.preventDefault(); setGrade(S.qids[S.index], 'wrong'); }
    else if (e.key === 'z') { e.preventDefault(); openZoom(S.qids[S.index]); }
    else if (e.key === 'f') { e.preventDefault(); toggleFlag(S.qids[S.index]); }
  });

  document.getElementById('themeBtn').addEventListener('click', toggleTheme);

  window.addEventListener('hashchange', function () {
    closeSheet(); stopTimer(); render(); startTimer(); window.scrollTo(0, 0);
  });

  /* ---------------- init ---------------- */
  applyTheme(); applyFont(); render(); startTimer();
  initCloud();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
  }
})();
