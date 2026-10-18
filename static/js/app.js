'use strict';

var ME = BOOT.me, THEMES = BOOT.themes, ROLES = BOOT.roles;
var state = {
  mode: 'square', lang: ME.language,
  sort: 'latest', theme: '',
  feed: null, insights: null, th: null,
  openThreads: {},
  contacts: [], rooms: [], activeChat: null, currentRoom: null, messages: [], selectedMsg: null,
  media: null, pendingVoice: false
};

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function api(path, body, method) {
  var opts = { headers: {} };
  if (body !== undefined) {
    opts.method = method || 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (method) { opts.method = method; }
  return fetch(path, opts).then(function (r) {
    return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Request failed'); return d; });
  });
}
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
}
function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }
function langName(l) { return l === 'de' ? 'German' : 'English'; }
function avatarHTML(p, cls) {
  return '<div class="avatar ' + (cls || '') + '" style="background:' + esc(p.color) + '">' + esc(p.initials) + '</div>';
}
function roleBadge(p) {
  if (p.role === 'organizer') return '<svg class="verified" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 2.2 3.4-.3.9 3.3 3 1.6-1.2 3.2 1.2 3.2-3 1.6-.9 3.3-3.4-.3L12 23l-2.6-2.2-3.4.3-.9-3.3-3-1.6L3.3 13 2.1 9.8l3-1.6.9-3.3 3.4.3z"/><path d="M8 12.5l2.6 2.5L16 9.5" stroke="#fff" stroke-width="2" fill="none"/></svg>';
  return '<span class="role-badge" style="background:' + esc(p.color) + '">' + esc(p.role_label) + '</span>';
}
var _trSeq = 0;
function textBlock(o, cls) {
  var lang = state.lang;
  var shown = (lang === 'de' ? o.content_de : o.content_en) || o.content;
  var html = '<div class="' + cls + '">' + esc(shown) + '</div>';
  if (o.lang && o.lang !== lang && o.content && shown !== o.content) {
    var id = 'tr' + (++_trSeq);
    html += '<div class="tr-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>' +
      'Translated from ' + langName(o.lang) + ' · <button onclick="$(\'' + id + '\').classList.toggle(\'show\')">Show original</button></div>' +
      '<div class="tr-original" id="' + id + '">' + esc(o.content) + '</div>';
  }
  return html;
}
var ICON = {
  reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  place: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>'
};

var socket = io();
socket.on('feed_changed', debounce(function () { loadFeed(); loadInsights(); }, 250));
socket.on('post_updated', debounce(function () { loadFeed(); loadInsights(); }, 350));
socket.on('th_update', debounce(function () { loadTownHall(); }, 250));
socket.on('reaction', function (d) {
  if (state.th) { state.th.reactions = d.counts; renderReactions(); }
  var r = REACTIONS.filter(function (x) { return x.k === d.kind; })[0];
  if (r && state.mode === 'townhall') floatEmoji(r.e);
});
socket.on('caption', function (d) { addCaption(d); });
socket.on('new_message', function (m) {
  m.is_me = (m.sender_id === ME.id);
  if (m.is_me) {
    var pending = document.querySelector('[data-client="' + m.client_id + '"]');
    if (pending) pending.remove();
  }
  state.messages.push(m);
  appendMessage(m);
  if (!m.is_me) showMessageInsight(m);
  loadContacts();
});
socket.on('user_online', function (d) { setContactStatus(d.user_id, 'online'); });
socket.on('user_offline', function (d) { setContactStatus(d.user_id, 'offline'); });
socket.on('incoming_call', function (d) {
  state.incomingCaller = d.caller_id;
  $('callModalTitle').textContent = (d.call_type === 'video' ? 'Video' : 'Voice') + ' call';
  $('callModalText').textContent = d.caller_name + ' is calling…';
  $('callModal').classList.add('active');
});
socket.on('call_accepted', function () { showVideoOverlay(); });
socket.on('call_rejected', function (d) { toast(d.rejecter_name + ' declined the call.'); hideVideoOverlay(); });
socket.on('call_ended', function () { hideVideoOverlay(); });

function switchMode(mode) {
  state.mode = mode;
  ['square', 'voice', 'townhall'].forEach(function (m) {
    $(m + 'ModeBtn').classList.toggle('active', m === mode);
    $(m + 'Panel').classList.toggle('active', m === mode);
  });
  document.body.className = 'mode-' + mode + (state.activeChat && mode === 'voice' ? ' chat-open' : '');
  var left = document.querySelector('.sidebar-left');
  $('leftSquare').classList.toggle('active', mode === 'square');
  $('leftVoice').classList.toggle('active', mode === 'voice');
  left.style.display = mode === 'townhall' ? 'none' : '';
  try { localStorage.setItem('bp_mode', mode); } catch (e) {}
  renderInsightsPanel();
  if (mode === 'voice') { loadContacts(); }
  if (mode === 'townhall') { loadTownHall(); }
}

function setLanguage(l) {
  state.lang = l;
  $('langDe').classList.toggle('active', l === 'de');
  $('langEn').classList.toggle('active', l === 'en');
  api('/api/me', { language: l }).catch(function () {});
  renderFeed(); renderMessages(); renderInsightsPanel(); if (state.th) renderTownHall();
  loadSettings();
}

