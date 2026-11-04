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
  var DAY = 86400000;
  var REVIEW_DAYS = [1, 2, 4, 7, 15, 30, 60];

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
    return { v: 1, createdAt: Date.now(), progress: {}, sessions: [], reviews: {}, checkins: {}, settings: Object.assign({}, DEFAULT_SETTINGS) };
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
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
    catch (e) { toast('本地存储空间不足，记录可能未保存'); }
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
  function secLabel(id) { return id.indexOf('.rev') >= 0 ? '总练习' : id; }
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
    return b.replace(FIG,
      '<figure class="q-fig"><img src="assets/img/fig-1-4.png" alt="图 1-4：两条折线，f1 过 (0,0)、(1/2,2)、(1,0)，f2 过 (0,0)、(1/4,4)、(1/2,0)"><figcaption>图 1-4</figcaption></figure>');
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
      return '<section class="solution"><div class="solution-head">解析</div><div class="solution-body muted">这道题的解析正在整理中。你可以先对照教材与笔记自行推导。</div></section>';
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
    return '<details class="note-wrap"' + open + '><summary>笔记 / 草稿<span class="saved" data-saved="' + q.id + '"></span></summary>' +
      '<textarea data-note data-qid="' + q.id + '" placeholder="写下思路、易错点或疑问，自动保存在本机…">' + esc(p.note || '') + '</textarea></details>';
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
          '<button class="icon-btn ' + (p.flagged ? 'on' : '') + '" data-action="flag" data-qid="' + q.id + '" aria-label="标记" title="标记这道题">' + (p.flagged ? '⚑' : '⚐') + '</button>' +
          '<button class="icon-btn ' + (p.favorite ? 'on' : '') + '" data-action="fav" data-qid="' + q.id + '" aria-label="收藏" title="收藏">' + (p.favorite ? '★' : '☆') + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="q-body">' + bodyHTML(q) + '</div>' +
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
      (opts.note === false ? '' : noteBlock(q)) +
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
      '<p class="lede">华东师范大学《数学分析》第六版上册 · 第 1–4 章。随机抽题、整卷或单题、题型总结、错题本与艾宾浩斯复习，学习记录自动保存在本机。</p>' +
      '<div class="btn-row"><button class="btn primary lg" data-action="start-setup">开始刷题 →</button>' +
        '<button class="btn lg" data-action="quick-start">随机 10 题</button>' +
        '<a class="btn lg ghost" href="#/bank">浏览题库</a></div>' +
      '<div class="hero-meta"><div><b>' + META.total + '</b><span>课后习题</span></div>' +
        '<div><b>4</b><span>章节</span></div>' +
        '<div><b>' + g.attempted + '</b><span>已练题目</span></div>' +
        '<div><b>' + (g.correct + g.wrong ? g.accuracy + '%' : '—') + '</b><span>累计正确率</span></div></div>' +
    '</section>' +
    resume +
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
    return '<div class="page-head"><div><h1>题库</h1><div class="sub">第 1–4 章共 ' + QS.length + ' 道课后习题 · 当前 ' + list.length + ' 道</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="start-setup">选题练习</button><button class="btn" data-action="start-filtered">练当前筛选</button></div></div>' +
      '<div class="filterbar">' + chips + statusSel + search + '</div>' +
      (list.length ? '<div class="bank-list">' + list.map(bankRow).join('') + '</div>' :
        '<div class="empty"><div class="big">∅</div><h3>没有符合条件的题目</h3><p>换个章节、状态或关键词试试。</p></div>');
  }

  /* ---------------- views: wrong / favorites ---------------- */
  function viewWrong() {
    var list = QS.filter(function (q) { return getP(q.id).inWrongBook; })
      .sort(function (a, b) { return (getP(b.id).lastAt || 0) - (getP(a.id).lastAt || 0); });
    var head = '<div class="page-head"><div><h1>错题本</h1><div class="sub">做错过的题会自动进来；重做并自评“做对了”或手动移出即可。</div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="start-wrong-all"' + (list.length ? '' : ' disabled') + '>全部重练（' + list.length + '）</button>' +
      '<button class="btn" data-action="start-setup">自定义练题</button></div></div>';
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
          '<div class="btn-row" style="margin-top:12px"><button class="btn" data-action="export-data">导出备份</button>' +
            '<button class="btn" data-action="import-data">导入备份</button>' +
            '<button class="btn" data-action="print-all">打印题库</button></div>' +
          '<input type="file" id="importFile" accept="application/json,.json" class="hide">' +
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
          '<div class="q-body">' + bodyHTML(q) + '</div>' +
          (q.hint ? '<div class="q-hint"><b>提示</b> ' + esc(q.hint) + '</div>' : '') +
          renderSolution(q) + noteBlock(q) +
        '</article>' +
        '<div class="single-nav no-print"><a class="btn sm" href="#/q/' + (prev ? prev.id : q.id) + '">← 上一题</a>' +
          '<span class="small muted">' + (idx + 1) + ' / ' + QS.length + '</span>' +
          '<a class="btn sm" href="#/q/' + (next ? next.id : q.id) + '">下一题 →</a></div>' +
      '</div><aside class="detail-side">' +
        '<div class="side-card"><h4>题目信息</h4><dl><dt>题号</dt><dd>' + q.id + '</dd><dt>来源</dt><dd>' + esc(q.source) + ' 第 ' + q.number + ' 题</dd><dt>类型</dt><dd>' + esc(q.type) + '</dd>' +
          '<dt>难度</dt><dd>' + '●'.repeat(q.difficulty) + '○'.repeat(3 - q.difficulty) + '</dd><dt>练习</dt><dd>' + (p.attempts ? '练过 ' + p.attempts + ' 次 · 对 ' + (p.correct || 0) + ' / 错 ' + (p.wrong || 0) : '还没练过') + '</dd></dl></div>' +
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
      order: 'shuffle', display: preset.display || 'single', custom: new Set(), chapter: preset.chapter || 0
    };
  }
  function poolForSetup() {
    var p = setupState;
    var base;
    if (p.mode === 'custom') {
      base = QS.filter(function (q) { return p.custom.has(q.id); });
    } else {
      base = QS.filter(function (q) { return p.sections.has(q.section); });
      if (p.mode === 'wrong') base = base.filter(function (q) { return getP(q.id).inWrongBook; });
      else if (p.mode === 'unseen') base = base.filter(function (q) { return !getP(q.id).attempts; });
      else if (p.mode === 'favorites') base = base.filter(function (q) { return getP(q.id).favorite; });
      else if (p.mode === 'flagged') base = base.filter(function (q) { return getP(q.id).flagged; });
    }
    var ordered = p.order === 'shuffle' ? shuffle(base) : base.slice();
    if (p.mode === 'all') return ordered;
    if (p.mode === 'custom') return ordered;
    var n = clamp(parseInt(p.count, 10) || 10, 1, ordered.length);
    return ordered.slice(0, n);
  }
  function scopeLabel() {
    var n = setupState.sections.size;
    var chs = {};
    allSections.forEach(function (s) { if (setupState.sections.has(s.id)) chs[s.chapter] = true; });
    var chList = Object.keys(chs).map(function (x) { return '第' + x + '章'; }).join('、');
    if (n === allSections.length) return '第 1–4 章 · 全部小节';
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
      ['flagged', '⚑', '只练标记', '标记过的重点题']
    ].map(function (m) {
      return '<label class="mode ' + (p.mode === m[0] ? 'on' : '') + '"><input type="radio" name="setupMode" value="' + m[0] + '"' + (p.mode === m[0] ? ' checked' : '') + '>' +
        '<span class="mi">' + m[1] + '</span><span><b>' + m[2] + '</b><small>' + m[3] + '</small></span></label>';
    }).join('');
    var showCount = p.mode !== 'all' && p.mode !== 'custom';
    var countBlock = showCount ? '<div class="setup-block"><h4>数量</h4><div class="count-line"><input class="input" type="number" id="setupCount" min="1" max="' + QS.length + '" value="' + p.count + '"> <span class="small muted">题（当前范围最多 ' + QS.filter(function (q) { return p.sections.has(q.section); }).length + ' 题）</span></div>' +
      '<div class="count-presets">' + [5, 10, 20, 30].map(function (n) { return '<button data-count="' + n + '">' + n + '</button>'; }).join('') + '<button data-count="9999">全部</button></div></div>' : '';
    var customBlock = p.mode === 'custom' ? '<div class="setup-block"><h4>自定义题目</h4><button class="btn sm" data-action="pick-open">勾选题目（已选 ' + p.custom.size + ' 题）</button></div>' : '';
    var pool = poolForSetup();
    return '<div class="setup-block"><h4>范围</h4><div class="scope-chapters">' + scope + '</div></div>' +
      '<div class="setup-block"><h4>选题方式</h4><div class="mode-grid">' + modes + '</div></div>' +
      countBlock + customBlock +
      '<div class="setup-row"><div class="setup-block"><h4>顺序</h4><div class="seg full"><button data-order="shuffle" class="' + (p.order === 'shuffle' ? 'active' : '') + '">打乱</button><button data-order="original" class="' + (p.order === 'original' ? 'active' : '') + '">原顺序</button></div></div>' +
      '<div class="setup-block"><h4>展示</h4><div class="seg full"><button data-display="single" class="' + (p.display === 'single' ? 'active' : '') + '">单题</button><button data-display="paper" class="' + (p.display === 'paper' ? 'active' : '') + '">整卷</button></div></div></div>' +
      '<div class="small muted" style="border-top:1px dashed var(--line);padding-top:12px">本次将练 <b style="color:var(--accent);font-size:15px">' + pool.length + '</b> 题 · ' + esc(scopeLabel()) + '</div>';
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
    var modeName = { random: '随机', all: '全部', wrong: '错题', unseen: '未做', custom: '自定义', favorites: '收藏', flagged: '标记' }[setupState.mode];
    var title = modeName + ' ' + pool.length + ' 题 · ' + scopeLabel();
    var dlg = document.getElementById('setupDialog');
    if (dlg) dlg.close();
    startSession(pool.map(function (q) { return q.id; }), { title: title, display: setupState.display, scope: scopeLabel() });
  }

  /* ---------------- print ---------------- */
  function viewPrint() {
    return '<div class="print-head"><h1>数学分析（第六版·上册）第 1–4 章课后习题</h1><p>共 ' + QS.length + ' 题 · 数分刷题</p></div>' +
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
    if (!confirm('再确认一次：真的要全部清空吗？')) return;
    state = defaults(); S = null; saveState(); saveSession();
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
      case 'wrong': html = viewWrong(); break;
      case 'favorites': html = viewFavorites(); break;
      case 'stats': html = viewStats(); break;
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
    if (route.name === 'session') {
      var counts = sessionCounts();
      document.title = (S ? S.title + ' · ' : '') + '数分刷题';
    } else {
      document.title = '数分刷题 · 第 1–4 章';
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
      case 'swap': e.preventDefault(); swapQuestion(); break;
      case 'zoom': e.preventDefault(); openZoom(qid); break;
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
    if (e.target.matches('[data-search-form]')) {
      e.preventDefault();
      var val = e.target.querySelector('input[name="q"]').value.trim();
      if (stateRouteIs('search')) navigate('#/search' + (val ? '?q=' + encodeURIComponent(val) : ''));
      else navigate('#/bank' + (val ? '?q=' + encodeURIComponent(val) : ''));
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
      '<div class="zoom-body q-body">' + bodyHTML(q) + '</div>' +
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
    startSession(shuffle(QS).slice(0, n).map(function (q) { return q.id; }), { title: '随机 ' + n + ' 题 · 第 1–4 章', display: 'single', scope: '全部' });
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    state.settings.theme = cur === 'dark' ? 'light' : 'dark';
    saveState(); applyTheme();
  }

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
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
  }
})();