function loadFeed() {
  var q = '/api/posts?sort=' + state.sort + (state.theme ? '&theme=' + state.theme : '');
  return api(q).then(function (d) { state.feed = d; renderFeed(); });
}
function setSort(s) {
  state.sort = s;
  $('tabLatest').classList.toggle('active', s === 'latest');
  $('tabTop').classList.toggle('active', s === 'top');
  loadFeed();
}
function setThemeFilter(t) {
  state.theme = (state.theme === t ? '' : t);
  renderThemeFilter(); loadFeed();
}
function renderThemeFilter() {
  var counts = {};
  ((state.insights && state.insights.themes) || []).forEach(function (t) { counts[t.key] = t.posts; });
  var keys = Object.keys(THEMES).concat(['other']);
  var total = state.insights ? state.insights.total_posts : '';
  var html = '<button class="theme-filter-item' + (state.theme ? '' : ' active') + '" onclick="setThemeFilter(\'\')"><span class="theme-dot" style="background:var(--brand)"></span>All concerns<span class="count">' + total + '</span></button>';
  var chips = '<button class="tag" style="border:1px solid var(--border);background:' + (state.theme ? '#fff' : 'var(--brand)') + ';color:var(--brand-ink);cursor:pointer" onclick="setThemeFilter(\'\')">All</button>';
  keys.forEach(function (k) {
    var meta = THEMES[k] || { label: 'Other', color: '#94A3B8' };
    html += '<button class="theme-filter-item' + (state.theme === k ? ' active' : '') + '" onclick="setThemeFilter(\'' + k + '\')"><span class="theme-dot" style="background:' + meta.color + '"></span>' + esc(meta.label) + '<span class="count">' + (counts[k] || 0) + '</span></button>';
    var on = state.theme === k;
    chips += '<button class="tag" style="cursor:pointer;white-space:nowrap;border:1px solid ' + meta.color + ';background:' + (on ? meta.color : '#fff') + ';color:' + (on ? '#fff' : meta.color) + '" onclick="setThemeFilter(\'' + k + '\')">' + esc(meta.label) + '</button>';
  });
  $('themeFilter').innerHTML = html;
  $('chipRow').innerHTML = chips;
}
function themeTag(p) {
  if (!p.theme || p.theme === 'other' && p.is_broadcast) return '';
  return '<span class="tag" style="background:' + p.theme_color + '1A;color:' + p.theme_color + '"><span class="theme-dot" style="background:' + p.theme_color + ';width:7px;height:7px"></span>' + esc(p.theme_label) + '</span>';
}
function postHTML(p) {
  var a = p.author;
  var media = '';
  if (p.media_url) {
    media = '<div class="post-media">' + (p.media_type === 'video'
      ? '<video src="' + esc(p.media_url) + '" controls playsinline preload="metadata"></video>'
      : '<img src="' + esc(p.media_url) + '" alt="Photo attached to post" loading="lazy">') + '</div>';
  }
  var tags = themeTag(p) + (p.zone ? '<span class="tag tag-zone">' + ICON.place + esc(p.zone) + '</span>' : '');
  var canDel = p.is_mine || ME.isOrganizer;
  var actions = p.is_broadcast ? '' :
    '<div class="post-actions">' +
      '<button class="act-btn" onclick="toggleThread(' + p.id + ')" title="Reply">' + ICON.reply + (p.comments || '') + '</button>' +
      '<button class="act-btn metoo' + (p.supported ? ' on' : '') + '" onclick="toggleSupport(' + p.id + ')" title="Me too">' + ICON.heart + 'Me too' + (p.support ? ' · ' + p.support : '') + '</button>' +
      '<span class="post-score" title="Role-weighted priority">' + ICON.bars + p.score + '</span>' +
    '</div>' +
    '<div class="thread' + (state.openThreads[p.id] ? ' open' : '') + '" id="thread-' + p.id + '"></div>';
  return '<div class="post" id="post-' + p.id + '">' +
    avatarHTML(a, 'post-avatar') +
    '<div class="post-main">' +
      '<div class="post-head"><span class="post-name">' + esc(a.name) + '</span>' + roleBadge(a) +
        '<span class="post-handle">' + esc(a.handle) + '</span><span class="post-time">· ' + esc(p.time) + '</span>' +
        (canDel ? '<button class="post-del" title="Delete" onclick="deletePost(' + p.id + ')">' + ICON.trash + '</button>' : '') +
      '</div>' +
      textBlock(p, 'post-body') + media +
      (tags ? '<div class="post-tags">' + tags + '</div>' : '') +
      actions +
    '</div></div>';
}
function renderFeed() {
  if (!state.feed) return;
  var b = state.feed.broadcasts.map(function (p) {
    return '<div class="broadcast"><div class="broadcast-label">' + ICON.pin + 'Pinned · Company broadcast</div>' + postHTML(p) + '</div>';
  }).join('');
  $('broadcastList').innerHTML = state.theme ? '' : b;
  var posts = state.feed.posts;
  $('feedList').innerHTML = posts.length ? posts.map(postHTML).join('') :
    '<div class="feed-empty">Nothing here yet. Be the first to share a concern — it stays anonymous.</div>';
  Object.keys(state.openThreads).forEach(function (id) { if (state.openThreads[id]) loadThread(id); });
}
function toggleSupport(id) {
  api('/api/posts/' + id + '/support', {}).then(function (p) {
    var el = $('post-' + id);
    if (el && p.id) { el.outerHTML = postHTML(p); if (state.openThreads[id]) loadThread(id); }
  });
}
function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  api('/api/posts/' + id, undefined, 'DELETE').then(function () { toast('Post deleted'); });
}
function toggleThread(id) {
  state.openThreads[id] = !state.openThreads[id];
  var el = $('thread-' + id);
  if (!el) return;
  el.classList.toggle('open', !!state.openThreads[id]);
  if (state.openThreads[id]) loadThread(id);
}
function loadThread(id) {
  api('/api/posts/' + id + '/comments').then(function (list) {
    var el = $('thread-' + id); if (!el) return;
    var draft = el.querySelector('input') ? el.querySelector('input').value : '';
    el.innerHTML = list.map(function (c) {
      return '<div class="comment">' + avatarHTML(c.author) + '<div><div class="comment-head"><b>' + esc(c.author.name) + '</b> · ' + esc(c.time) + '</div>' +
        textBlock(c, 'comment-body') + '</div></div>';
    }).join('') +
      '<div class="reply-box"><input placeholder="Reply anonymously…" value="' + esc(draft) + '" onkeydown="if(event.key===\'Enter\')sendComment(' + id + ',this)"><button class="btn-primary" onclick="sendComment(' + id + ',this.previousElementSibling)">Reply</button></div>';
  });
}
function sendComment(id, input) {
  var v = input.value.trim(); if (!v) return;
  input.value = '';
  api('/api/posts/' + id + '/comments', { content: v }).then(function () { loadThread(id); });
}

var previewComposer = debounce(function (text) {
  var box = $('composerPreview');
  if (text.trim().length < 12) { box.classList.remove('show'); return; }
  api('/api/translate', { text: text, target: detectLangGuess(text) === 'de' ? 'en' : 'de' }).then(function (d) {
    var other = d.source === 'de' ? 'English' : 'German';
    var tr = d.engine === 'none' ? '<span style="color:var(--text-muted)">(no translation engine reachable — readers see the original)</span>' :
      esc(d.translation) + (d.engine === 'glossary' ? ' <span style="color:var(--text-muted)">(offline glossary)</span>' : '');
    box.innerHTML = '<b>Detected theme:</b> ' + esc(d.theme) + '<br><b>' + other + ' readers will see:</b> ' + tr;
    box.classList.add('show');
  }).catch(function () {});
}, 700);
function detectLangGuess(t) { return /[äöüß]|\b(der|die|das|und|nicht|ich|wir|ist)\b/i.test(t) ? 'de' : 'en'; }
function onComposerInput(el) {
  el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  previewComposer(el.value);
}
function onMediaPicked(input) {
  var f = input.files && input.files[0]; if (!f) return;
  input.value = '';
  var isImg = /^image\//.test(f.type) && !/gif$/.test(f.type);
  var prep = isImg ? stripImageMetadata(f) : Promise.resolve(f);
  $('postBtn').disabled = true;
  prep.then(function (blob) {
    var fd = new FormData();
    var name = isImg ? 'photo.jpg' : f.name;
    fd.append('file', blob, name);
    return fetch('/api/upload', { method: 'POST', body: fd }).then(function (r) { return r.json(); });
  }).then(function (d) {
    $('postBtn').disabled = false;
    if (d.error) { toast(d.error); return; }
    state.media = d;
    var pv = $('mediaPreview');
    pv.innerHTML = (d.type === 'video' ? '<video src="' + d.url + '" controls></video>' : '<img src="' + d.url + '">') +
      '<button class="media-remove" onclick="clearMedia()">×</button>';
    pv.classList.add('show');
    if (isImg) toast('Photo location data removed');
  }).catch(function () { $('postBtn').disabled = false; toast('Upload failed'); });
}
function stripImageMetadata(file) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (b) { URL.revokeObjectURL(img.src); resolve(b || file); }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}
function clearMedia() { state.media = null; $('mediaPreview').innerHTML = ''; $('mediaPreview').classList.remove('show'); }
function submitPost() {
  var input = $('composerInput'), text = input.value.trim();
  if (!text && !state.media) { toast('Write something or add a photo'); return; }
  var body = { content: text, theme: $('themeSelect').value, zone: $('zoneSelect').value,
    media_url: state.media && state.media.url, media_type: state.media && state.media.type,
    broadcast: $('broadcastCheck') ? $('broadcastCheck').checked : false };
  $('postBtn').disabled = true;
  api('/api/posts', body).then(function (d) {
    input.value = ''; input.style.height = 'auto'; clearMedia();
    $('composerPreview').classList.remove('show');
    $('themeSelect').value = ''; $('zoneSelect').value = '';
    if ($('broadcastCheck')) $('broadcastCheck').checked = false;
    $('postBtn').disabled = false;
    var lbl = (THEMES[d.theme] || { label: 'Other' }).label;
    toast('Posted anonymously · filed under ' + lbl);
    if (state.sort !== 'latest') setSort('latest'); else loadFeed();
    $('feedScroll').scrollTop = 0;
  }).catch(function (e) { $('postBtn').disabled = false; toast(e.message); });
}

function loadInsights() {
  return api('/api/insights').then(function (d) { state.insights = d; renderThemeFilter(); renderInsightsPanel(); });
}
function mixBar(mix) {
  var total = 0; Object.keys(mix).forEach(function (k) { total += mix[k]; });
  return '<div class="mixbar">' + Object.keys(ROLES).filter(function (k) { return mix[k]; }).map(function (k) {
    return '<span style="width:' + (100 * mix[k] / total) + '%;background:' + ROLES[k].color + '" title="' + esc(ROLES[k].label) + ': ' + mix[k] + '"></span>';
  }).join('') + '</div>';
}
function renderInsightsPanel() {
  var el = $('aiContent');
  if (state.mode === 'square') {
    $('insTitle').textContent = 'Pulse Insights'; $('insSub').textContent = 'What the plant is saying';
    var d = state.insights; if (!d) { el.innerHTML = ''; return; }
    var max = Math.max.apply(null, d.themes.map(function (t) { return t.score; }).concat([1]));
    el.innerHTML =
      '<div class="ins-stats"><div class="ins-stat"><b>' + d.total_posts + '</b><span>concerns</span></div>' +
      '<div class="ins-stat"><b>' + d.participants + '</b><span>joined</span></div>' +
      '<div class="ins-stat"><b>' + d.de_share + '%</b><span>in German</span></div></div>' +
      '<div class="ins-section">Themes by weighted impact</div>' +
      d.themes.map(function (t) {
        return '<div class="ins-theme" style="border-left-color:' + t.color + '" onclick="setThemeFilter(\'' + t.key + '\')">' +
          '<div class="ins-theme-top"><span class="ins-theme-name">' + esc(t.label) + '</span><span class="ins-theme-score" style="color:' + t.color + '">' + t.score + '</span></div>' +
          '<div class="mixbar" style="height:4px;margin-top:6px"><span style="width:' + (100 * t.score / max) + '%;background:' + t.color + '"></span></div>' +
          '<div class="ins-theme-sum">' + esc(t.summary) + ' · ' + t.support + ' "me too"</div>' +
          mixBar(t.role_mix) + '</div>';
      }).join('') +
      '<div class="legend">' + Object.keys(ROLES).filter(function (k) { return k !== 'organizer'; }).map(function (k) {
        return '<span><i style="background:' + ROLES[k].color + '"></i>' + esc(ROLES[k].label) + ' ×' + ROLES[k].weight + '</span>';
      }).join('') + '</div>' +
      '<div class="engine-note">Priority = author weight + weighted "me too" + replies. Line workers count 1.5× so shop-floor voices rise first. ' +
      'Translation engine: ' + esc(d.tr_mode) + '.</div>';
  } else if (state.mode === 'voice') {
    $('insTitle').textContent = 'Translation & Context'; $('insSub').textContent = 'Tap any message';
    if (state.selectedMsg) showMessageInsight(state.selectedMsg);
    else el.innerHTML = '<div class="ai-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>' +
      '<div><b>Tap a message</b> to see the original, the translation and notes on German workplace terms (Betriebsrat, Takt, …).</div></div>';
  } else {
    $('insTitle').textContent = 'Live Room'; $('insSub').textContent = 'Who is here, how it feels';
    renderLivePanel();
  }
}
function showMessageInsight(m) {
  if (state.mode !== 'voice') return;
  state.selectedMsg = m;
  var el = $('aiContent');
  api('/api/translate', { text: m.content, target: m.lang === 'de' ? 'en' : 'de' }).then(function (d) {
    var other = m.lang === 'de' ? (m.content_en || d.translation) : (m.content_de || d.translation);
    el.innerHTML =
      '<div class="ai-suggestion"><div class="ai-suggestion-label">Original · ' + langName(m.lang) + '</div><div class="ai-suggestion-text">' + esc(m.content) + '</div></div>' +
      '<div class="ai-suggestion"><div class="ai-suggestion-label">' + (m.lang === 'de' ? 'English' : 'German') + '</div><div class="ai-suggestion-text">' + esc(other) + '</div></div>' +
      '<div class="ai-suggestion" style="border-left-color:#94A3B8"><div class="ai-suggestion-label" style="color:var(--text-secondary)">Theme</div><div class="ai-suggestion-text">' + esc(d.theme) + '</div></div>' +
      d.notes.map(function (n) { return '<div class="ai-suggestion note"><div class="ai-suggestion-label">Cultural note</div><div class="ai-suggestion-text">' + esc(n) + '</div></div>'; }).join('') +
      '<div class="engine-note">From ' + esc(m.display_name) + ' · ' + esc(m.time) + '</div>';
  });
}
function renderLivePanel() {
  var th = state.th, el = $('aiContent'); if (!th) return;
  var chips = Object.keys(th.online_roles).map(function (k) {
    return '<span class="role-chip"><i style="background:' + ROLES[k].color + '"></i>' + esc(ROLES[k].label) + ' · ' + th.online_roles[k] + '</span>';
  }).join('') || '<span class="engine-note">Nobody else online yet.</span>';
  var mood = th.pulse.avg >= 4 ? 'Mostly comfortable' : th.pulse.avg >= 3 ? 'Mixed' : 'Uneasy — slow down, listen';
  el.innerHTML =
    '<div class="ins-stats"><div class="ins-stat"><b>' + th.online + '</b><span>online now</span></div>' +
    '<div class="ins-stat"><b>' + th.pulse.avg + '</b><span>comfort /5</span></div>' +
    '<div class="ins-stat"><b>' + (th.poll ? th.poll.total : 0) + '</b><span>poll votes</span></div></div>' +
    '<div class="ins-section">In the room</div><div class="role-chips">' + chips + '</div>' +
    '<div class="ai-suggestion' + (th.pulse.avg < 3 ? ' note' : '') + '"><div class="ai-suggestion-label">Room mood</div><div class="ai-suggestion-text">' + mood + ' (' + th.pulse.n + ' responses)</div></div>' +
    '<div class="ins-section">Reactions so far</div><div class="role-chips">' + REACTIONS.map(function (r) {
      return '<span class="role-chip">' + r.e + ' ' + esc(r.l) + ' · ' + (th.reactions[r.k] || 0) + '</span>';
    }).join('') + '</div>' +
    (th.top_concerns[0] ? '<div class="ai-suggestion"><div class="ai-suggestion-label">Address next</div><div class="ai-suggestion-text"><b>' + esc(th.top_concerns[0].label) + '</b> — ' + esc(th.top_concerns[0].summary) + '</div></div>' : '');
}

function loadContacts() {
  return Promise.all([api('/api/contacts'), api('/api/rooms')]).then(function (r) {
    state.contacts = r[0]; state.rooms = r[1];
    renderContacts();
  });
}
var contactFilter = { tab: 'all', q: '' };
function renderContacts() {
  var q = contactFilter.q.toLowerCase();
  var list = state.contacts.filter(function (c) {
    if (contactFilter.tab === 'chats' && c.type !== 'chat') return false;
    if (contactFilter.tab === 'groups' && c.type !== 'group') return false;
    return c.name.toLowerCase().indexOf(q) !== -1;
  });
  var html = '';
  var groups = list.filter(function (c) { return c.type === 'group'; });
  var chats = list.filter(function (c) { return c.type === 'chat'; });
  if (groups.length) html += '<div class="list-label">Breakout rooms</div>' + groups.map(contactHTML).join('');
  var joinable = state.rooms.filter(function (r) { return !r.joined && r.name.toLowerCase().indexOf(q) !== -1; });
  if (joinable.length && contactFilter.tab !== 'chats') {
    html += '<div class="list-label">Open rooms</div>' + joinable.map(function (r) {
      return '<div class="contact-item"><div class="avatar contact-avatar group" style="background:var(--brand-tint)">' + esc(r.name.replace('Breakout', '').split(' ').filter(function (w) { return /^\w/.test(w); }).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase()) + '</div>' +
        '<div class="contact-info"><div class="contact-name">' + esc(r.name) + '</div><div class="contact-preview">' + r.members + ' members</div></div>' +
        '<button class="room-join" onclick="joinRoom(' + r.id + ')">Join</button></div>';
    }).join('');
  }
  if (chats.length) html += '<div class="list-label">Direct</div>' + chats.map(contactHTML).join('');
  $('chatsList').innerHTML = html || '<div class="feed-empty">No matches</div>';
}
function contactHTML(c) {
  var active = state.activeChat && state.activeChat.type === c.type && state.activeChat.target_id === c.target_id;
  var dot = c.type === 'chat' ? '<span class="status-dot ' + (c.status || 'offline') + '"></span>' : '';
  return '<div class="contact-item' + (active ? ' active' : '') + '" onclick="selectChat(\'' + c.type + '\',' + c.target_id + ')">' +
    '<div class="avatar contact-avatar' + (c.type === 'group' ? ' group' : '') + '" style="background:' + esc(c.color) + '">' + esc(c.initials) + dot + '</div>' +
    '<div class="contact-info"><div class="contact-name">' + esc(c.name) + '</div><div class="contact-preview">' + esc(c.preview || (c.role_label || '')) + '</div></div>' +
    '<span class="contact-time">' + esc(c.time || '') + '</span></div>';
}
function filterContacts(v) { contactFilter.q = v; renderContacts(); }
function switchTab(el, tab) {
  document.querySelectorAll('.sidebar-tab').forEach(function (t) { t.classList.remove('active'); });
  el.classList.add('active'); contactFilter.tab = tab; renderContacts();
}
function setContactStatus(uid, s) {
  state.contacts.forEach(function (c) { if (c.type === 'chat' && c.target_id === uid) c.status = s; });
  if (state.mode === 'voice') renderContacts();
}
function joinRoom(id) { api('/api/groups/' + id + '/join', {}).then(function () { loadContacts().then(function () { selectChat('group', id); }); }); }
function createGroup() {
  var name = prompt('Name of the breakout room (e.g. "Breakout · Early shift")');
  if (!name) return;
  api('/api/groups', { name: name, members: [] }).then(function (g) { loadContacts().then(function () { selectChat('group', g.id); }); });
}
function selectChat(type, id) {
  var c = state.contacts.filter(function (x) { return x.type === type && x.target_id === id; })[0];
  if (!c) return;
  if (state.currentRoom) socket.emit('leave_room', { room: state.currentRoom });
  state.activeChat = c;
  state.currentRoom = type === 'chat' ? 'chat_' + Math.min(ME.id, id) + '_' + Math.max(ME.id, id) : 'group_' + id;
  socket.emit('join_room', { room: state.currentRoom });
  $('chatAvatar').textContent = c.initials; $('chatAvatar').style.background = c.color;
  $('chatAvatar').style.color = c.type === 'group' ? 'var(--brand-ink)' : '#fff';
  $('chatAvatar').style.borderRadius = c.type === 'group' ? '12px' : '50%';
  $('chatName').textContent = c.name;
  $('chatStatus').textContent = c.type === 'group' ? 'Breakout room · ' + c.members + ' members · anonymous' : (c.role_label || '') + (c.status === 'online' ? ' · online' : '');
  document.body.classList.add('chat-open');
  renderContacts();
  api('/api/messages/' + type + '/' + id).then(function (msgs) {
    state.messages = msgs; state.selectedMsg = null; renderMessages();
    var last = msgs.filter(function (m) { return !m.is_me; }).slice(-1)[0];
    if (last) showMessageInsight(last); else renderInsightsPanel();
  });
}
function closeChatMobile() { document.body.classList.remove('chat-open'); }
function renderMessages() {
  if (!state.activeChat) return;
  var el = $('chatMessages');
  el.innerHTML = state.messages.length ? '' : '<div class="empty-chat">No messages yet. Say hallo!</div>';
  state.messages.forEach(appendMessage);
}
function appendMessage(m) {
  if (!state.activeChat) return;
  var el = $('chatMessages');
  var empty = el.querySelector('.empty-chat'); if (empty) empty.remove();
  var div = document.createElement('div');
  div.className = 'message-group' + (m.is_me ? ' sent' : '');
  if (m.pending) div.setAttribute('data-client', m.client_id);
  div.onclick = function () {
    document.querySelectorAll('.message-group.selected').forEach(function (x) { x.classList.remove('selected'); });
    div.classList.add('selected'); showMessageInsight(m);
  };
  var sender = (!m.is_me && state.activeChat.type === 'group') ? '<div class="msg-sender">' + esc(m.display_name) + '</div>' : '';
  var shown = (state.lang === 'de' ? m.content_de : m.content_en) || m.content;
  var translated = m.lang && m.lang !== state.lang && shown !== m.content;
  div.innerHTML = '<div class="avatar msg-avatar" style="background:' + esc(m.avatar_color) + '">' + esc(m.initials) + '</div>' +
    '<div class="msg-content">' + sender + '<div class="msg-bubble">' + esc(m.is_me ? m.content : shown) + '</div>' +
    '<div class="msg-meta">' + (m.msg_type === 'voice' ? ICON.mic + 'voice · ' : '') + esc(m.time) +
    (translated && !m.is_me ? ' · translated from ' + langName(m.lang) : '') + '</div></div>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
function sendMessage() {
  if (!state.activeChat) { toast('Pick a chat or room first'); return; }
  var input = $('chatInput'), text = input.value.trim(); if (!text) return;
  var cid = 'c' + Date.now();
  socket.emit('send_message', { content: text, chat_type: state.activeChat.type, target_id: state.activeChat.target_id,
    msg_type: state.pendingVoice ? 'voice' : 'text', client_id: cid });
  appendMessage({ pending: true, client_id: cid, is_me: true, content: text, avatar_color: ME.color, initials: ME.initials,
    time: new Date().toTimeString().slice(0, 5), msg_type: state.pendingVoice ? 'voice' : 'text', lang: state.lang });
  state.pendingVoice = false;
  input.value = ''; input.style.height = 'auto';
}
function handleEnter(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }

var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var rec = null, isRecording = false;
function toggleRecording() {
  if (!SR) { toast('Speech input needs Chrome, Edge or Safari'); return; }
  if (isRecording) { rec.stop(); return; }
  var input = $('chatInput'), base = input.value ? input.value + ' ' : '';
  rec = new SR(); rec.lang = $('speechLang').value; rec.interimResults = true; rec.continuous = false;
  rec.onresult = function (e) {
    var txt = ''; for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    input.value = base + txt; autoResize(input); state.pendingVoice = true;
  };
  rec.onerror = function (e) { toast('Mic: ' + e.error); };
  rec.onend = function () { setRecUI(false); };
  rec.start(); setRecUI(true);
}
function setRecUI(on) {
  isRecording = on;
  $('voiceBtn').classList.toggle('recording', on);
  $('voiceWaveform').classList.toggle('on', on);
  $('voiceStatus').textContent = on ? 'Listening…' : 'Mic speaks';
  $('voiceStatus').style.color = on ? 'var(--red)' : '';
}

function startCall(type) {
  if (!state.activeChat || state.activeChat.type !== 'chat') { toast('Calls work in direct chats'); return; }
  socket.emit('call_user', { target_id: state.activeChat.target_id, call_type: type });
  showVideoOverlay();
}
function acceptCall() { $('callModal').classList.remove('active'); socket.emit('accept_call', { caller_id: state.incomingCaller }); switchMode('voice'); showVideoOverlay(); }
function rejectCall() { $('callModal').classList.remove('active'); socket.emit('reject_call', { caller_id: state.incomingCaller }); }
function endCall() { if (state.activeChat) socket.emit('end_call', { target_id: state.activeChat.target_id }); hideVideoOverlay(); }
function showVideoOverlay() { $('videoOverlay').classList.add('active'); $('chatMessages').style.display = 'none'; $('voiceInputArea').style.display = 'none'; }
function hideVideoOverlay() { $('videoOverlay').classList.remove('active'); $('chatMessages').style.display = ''; $('voiceInputArea').style.display = ''; }

var REACTIONS = [{ k: 'agree', e: '👍', l: 'Agree' }, { k: 'unsure', e: '🤔', l: 'Unsure' },
                 { k: 'concern', e: '✋', l: 'Concern' }, { k: 'applause', e: '👏', l: 'Thanks' }];
var FACES = [{ e: '😟', l: 'Very uneasy' }, { e: '🙁', l: 'Uneasy' }, { e: '😐', l: 'Neutral' }, { e: '🙂', l: 'OK' }, { e: '😊', l: 'Confident' }];
var pollWeighted = false;
var surveyDraft = { heard: null, plan: null };

function loadTownHall() {
  return api('/api/townhall').then(function (d) { state.th = d; renderTownHall(); updatePhaseUI(); });
}
function updatePhaseUI() {
  var th = state.th; if (!th) return;
  $('liveDot').classList.toggle('on', th.phase === 'live');
  $('thMiniTitle').textContent = th.title; $('thMiniWhen').textContent = th.when;
  var pill = $('thMiniPhase');
  pill.className = 'phase-pill' + (th.phase === 'live' ? ' live' : th.phase === 'after' ? ' after' : '');
  pill.textContent = th.phase === 'live' ? '● Live now' : th.phase === 'after' ? 'Finished · survey open' : 'Collecting concerns';
}
function renderTownHall() {
  var th = state.th; if (!th) return;
  $('thTitle').textContent = th.title;
  $('thSub').textContent = th.when + ' · 60 min · ' + th.online + ' online';
  var steps = [['before', 'Before · collect'], ['live', 'Live · discuss & decide'], ['after', 'After · feedback']];
  var idx = steps.map(function (s) { return s[0]; }).indexOf(th.phase);
  $('stepper').innerHTML = steps.map(function (s, i) {
    var cls = 'step' + (i < idx ? ' done' : '') + (i === idx ? ' current' + (s[0] === 'live' ? ' live' : '') : '');
    return (i ? '<span class="step-sep"></span>' : '') + '<span class="' + cls + '"><span class="n">' + (i < idx ? '✓' : i + 1) + '</span><span class="t">' + s[1] + '</span></span>';
  }).join('');

  var max = Math.max.apply(null, th.top_concerns.map(function (t) { return t.score; }).concat([1]));
  $('concernList').innerHTML = th.top_concerns.map(function (t, i) {
    var total = 0; Object.keys(t.role_mix).forEach(function (k) { total += t.role_mix[k]; });
    var seg = Object.keys(ROLES).filter(function (k) { return t.role_mix[k]; }).map(function (k) {
      return '<span style="width:' + (100 * t.score / max) * (t.role_mix[k] / total) + '%;background:' + ROLES[k].color + '"></span>';
    }).join('');
    return '<div class="concern"><span class="concern-rank">#' + (i + 1) + '</span>' +
      '<span class="concern-title"><span class="theme-dot" style="background:' + t.color + '"></span>' + esc(t.label) + '</span>' +
      '<span class="concern-score">' + t.score + '</span>' +
      '<div class="concern-bar">' + seg + '</div>' +
      '<div class="concern-meta">' + esc(t.summary) + ' · ' + t.support + ' "me too"</div>' +
      '<div class="concern-quote">“' + esc(t.top_quote) + '”</div>' +
      (ME.isOrganizer ? '<button class="concern-add" onclick="prefillAction(\'' + t.key + '\')">+ Turn into action</button>' : '') +
    '</div>';
  }).join('') || '<div class="feed-empty">No concerns posted yet.</div>';
  $('roleLegend').innerHTML = Object.keys(ROLES).filter(function (k) { return k !== 'organizer'; }).map(function (k) {
    return '<span><i style="background:' + ROLES[k].color + '"></i>' + esc(ROLES[k].label) + '</span>';
  }).join('');

  renderPoll(); renderPulse(); renderReactions(); renderCharter(); renderSurvey();
  if (state.mode === 'townhall') renderLivePanel();
}
function renderPoll() {
  var p = state.th.poll, box = $('pollBox');
  if (!p) { box.innerHTML = '<div class="engine-note">No poll yet.</div>'; return; }
  var vals = pollWeighted ? p.weighted : p.counts;
  var tot = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
  box.innerHTML = '<div class="poll-q">' + esc(p.question) + '</div>' + p.options.map(function (o, i) {
    var pct = Math.round(100 * vals[i] / tot);
    var mine = p.my_vote === i;
    return '<button class="poll-opt' + (mine ? ' mine' : '') + '" ' + (p.is_open ? 'onclick="votePoll(' + p.id + ',' + i + ')"' : 'disabled') + '>' +
      '<span class="fill" style="width:' + pct + '%"></span>' +
      (mine ? '<span><svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>' : '') +
      '<span>' + esc(o) + '</span><span class="pct">' + pct + '%</span></button>';
  }).join('') +
    '<div class="poll-foot"><span>' + p.total + ' votes · ' + (p.is_open ? 'open' : 'closed') + '</span>' +
    '<label class="switch-label"><input type="checkbox" ' + (pollWeighted ? 'checked' : '') + ' onchange="pollWeighted=this.checked;renderPoll()"> Weighted by group</label></div>';
}
function votePoll(pid, i) { api('/api/townhall/poll/vote', { poll_id: pid, option: i }); }
function togglePollForm() { $('pollForm').classList.toggle('show'); }
function createPoll() {
  var q = $('pollQ').value.trim(), opts = $('pollOpts').value.split('\n');
  api('/api/townhall/poll', { question: q, options: opts }).then(function () {
    $('pollQ').value = ''; $('pollOpts').value = ''; $('pollForm').classList.remove('show'); toast('Poll is live');
  }).catch(function (e) { toast(e.message); });
}
function closePoll() { api('/api/townhall/poll/close', {}).then(function () { toast('Poll closed'); }); }
function renderPulse() {
  var p = state.th.pulse;
  $('faces').innerHTML = FACES.map(function (f, i) {
    return '<button class="face' + (p.mine === i + 1 ? ' on' : '') + '" onclick="sendPulse(' + (i + 1) + ')">' + f.e + '<span>' + f.l + '</span></button>';
  }).join('');
  $('pulseAvg').innerHTML = (p.n ? p.avg : '–') + '<small> / 5 · ' + p.n + '</small>';
  var mx = Math.max.apply(null, p.dist.concat([1]));
  $('pulseDist').innerHTML = p.dist.map(function (c, i) { return '<div title="' + FACES[i].l + ': ' + c + '" style="height:' + (100 * c / mx) + '%"></div>'; }).join('');
}
function sendPulse(v) { api('/api/townhall/pulse', { value: v }); }
function renderReactions() {
  var r = state.th.reactions;
  $('reactions').innerHTML = REACTIONS.map(function (x) {
    return '<button class="react-btn" onclick="react(\'' + x.k + '\', event)">' + x.e + '<span>' + x.l + '</span><b>' + (r[x.k] || 0) + '</b></button>';
  }).join('');
}
function react(k) { api('/api/townhall/react', { kind: k }); }
function floatEmoji(e) {
  var host = $('reactions').getBoundingClientRect();
  var s = document.createElement('div'); s.className = 'float-emoji'; s.textContent = e;
  s.style.left = (host.left + Math.random() * Math.max(40, host.width - 30)) + 'px';
  s.style.top = (host.top - 10) + 'px';
  document.body.appendChild(s); setTimeout(function () { s.remove(); }, 1700);
}
function renderCharter() {
  var acts = state.th.actions;
  $('charterBody').innerHTML = acts.map(function (a) {
    var status = ME.isOrganizer
      ? '<select class="mini-select" onchange="setActionStatus(' + a.id + ',this.value)">' + ['proposed', 'agreed', 'unresolved'].map(function (s) {
          return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'
      : '<span class="status-pill status-' + a.status + '">' + a.status + '</span>';
    return '<tr><td><span class="tag" style="background:' + a.theme_color + '1A;color:' + a.theme_color + '">' + esc(a.theme_label) + '</span></td>' +
      '<td class="c-title"><div class="charter-title">' + esc(a.title) + '</div></td>' +
      '<td style="color:var(--text-secondary)">' + esc(a.owner) + '</td><td style="color:var(--text-secondary)">' + esc(a.due) + '</td>' +
      '<td>' + status + '</td>' +
      '<td><div class="vote-btns"><button class="vote-btn agree' + (a.my_vote === 'agree' ? ' on' : '') + '" onclick="voteAction(' + a.id + ',\'agree\')">✓ Agree ' + a.agree + '</button>' +
      '<button class="vote-btn not_yet' + (a.my_vote === 'not_yet' ? ' on' : '') + '" onclick="voteAction(' + a.id + ',\'not_yet\')">Not yet ' + a.not_yet + '</button></div></td></tr>';
  }).join('') || '<tr><td colspan="6" class="engine-note" style="padding:14px 8px">No actions yet — the Product Team adds them live during the meeting.</td></tr>';
  if ($('actTheme') && !$('actTheme').options.length) {
    $('actTheme').innerHTML = Object.keys(THEMES).map(function (k) { return '<option value="' + k + '">' + esc(THEMES[k].label) + '</option>'; }).join('') + '<option value="other">Other</option>';
  }
}
function voteAction(id, v) { api('/api/townhall/actions/' + id + '/vote', { vote: v }); }
function setActionStatus(id, s) { api('/api/townhall/actions/' + id + '/status', { status: s }); }
function toggleActionForm() { $('actionForm').classList.toggle('show'); }
function prefillAction(theme) {
  $('actionForm').classList.add('show'); $('actTheme').value = theme; $('actTitle').focus();
}
function addAction() {
  api('/api/townhall/actions', { theme: $('actTheme').value, title: $('actTitle').value, owner: $('actOwner').value, due: $('actDue').value })
    .then(function () { ['actTitle', 'actOwner', 'actDue'].forEach(function (i) { $(i).value = ''; }); toast('Action added to the charter'); })
    .catch(function (e) { toast(e.message); });
}
function downloadCharter() {
  var th = state.th, lines = ['# Action Charter — ' + th.title, '', th.when, ''];
  th.actions.forEach(function (a, i) {
    lines.push((i + 1) + '. **' + a.title + '**', '   - Theme: ' + a.theme_label, '   - Owner: ' + (a.owner || '—') + ' · Due: ' + (a.due || '—'),
      '   - Status: ' + a.status + ' · Agree ' + a.agree + ' / Not yet ' + a.not_yet, '');
  });
  lines.push('', '## Top concerns at the time of export');
  th.top_concerns.forEach(function (t, i) { lines.push((i + 1) + '. ' + t.label + ' — ' + t.summary); });
  var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bridgepulse-action-charter.md'; a.click();
}
function renderSurvey() {
  var th = state.th, s = th.survey, el = $('surveyCard');
  var head = '<div class="th-card-head"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><h3>After the Town Hall</h3><span class="sub">did people feel heard?</span></div>';
  var body = '';
  if (ME.isOrganizer) {
    body = '<div class="stat-row"><div class="stat"><b>' + (s.n || 0) + '</b><span>responses</span></div>' +
      '<div class="stat"><b>' + (s.n ? s.heard_avg : '–') + '</b><span>felt heard (1–5)</span></div>' +
      '<div class="stat"><b>' + (s.plan ? s.plan.yes : 0) + ' / ' + (s.plan ? s.plan.partly : 0) + ' / ' + (s.plan ? s.plan.no : 0) + '</b><span>plan addresses concerns: yes / partly / no</span></div></div>' +
      ((s.comments && s.comments.length) ? '<div style="margin-top:12px">' + s.comments.map(function (c) { return '<div class="concern-quote" style="margin-bottom:6px">“' + esc(c) + '”</div>'; }).join('') + '</div>' : '') +
      (th.phase !== 'after' ? '<div class="engine-note" style="margin-top:10px">The survey opens for everyone when you press “End &amp; open survey”.</div>' : '');
  } else if (th.phase !== 'after') {
    body = '<div class="engine-note">A 2-question survey opens here when the Town Hall ends.</div>';
  } else if (s.done) {
    body = '<div class="survey-done">✓ Thank you — your answer is in. The final action charter stays visible here.</div>';
  } else {
    body = '<div class="survey-q">1. Did you feel heard in today’s Town Hall?</div><div class="scale">' + [1, 2, 3, 4, 5].map(function (n) {
      return '<button class="' + (surveyDraft.heard === n ? 'on' : '') + '" onclick="surveyDraft.heard=' + n + ';renderSurvey()">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="scale-labels"><span>Not at all</span><span>Completely</span></div>' +
      '<div class="survey-q">2. Does the action plan address your concerns?</div><div class="scale">' + [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']].map(function (o) {
      return '<button class="' + (surveyDraft.plan === o[0] ? 'on' : '') + '" onclick="surveyDraft.plan=\'' + o[0] + '\';renderSurvey()">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<textarea class="field" id="surveyComment" placeholder="Anything we missed? (optional, anonymous)"></textarea>' +
      '<div style="margin-top:10px"><button class="btn-primary" onclick="submitSurvey()">Send anonymously</button></div>';
  }
  el.innerHTML = head + body;
}
function submitSurvey() {
  if (!surveyDraft.heard || !surveyDraft.plan) { toast('Please answer both questions'); return; }
  api('/api/survey', { heard: surveyDraft.heard, plan: surveyDraft.plan, comment: ($('surveyComment') || {}).value || '' })
    .then(function () { toast('Thanks for your feedback'); loadTownHall(); });
}
function setPhase(p) { api('/api/townhall/phase', { phase: p }).then(function () { toast('Phase: ' + p); }); }

var capRec = null, capOn = false, capInterimEl = null;
function toggleCaptions() {
  if (!SR) { toast('Live speech needs Chrome, Edge or Safari — you can type below instead'); $('capInput').focus(); return; }
  if (capOn) { capOn = false; capRec.stop(); return; }
  capRec = new SR(); capRec.lang = $('capLang').value; capRec.interimResults = true; capRec.continuous = true;
  capRec.onresult = function (e) {
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var txt = e.results[i][0].transcript;
      if (e.results[i].isFinal) { sendCaption(txt, true); setInterim(''); } else setInterim(txt);
    }
  };
  capRec.onerror = function (e) { toast('Mic: ' + e.error); };
  capRec.onend = function () { if (capOn) { try { capRec.start(); } catch (x) {} } else setCapUI(false); };
  capOn = true; capRec.start(); setCapUI(true);
}
function setCapUI(on) { $('capMicBtn').classList.toggle('recording', on); $('capMicLabel').textContent = on ? 'Stop' : 'Speak'; }
function setInterim(txt) {
  var box = $('captions');
  if (!txt) { if (capInterimEl) { capInterimEl.remove(); capInterimEl = null; } return; }
  if (!capInterimEl) { capInterimEl = document.createElement('div'); capInterimEl.className = 'cap interim'; box.appendChild(capInterimEl); }
  capInterimEl.innerHTML = '<div class="cap-who">You · listening…</div><div class="cap-main">' + esc(txt) + '</div>';
  box.scrollTop = box.scrollHeight;
}
function sendCaption(text, fin) { text = (text || '').trim(); if (text) socket.emit('caption', { text: text, final: fin }); }
function addCaption(d) {
  var box = $('captions'), empty = box.querySelector('.cap-empty'); if (empty) empty.remove();
  var main = state.lang === 'de' ? d.de : d.en, alt = state.lang === 'de' ? d.en : d.de;
  var div = document.createElement('div'); div.className = 'cap';
  div.innerHTML = '<div class="cap-who">' + esc(d.speaker) + ' · ' + esc(d.time) + ' · spoke ' + langName(d.lang) + '</div>' +
    '<div class="cap-main">' + esc(main) + '</div>' + (alt !== main ? '<div class="cap-alt">' + esc(alt) + '</div>' : '');
  if (capInterimEl) box.insertBefore(div, capInterimEl); else box.appendChild(div);
  while (box.querySelectorAll('.cap:not(.interim)').length > 12) box.querySelector('.cap:not(.interim)').remove();
  box.scrollTop = box.scrollHeight;
}

function togglePanel(type) {
  var panel = type === 'notif' ? $('notifPanel') : $('settingsPanel');
  var open = panel.classList.contains('active');
  closeAllPanels();
  if (!open) { $('dropdownOverlay').classList.add('active'); panel.classList.add('active'); }
}
function closeAllPanels() { ['dropdownOverlay', 'notifPanel', 'settingsPanel'].forEach(function (i) { $(i).classList.remove('active'); }); }
function loadNotifications() {
  api('/api/notifications').then(function (list) {
    $('notifBadge').style.display = list.some(function (n) { return !n.read; }) ? 'block' : 'none';
    $('notifBody').innerHTML = list.map(function (n) {
      return '<div class="notif-item' + (n.read ? '' : ' unread') + '" onclick="this.classList.remove(\'unread\')"><div class="notif-dot' + (n.read ? ' read' : '') + '"></div>' +
        '<div><div class="notif-title">' + esc(n.title) + '</div><div class="notif-text">' + esc(n.text) + '</div></div></div>';
    }).join('');
  });
}
function loadSettings() {
  api('/api/settings').then(function (sections) {
    $('settingsBody').innerHTML = sections.map(function (sec) {
      return '<div class="settings-section"><div class="settings-section-title">' + esc(sec.title) + '</div>' + sec.items.map(function (it) {
        var ctl;
        if (it.type === 'language') {
          ctl = '<div class="lang-switch" style="display:flex"><button class="' + (state.lang === 'de' ? 'active' : '') + '" onclick="setLanguage(\'de\')">Deutsch</button><button class="' + (state.lang === 'en' ? 'active' : '') + '" onclick="setLanguage(\'en\')">English</button></div>';
        } else {
          ctl = '<label class="toggle-switch' + (it.locked ? ' locked' : '') + '" title="' + (it.locked ? 'Always on for privacy' : '') + '"><input type="checkbox"' + (it.default ? ' checked' : '') + (it.locked ? ' disabled' : '') + '><div class="toggle-track"></div><div class="toggle-thumb"></div></label>';
        }
        return '<div class="settings-row"><span class="settings-label">' + esc(it.label) + '</span>' + ctl + '</div>';
      }).join('') + '</div>';
    }).join('');
  });
}

(function init() {
  $('langDe').classList.toggle('active', state.lang === 'de');
  $('langEn').classList.toggle('active', state.lang === 'en');
  var ts = $('themeSelect');
  Object.keys(THEMES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = THEMES[k].label; ts.appendChild(o); });
  var o = document.createElement('option'); o.value = 'other'; o.textContent = 'Other'; ts.appendChild(o);
  try { new QRCode($('qrBox'), { text: BOOT.joinUrl, width: 128, height: 128, colorDark: '#0B3C5D', colorLight: '#ffffff' }); } catch (e) {}
  $('qrUrl').textContent = BOOT.joinUrl.replace(/^https?:\/\//, '');
  loadFeed(); loadInsights(); loadTownHall(); loadContacts(); loadNotifications(); loadSettings();
  var saved = null; try { saved = localStorage.getItem('bp_mode'); } catch (e) {}
  switchMode(saved && $(saved + 'Panel') ? saved : 'square');
})();
