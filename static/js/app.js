'use strict';

var ME = BOOT.me, THEMES = BOOT.themes, ROLES = BOOT.roles;
var QT = BOOT.quickTags, SENTS = BOOT.sentiments, ZONES = BOOT.zones, AGENDA = BOOT.agenda;
var state = {
  mode: 'square', lang: ME.language,
  sort: 'latest', theme: '',
  feed: null, insights: null, th: null,
  openThreads: {},
  contacts: [], rooms: [], activeChat: null, currentRoom: null, messages: [], selectedMsg: null,
  media: null, pendingVoice: false
};
var quick = { tags: [], sentiment: null, zone: '', voice: '' };
var composerMode = ME.isOrganizer ? 'write' : 'quick';

var TX = {
  en: {
    quick: 'Quick report', write: 'Write', postingAs: 'Posting as',
    step1: 'What is the problem?', step1h: 'tap up to 3', step2: 'Say more (optional)',
    speak: 'Tap to speak', listening: 'Listening… tap to stop', photo: 'Photo',
    voicePh: 'Your words appear here. You can also type.', step3: 'How do you feel about it?', swipe: 'Swipe or tap a face',
    step4: 'Where? (optional)', send: 'Send report', sending: 'Sending…', sent: 'Sent anonymously. Thank you!',
    needOne: 'Tap a problem or say something first', max3: 'Up to 3 problems per report',
    noSpeech: 'Voice input is not available in this browser. Tap the text box and use the microphone on your keyboard.',
    micBlocked: 'Microphone blocked. Allow it in the browser, or use the microphone on your keyboard.',
    noSpeechHeard: 'Didn\'t catch that. Hold the phone closer and try again.',
    micNetwork: 'The speech service is unreachable. Use the microphone on your keyboard instead.',
    micError: 'Voice input stopped',
    zlTitle: 'Zero-Log Shield', zlClose: 'Got it',
    zl1: 'No name, e-mail, phone number or password', zl2: 'No IP address, device or browser data is recorded',
    zl3: 'Others only see your group and a random handle', zl4: 'Photo location data is removed before upload',
    zl5: 'What is stored: your report, your group and your language',
    nowDiscussing: 'Now discussing', nowHint: 'React or vote below',
    actionLink: 'In the action charter', statusProposed: 'proposed', statusAgreed: 'agreed', statusUnresolved: 'unresolved', statusSigned: 'signed',
    agTitle: 'Co-Design Agreement', agSub: 'final 15 minutes · trial rules both sides sign',
    agLater: 'Opens in the final 15 minutes. Union reps and plant management agree on concrete trial rules and co-sign the charter. You can show your view on each rule.',
    agWorks: 'Works for me', agNotYet: 'Not yet', agWaiting: 'not signed yet', agSign: 'Sign for my group',
    agConfirm: 'Sign the charter and these trial rules for your group? Changing a value later clears all signatures.',
    agLocked: 'Signed & locked', agLockedLong: 'Signed by all three groups and locked on', agOpen: 'Open the signed charter',
    agCleared: 'Values changed, so the signatures were cleared. Everyone signs the final version.',
    agCleared2: 'The action charter changed, so the signatures were cleared. Everyone signs the final version.',
    agYouSigned: 'You signed for your group',
    metoo: 'Me too', replyPh: 'Reply anonymously…', reply: 'Reply',
    writePh: "What's on your mind? German or English is fine…", signOut: 'Sign out'
  },
  de: {
    quick: 'Schnellmeldung', write: 'Schreiben', postingAs: 'Du postest als',
    step1: 'Was ist das Problem?', step1h: 'bis zu 3 antippen', step2: 'Mehr sagen (optional)',
    speak: 'Tippen und sprechen', listening: 'Ich höre zu … zum Stoppen tippen', photo: 'Foto',
    voicePh: 'Deine Worte erscheinen hier. Du kannst auch tippen.', step3: 'Wie fühlst du dich dabei?', swipe: 'Wischen oder Gesicht antippen',
    step4: 'Wo? (optional)', send: 'Meldung senden', sending: 'Wird gesendet …', sent: 'Anonym gesendet. Danke!',
    needOne: 'Tippe zuerst ein Problem an oder sprich etwas', max3: 'Höchstens 3 Probleme pro Meldung',
    noSpeech: 'Spracheingabe geht in diesem Browser nicht. Tippe ins Textfeld und nutze das Mikrofon deiner Tastatur.',
    micBlocked: 'Mikrofon blockiert. Erlaube es im Browser oder nutze das Mikrofon deiner Tastatur.',
    noSpeechHeard: 'Nichts verstanden. Halte das Handy näher und versuche es noch einmal.',
    micNetwork: 'Der Sprachdienst ist nicht erreichbar. Nutze das Mikrofon deiner Tastatur.',
    micError: 'Spracheingabe beendet',
    zlTitle: 'Zero-Log Shield', zlClose: 'Verstanden',
    zl1: 'Kein Name, keine E-Mail, keine Telefonnummer, kein Passwort', zl2: 'Keine IP-Adresse, keine Geräte- oder Browserdaten gespeichert',
    zl3: 'Andere sehen nur deine Gruppe und ein zufälliges Kürzel', zl4: 'Standortdaten in Fotos werden vor dem Hochladen entfernt',
    zl5: 'Gespeichert wird: deine Meldung, deine Gruppe und deine Sprache',
    nowDiscussing: 'Jetzt im Gespräch', nowHint: 'Unten reagieren oder abstimmen',
    actionLink: 'Im Maßnahmenplan', statusProposed: 'vorgeschlagen', statusAgreed: 'vereinbart', statusUnresolved: 'offen', statusSigned: 'unterschrieben',
    agTitle: 'Gemeinsame Vereinbarung', agSub: 'letzte 15 Minuten · Testregeln, die beide Seiten unterschreiben',
    agLater: 'Öffnet in den letzten 15 Minuten. Betriebsrat und Werksleitung legen konkrete Testregeln fest und unterschreiben den Plan. Du kannst bei jeder Regel deine Meinung zeigen.',
    agWorks: 'Passt für mich', agNotYet: 'Noch nicht', agWaiting: 'noch nicht unterschrieben', agSign: 'Für meine Gruppe unterschreiben',
    agConfirm: 'Den Plan und diese Testregeln für deine Gruppe unterschreiben? Spätere Änderungen löschen alle Unterschriften.',
    agLocked: 'Unterschrieben & gesperrt', agLockedLong: 'Von allen drei Gruppen unterschrieben und gesperrt am', agOpen: 'Unterschriebenen Plan öffnen',
    agCleared: 'Werte wurden geändert, daher wurden die Unterschriften gelöscht. Alle unterschreiben die endgültige Fassung.',
    agCleared2: 'Der Maßnahmenplan wurde geändert, daher wurden die Unterschriften gelöscht. Alle unterschreiben die endgültige Fassung.',
    agYouSigned: 'Du hast für deine Gruppe unterschrieben',
    metoo: 'Ich auch', replyPh: 'Anonym antworten …', reply: 'Antworten',
    writePh: 'Was beschäftigt dich? Deutsch oder Englisch, beides geht …', signOut: 'Abmelden'
  }
};
function tx(k) { var d = TX[state.lang] || TX.en; return d[k] != null ? d[k] : (TX.en[k] != null ? TX.en[k] : k); }
function themeLabel(key) { var t = THEMES[key] || THEMES.other; return state.lang === 'de' ? (t.label_de || t.label) : t.label; }
function themeKeys() { return Object.keys(THEMES).filter(function (k) { return k !== 'other'; }).concat(['other']); }
function tagLabel(k) { var t = QT[k]; return t ? (t[state.lang] || t.en) : k; }
function feelLabel(v) { var s = SENTS[v]; return s ? (s[state.lang] || s.en) : ''; }

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
function trFrom(l) {
  if (state.lang === 'de') return 'Übersetzt aus dem ' + (l === 'de' ? 'Deutschen' : 'Englischen');
  return 'Translated from ' + langName(l);
}
function scrollPanelTo(el) {
  var box = el && el.closest('.th-scroll, .feed-scroll'); if (!box) return;
  var top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 90;
  box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}
function personName(p) {
  if (p.role === 'organizer' || state.lang !== 'de' || !ROLES[p.role]) return p.name;
  return 'Anonym · ' + ROLES[p.role].label_de;
}
function roleLabel(p) { return state.lang === 'de' && ROLES[p.role] ? ROLES[p.role].label_de : p.role_label; }
function avatarHTML(p, cls) {
  return '<div class="avatar ' + (cls || '') + '" style="background:' + esc(p.color) + '">' + esc(p.initials) + '</div>';
}
function roleBadge(p) {
  if (p.role === 'organizer') return '<svg class="verified" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 2.2 3.4-.3.9 3.3 3 1.6-1.2 3.2 1.2 3.2-3 1.6-.9 3.3-3.4-.3L12 23l-2.6-2.2-3.4.3-.9-3.3-3-1.6L3.3 13 2.1 9.8l3-1.6.9-3.3 3.4.3z"/><path d="M8 12.5l2.6 2.5L16 9.5" stroke="#fff" stroke-width="2" fill="none"/></svg>';
  return '<span class="role-badge" style="background:' + esc(p.color) + '">' + esc(roleLabel(p)) + '</span>';
}
var _trSeq = 0;
function textBlock(o, cls) {
  var lang = state.lang;
  var shown = (lang === 'de' ? o.content_de : o.content_en) || o.content;
  var html = '<div class="' + cls + '">' + esc(shown) + '</div>';
  if (o.lang && o.lang !== lang && o.content && shown !== o.content) {
    var id = 'tr' + (++_trSeq);
    html += '<div class="tr-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>' +
      esc(trFrom(o.lang)) + ' · <button onclick="$(\'' + id + '\').classList.toggle(\'show\')">' + esc(state.lang === 'de' ? 'Original zeigen' : 'Show original') + '</button></div>' +
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
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
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
  document.body.classList.remove('mode-square', 'mode-voice', 'mode-townhall');
  document.body.classList.add('mode-' + mode);
  document.body.classList.toggle('chat-open', !!(state.activeChat && mode === 'voice'));
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
  document.documentElement.lang = l;
  $('langDe').classList.toggle('active', l === 'de');
  $('langEn').classList.toggle('active', l === 'en');
  api('/api/me', { language: l }).catch(function () {});
  renderFeed(); renderMessages(); renderInsightsPanel(); if (state.th) renderTownHall();
  renderThemeFilter(); renderComposerLabels(); renderQuick();
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
  var keys = themeKeys();
  var total = state.insights ? state.insights.total_posts : '';
  var html = '<button class="theme-filter-item' + (state.theme ? '' : ' active') + '" onclick="setThemeFilter(\'\')"><span class="theme-dot" style="background:var(--brand)"></span>All concerns<span class="count">' + total + '</span></button>';
  var chips = '<button class="tag" style="border:1px solid var(--border);background:' + (state.theme ? '#fff' : 'var(--brand)') + ';color:var(--brand-ink);cursor:pointer" onclick="setThemeFilter(\'\')">All</button>';
  keys.forEach(function (k) {
    var meta = THEMES[k] || THEMES.other;
    html += '<button class="theme-filter-item' + (state.theme === k ? ' active' : '') + '" onclick="setThemeFilter(\'' + k + '\')"><span class="theme-dot" style="background:' + meta.color + '"></span>' + esc(themeLabel(k)) + '<span class="count">' + (counts[k] || 0) + '</span></button>';
    var on = state.theme === k;
    chips += '<button class="tag" style="cursor:pointer;white-space:nowrap;border:1px solid ' + meta.color + ';background:' + (on ? meta.color : '#fff') + ';color:' + (on ? '#fff' : meta.color) + '" onclick="setThemeFilter(\'' + k + '\')">' + esc(themeLabel(k)) + '</button>';
  });
  $('themeFilter').innerHTML = html;
  $('chipRow').innerHTML = chips;
}
function themeTag(p) {
  if (!p.theme || p.theme === 'other' && p.is_broadcast) return '';
  return '<span class="tag" style="background:' + p.theme_color + '1A;color:' + p.theme_color + '"><span class="theme-dot" style="background:' + p.theme_color + ';width:7px;height:7px"></span>' + esc(themeLabel(p.theme)) + '</span>';
}
function quickChips(p) {
  var html = (p.tags || []).map(function (k) {
    var t = QT[k]; if (!t) return '';
    return '<span class="qchip" style="--tc:' + ((THEMES[t.theme] || THEMES.other).color) + '"><span class="qchip-i">' + t.icon + '</span>' + esc(tagLabel(k)) + '</span>';
  }).join('');
  if (p.sentiment && SENTS[p.sentiment]) html += '<span class="feel-chip">' + SENTS[p.sentiment].face + ' ' + esc(feelLabel(p.sentiment)) + '</span>';
  return html ? '<div class="qchips">' + html + '</div>' : '';
}
function statusWord(s) {
  return tx({ proposed: 'statusProposed', agreed: 'statusAgreed', unresolved: 'statusUnresolved', signed: 'statusSigned' }[s] || 'statusProposed');
}
function actionLink(p) {
  if (!p.action) return '';
  return '<div class="post-action-link st-' + esc(p.action.status) + '">' + ICON.pen + '<span>' + esc(tx('actionLink')) + ': <b>' + esc(p.action.title) + '</b> · ' + esc(statusWord(p.action.status)) + '</span></div>';
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
      '<button class="act-btn metoo' + (p.supported ? ' on' : '') + '" onclick="toggleSupport(' + p.id + ')" title="Me too">' + ICON.heart + esc(tx('metoo')) + (p.support ? ' · ' + p.support : '') + '</button>' +
      '<span class="post-score" title="Role-weighted priority">' + ICON.bars + p.score + '</span>' +
    '</div>' +
    '<div class="thread' + (state.openThreads[p.id] ? ' open' : '') + '" id="thread-' + p.id + '"></div>';
  return '<div class="post" id="post-' + p.id + '">' +
    avatarHTML(a, 'post-avatar') +
    '<div class="post-main">' +
      '<div class="post-head"><span class="post-name">' + esc(personName(a)) + '</span>' + roleBadge(a) +
        '<span class="post-handle">' + esc(a.handle) + '</span><span class="post-time">· ' + esc(p.time) + '</span>' +
        (canDel ? '<button class="post-del" title="Delete" onclick="deletePost(' + p.id + ')">' + ICON.trash + '</button>' : '') +
      '</div>' +
      quickChips(p) +
      (p.content ? textBlock(p, 'post-body') : '') + media +
      (tags ? '<div class="post-tags">' + tags + '</div>' : '') +
      actionLink(p) +
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
      return '<div class="comment">' + avatarHTML(c.author) + '<div><div class="comment-head"><b>' + esc(personName(c.author)) + '</b> · ' + esc(c.time) + '</div>' +
        textBlock(c, 'comment-body') + '</div></div>';
    }).join('') +
      '<div class="reply-box"><input placeholder="' + esc(tx('replyPh')) + '" value="' + esc(draft) + '" onkeydown="if(event.key===\'Enter\')sendComment(' + id + ',this)"><button class="btn-primary" onclick="sendComment(' + id + ',this.previousElementSibling)">' + esc(tx('reply')) + '</button></div>';
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
  setUploading(true);
  prep.then(function (blob) {
    var fd = new FormData();
    var name = isImg ? 'photo.jpg' : f.name;
    fd.append('file', blob, name);
    return fetch('/api/upload', { method: 'POST', body: fd }).then(function (r) { return r.json(); });
  }).then(function (d) {
    setUploading(false);
    if (d.error) { toast(d.error); return; }
    state.media = d;
    var pv = $('mediaPreview');
    pv.innerHTML = (d.type === 'video' ? '<video src="' + d.url + '" controls></video>' : '<img src="' + d.url + '">') +
      '<button class="media-remove" onclick="clearMedia()">×</button>';
    pv.classList.add('show');
    if (isImg) toast(state.lang === 'de' ? 'Standortdaten im Foto entfernt' : 'Photo location data removed');
  }).catch(function () { setUploading(false); toast('Upload failed'); });
}
function setUploading(on) {
  ['postBtn', 'quickSend'].forEach(function (id) { if ($(id)) $(id).disabled = on; });
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

function renderComposerLabels() {
  if ($('cmQuickLbl')) { $('cmQuickLbl').textContent = tx('quick'); $('cmWriteLbl').textContent = tx('write'); }
  if (!ME.isOrganizer && $('postingAs')) {
    var name = state.lang === 'de' ? 'Anonym · ' + ME.roleLabelDe : ME.name;
    $('postingAs').innerHTML = esc(tx('postingAs')) + ' <b>' + esc(name) + '</b>';
  }
  if ($('quickSend')) $('quickSend').textContent = tx('send');
  if (!ME.isOrganizer && $('composerInput')) $('composerInput').placeholder = tx('writePh');
}
function setComposerMode(m) {
  if (ME.isOrganizer) m = 'write';
  composerMode = m;
  if ($('quickPane')) $('quickPane').classList.toggle('hidden', m !== 'quick');
  $('writePane').classList.toggle('hidden', m !== 'write');
  if ($('cmQuick')) { $('cmQuick').classList.toggle('active', m === 'quick'); $('cmWrite').classList.toggle('active', m === 'write'); }
  var slot = m === 'quick' && $('quickMediaSlot') ? $('quickMediaSlot') : $('writeMediaSlot');
  slot.appendChild($('mediaPreview'));
  try { localStorage.setItem('bp_cmode', m); } catch (e) {}
}
function renderQuick() {
  var el = $('quickBody'); if (!el) return;
  var tiles = BOOT.quickOrder.map(function (k) {
    var t = QT[k], on = quick.tags.indexOf(k) !== -1, color = (THEMES[t.theme] || THEMES.other).color;
    return '<button class="qtag' + (on ? ' on' : '') + '" style="--tc:' + color + '" aria-pressed="' + on + '" onclick="toggleQuickTag(\'' + k + '\')">' +
      '<span class="qi">' + t.icon + '</span><span class="ql">' + esc(tagLabel(k)) + '</span>' + (on ? '<span class="qcheck">✓</span>' : '') + '</button>';
  }).join('');
  var zones = ZONES.map(function (z, i) {
    return '<button class="zchip' + (quick.zone === z ? ' on' : '') + '" onclick="pickZone(' + i + ')">' + ICON.place + esc(z) + '</button>';
  }).join('');
  el.innerHTML =
    '<div class="qstep"><b>1</b>' + esc(tx('step1')) + '<small>' + esc(tx('step1h')) + '</small></div>' +
    '<div class="qtag-grid">' + tiles + '</div>' +
    '<div class="qstep"><b>2</b>' + esc(tx('step2')) + '</div>' +
    '<div class="qvoice"><button class="big-mic' + (qRecOn ? ' recording' : '') + '" id="qMicBtn" onclick="toggleQuickMic()">' + ICON.mic + '<span>' + esc(qRecOn ? tx('listening') : tx('speak')) + '</span></button>' +
      '<button class="big-photo" onclick="$(\'mediaInput\').click()">' + ICON.camera + '<span>' + esc(tx('photo')) + '</span></button></div>' +
    '<textarea class="qvoice-text' + (quick.voice ? ' has' : '') + '" id="qVoiceText" rows="2" placeholder="' + esc(tx('voicePh')) + '" oninput="quick.voice=this.value;this.classList.toggle(\'has\',!!this.value)">' + esc(quick.voice) + '</textarea>' +
    '<div class="qstep"><b>3</b>' + esc(tx('step3')) + '</div>' + feelHTML() +
    '<div class="qstep"><b>4</b>' + esc(tx('step4')) + '</div><div class="zone-chips">' + zones + '</div>';
  renderComposerLabels();
}
function feelHTML() {
  var v = quick.sentiment, s = v ? SENTS[v] : null;
  return '<div class="feel' + (v ? '' : ' unset') + '" id="feelBox">' +
    '<div class="feel-now"><span class="feel-face" id="feelFace">' + (s ? s.face : '👆') + '</span><span class="feel-label" id="feelLabel">' + esc(s ? feelLabel(v) : tx('swipe')) + '</span></div>' +
    '<input type="range" min="1" max="5" step="1" value="' + (v || 3) + '" class="feel-range" id="feelRange" aria-label="' + esc(tx('step3')) + '" oninput="onFeel(this.value)" onchange="onFeel(this.value)">' +
    '<div class="feel-scale">' + [1, 2, 3, 4, 5].map(function (i) { return '<button onclick="onFeel(' + i + ')" aria-label="' + esc(feelLabel(i)) + '">' + SENTS[i].face + '</button>'; }).join('') + '</div></div>';
}
function onFeel(v) {
  v = +v; quick.sentiment = v;
  $('feelBox').classList.remove('unset');
  $('feelFace').textContent = SENTS[v].face;
  $('feelLabel').textContent = feelLabel(v);
  $('feelRange').value = v;
}
function toggleQuickTag(k) {
  var i = quick.tags.indexOf(k);
  if (i !== -1) quick.tags.splice(i, 1);
  else if (quick.tags.length >= 3) { toast(tx('max3')); return; }
  else quick.tags.push(k);
  if (navigator.vibrate) navigator.vibrate(15);
  renderQuick();
}
function pickZone(i) { quick.zone = quick.zone === ZONES[i] ? '' : ZONES[i]; renderQuick(); }
function speechLangCode() { return state.lang === 'de' ? 'de-DE' : 'en-US'; }
function speechError(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return tx('micBlocked');
  if (code === 'no-speech') return tx('noSpeechHeard');
  if (code === 'network') return tx('micNetwork');
  if (code === 'aborted') return '';
  return tx('micError') + ' (' + code + ')';
}
var qRec = null, qRecOn = false;
function toggleQuickMic() {
  if (!SR) { toast(tx('noSpeech')); if ($('qVoiceText')) $('qVoiceText').focus(); return; }
  if (qRecOn && qRec) { qRec.stop(); return; }
  var base = quick.voice ? quick.voice.replace(/\s+$/, '') + ' ' : '';
  qRec = new SR(); qRec.lang = speechLangCode(); qRec.interimResults = true; qRec.continuous = false;
  qRec.onresult = function (e) {
    var txt = ''; for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    quick.voice = base + txt;
    var t = $('qVoiceText'); if (t) { t.value = quick.voice; t.classList.add('has'); }
  };
  qRec.onerror = function (e) { var m = speechError(e.error); if (m) toast(m); };
  qRec.onend = function () { qRecOn = false; updateQuickMic(); };
  try { qRec.start(); qRecOn = true; updateQuickMic(); if (navigator.vibrate) navigator.vibrate(30); } catch (x) { toast(tx('noSpeech')); }
}
function updateQuickMic() {
  var b = $('qMicBtn'); if (!b) return;
  b.classList.toggle('recording', qRecOn);
  b.querySelector('span').textContent = qRecOn ? tx('listening') : tx('speak');
}
function submitQuick() {
  var voice = (quick.voice || '').trim();
  if (!quick.tags.length && !voice && !state.media) { toast(tx('needOne')); return; }
  if (qRecOn && qRec) qRec.stop();
  var btn = $('quickSend'); btn.disabled = true; btn.textContent = tx('sending');
  api('/api/posts', { tags: quick.tags, sentiment: quick.sentiment, zone: quick.zone, content: voice,
    media_url: state.media && state.media.url, media_type: state.media && state.media.type })
    .then(function () {
      quick = { tags: [], sentiment: null, zone: '', voice: '' };
      clearMedia(); renderQuick(); btn.disabled = false; showSent();
      if (state.sort !== 'latest') setSort('latest'); else loadFeed();
    })
    .catch(function (e) { btn.disabled = false; btn.textContent = tx('send'); toast(e.message); });
}
function showSent() {
  $('sentText').textContent = tx('sent');
  $('sentOverlay').classList.add('show');
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  setTimeout(function () { $('sentOverlay').classList.remove('show'); }, 1800);
}
var dRec = null, dOn = false;
function dictate(inputId, btnId) {
  var input = $(inputId), btn = $(btnId);
  if (!SR) { toast(tx('noSpeech')); input.focus(); return; }
  if (dOn && dRec) { dRec.stop(); return; }
  var base = input.value ? input.value.replace(/\s+$/, '') + ' ' : '';
  dRec = new SR(); dRec.lang = speechLangCode(); dRec.interimResults = true; dRec.continuous = false;
  dRec.onresult = function (e) {
    var txt = ''; for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    input.value = base + txt; input.dispatchEvent(new Event('input'));
  };
  dRec.onerror = function (e) { var m = speechError(e.error); if (m) toast(m); };
  dRec.onend = function () { dOn = false; if (btn) btn.classList.remove('recording'); };
  try { dRec.start(); dOn = true; if (btn) btn.classList.add('recording'); } catch (x) { toast(tx('noSpeech')); }
}
function defaultBig() {
  if (ME.isOrganizer || ME.role === 'director') return false;
  return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}
function applyBig(on) {
  document.body.classList.toggle('big', on);
  $('bigBtn').classList.toggle('on', on);
  $('bigBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
}
function toggleBig(force) {
  var on = typeof force === 'boolean' ? force : !document.body.classList.contains('big');
  applyBig(on);
  try { localStorage.setItem('bp_big', on ? '1' : '0'); } catch (e) {}
  loadSettings();
}
function initBig() {
  var v = null; try { v = localStorage.getItem('bp_big'); } catch (e) {}
  applyBig(v === null ? defaultBig() : v === '1');
}
function showZeroLog() {
  $('zlCard').innerHTML = '<h3>' + ICON.shield + esc(tx('zlTitle')) + '</h3><ul class="zl-list">' +
    ['zl1', 'zl2', 'zl3', 'zl4'].map(function (k) { return '<li>' + esc(tx(k)) + '</li>'; }).join('') + '</ul>' +
    '<p class="zl-note">' + esc(tx('zl5')) + '</p><button class="btn-primary zl-ok" onclick="$(\'zlModal\').classList.remove(\'show\')">' + esc(tx('zlClose')) + '</button>';
  $('zlModal').classList.add('show');
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
      (d.tag_totals && d.tag_totals.length ? '<div class="ins-section">Most reported (quick reports)</div><div class="qchips">' +
        d.tag_totals.slice(0, 6).map(function (kv) { var t = QT[kv[0]]; return t ? '<span class="qchip sm" style="--tc:' + (THEMES[t.theme] || THEMES.other).color + '"><span class="qchip-i">' + t.icon + '</span>' + esc(tagLabel(kv[0])) + ' <b>×' + kv[1] + '</b></span>' : ''; }).join('') + '</div>' : '') +
      '<div class="ins-section">Themes by weighted impact</div>' +
      d.themes.map(function (t) {
        return '<div class="ins-theme" style="border-left-color:' + t.color + '" onclick="setThemeFilter(\'' + t.key + '\')">' +
          '<div class="ins-theme-top"><span class="ins-theme-name">' + esc(themeLabel(t.key)) + '</span><span class="ins-theme-score" style="color:' + t.color + '">' + t.score + '</span></div>' +
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
  if (!SR) { toast(tx('noSpeech')); $('chatInput').focus(); return; }
  if (isRecording) { rec.stop(); return; }
  var input = $('chatInput'), base = input.value ? input.value + ' ' : '';
  rec = new SR(); rec.lang = $('speechLang').value; rec.interimResults = true; rec.continuous = false;
  rec.onresult = function (e) {
    var txt = ''; for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    input.value = base + txt; autoResize(input); state.pendingVoice = true;
  };
  rec.onerror = function (e) { var m = speechError(e.error); if (m) toast(m); };
  rec.onend = function () { setRecUI(false); };
  try { rec.start(); setRecUI(true); } catch (x) { toast(tx('noSpeech')); }
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

var clockOffset = 0;
function loadTownHall() {
  return api('/api/townhall').then(function (d) {
    state.th = d;
    if (d.clock) clockOffset = d.clock.server_now * 1000 - Date.now();
    renderTownHall(); updatePhaseUI();
  });
}
function clockNow() { return (Date.now() + clockOffset) / 1000; }
function elapsedMin() {
  var th = state.th, c = th && th.clock;
  if (!c || !c.started) return 0;
  var end = th.phase === 'after' && c.ended ? c.ended : clockNow();
  return Math.max(0, (end - c.started) / 60);
}
function fmtMin(m) { var s = Math.max(0, Math.floor(m * 60)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function renderClock() {
  var th = state.th, el = $('thClock'); if (!th || !el) return;
  if (th.phase === 'before' || !th.clock.started) {
    el.innerHTML = '<span class="clk-big idle">60:00</span><span class="clk-sub">' + (ME.isOrganizer ? 'starts when you go live' : 'starts soon') + '</span>';
  } else {
    var e = elapsedMin(), rem = Math.max(0, th.clock.duration - e);
    var warn = th.phase === 'live' && rem <= 15;
    el.innerHTML = '<span class="clk-big' + (warn ? ' warn' : '') + '">' + fmtMin(rem) + '</span><span class="clk-sub">' +
      (th.phase === 'after' ? 'ended after ' + Math.round(e) + ' min' : 'left · ' + Math.floor(e) + ' min in') + '</span>';
  }
  renderAgenda();
  renderNowBanner();
}
function renderAgenda() {
  var el = $('agendaBar'); if (!el || !state.th) return;
  var live = state.th.phase !== 'before' && state.th.clock.started;
  var e = live ? elapsedMin() : -1, cards = state.th.cards || [];
  el.innerHTML = AGENDA.map(function (s) {
    var label = s[3];
    if (/^c[123]$/.test(s[2])) { var c = cards[+s[2].charAt(1) - 1]; if (c) label = c.label; }
    var cur = e >= s[0] && e < s[1], done = e >= s[1];
    return '<div class="ag-seg' + (cur ? ' cur' : '') + (done ? ' done' : '') + '" style="flex:' + (s[1] - s[0]) + '" title="' + s[0] + '–' + s[1] + ' min · ' + esc(label) + '"><span>' + esc(label) + '</span></div>';
  }).join('') + (e >= 0 ? '<div class="ag-now" style="left:calc(' + Math.min(100, e / 60 * 100) + '% - 1px)"></div>' : '');
}
function renderNowBanner() {
  var th = state.th, el = $('nowBanner'); if (!el || !th) return;
  var f = th.focus;
  if (!f || th.phase !== 'live') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.style.setProperty('--tc', f.color);
  var mins = Math.max(0, Math.floor((clockNow() - f.started) / 60));
  el.innerHTML = '<span class="now-dot"></span><span class="now-label">' + esc(tx('nowDiscussing')) + '</span><b>' + esc(themeLabel(f.key)) + '</b>' +
    (ME.isOrganizer ? '<span class="now-min">' + mins + ' min</span><button class="btn-ghost sm" onclick="setFocus(\'\')">Clear</button>'
      : '<span class="now-hint">' + esc(tx('nowHint')) + '</span>');
}
function setFocus(key) {
  api('/api/townhall/focus', { theme: key }).then(function () { if (key) toast('Discussing now: ' + themeLabel(key)); }).catch(function (e) { toast(e.message); });
}
function renderFocus() {
  var el = $('focusCards'); if (!el) return;
  var th = state.th, cards = th.cards || [];
  $('globalPrompts').innerHTML = (th.prompts || []).map(function (p) {
    return '<div class="gprompt">' + ICON.spark + '<span>' + esc(p) + '</span></div>';
  }).join('');
  el.innerHTML = cards.map(function (c, i) {
    var tags = (c.tag_counts || []).slice(0, 3).map(function (kv) {
      var t = QT[kv[0]]; return t ? '<span class="qchip sm" style="--tc:' + c.color + '"><span class="qchip-i">' + t.icon + '</span>' + esc(t.en) + ' <b>×' + kv[1] + '</b></span>' : '';
    }).join('');
    var feel = c.sentiment_avg ? '<span class="fstat">' + SENTS[Math.min(5, Math.max(1, Math.round(c.sentiment_avg)))].face + ' ' + c.sentiment_avg + '/5</span>' : '';
    var acts = (c.actions || []).map(function (a) {
      return '<div class="fact"><span class="status-pill status-' + esc(a.status) + '">' + esc(a.status) + '</span>' + esc(a.title) + ' <small>✓' + a.agree + ' · ✋' + a.not_yet + '</small></div>';
    }).join('');
    return '<div class="fcard' + (c.is_focus ? ' focus' : '') + '" style="--tc:' + c.color + '">' +
      '<div class="fhead"><span class="frank">' + (i + 1) + '</span><span class="ftitle">' + esc(c.label) + '</span><span class="fscore" title="Role-weighted priority">' + c.score + '</span></div>' +
      '<div class="fstats"><span class="fstat">' + c.posts + ' reports</span><span class="fstat">' + c.support + ' me too</span>' +
        '<span class="fstat">' + c.line_share + '% line workers</span>' + feel + (c.recent ? '<span class="fstat rise">+' + c.recent + ' in 15 min</span>' : '') + '</div>' +
      '<div class="fsum"><span class="fsum-tag">' + (c.summary_engine === 'llm' ? 'AI summary' : 'Summary') + '</span>' + esc(c.summary_text) + '</div>' +
      (tags ? '<div class="qchips">' + tags + '</div>' : '') +
      (acts ? '<div class="facts">' + acts + '</div>' : '') +
      '<div class="fprompts">' + (c.prompts || []).map(function (p) { return '<div class="fprompt">' + esc(p) + '</div>'; }).join('') + '</div>' +
      '<div class="factions">' + (c.is_focus ? '<span class="fnow">● Discussing now</span>' : '<button class="btn-primary sm" onclick="setFocus(\'' + c.key + '\')">Discuss now</button>') +
        (th.charter_locked ? '' : '<button class="btn-ghost sm" onclick="prefillAction(\'' + c.key + '\')">+ Turn into action</button>') + '</div>' +
    '</div>';
  }).join('') || '<div class="feed-empty">No concerns yet.</div>';
  var rest = (th.top_concerns || []).slice(3);
  $('focusMore').innerHTML = rest.length ? 'Also raised: ' + rest.map(function (t) {
    return '<span class="more-item" onclick="setFocus(\'' + t.key + '\')">' + esc(t.label) + ' <b>' + t.score + '</b></span>';
  }).join(' · ') : '';
}
function renderAgreement() {
  var el = $('agreementCard'), a = state.th && state.th.agreement; if (!el || !a) return;
  var de = state.lang === 'de';
  var head = '<div class="th-card-head"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7"/><path d="M14.5 3.5l6 6L13 17H7v-6z"/></svg>' +
    '<h3>' + esc(tx('agTitle')) + '</h3><span class="sub">' + esc(tx('agSub')) + '</span>' +
    '<div class="right">' + (a.locked ? '<span class="lock-pill">' + ICON.lock + esc(tx('agLocked')) + '</span>' : '') + '</div></div>';
  if (!a.open && !a.locked) {
    el.classList.remove('open');
    el.innerHTML = head + (ME.isOrganizer
      ? '<div class="ag-closed"><p>Opens in the final 15 minutes. The union reps, plant management and you agree on concrete trial rules (speed cap, trial length, checkpoints) and co-sign the action charter. Once all three groups sign, the charter is locked.</p><button class="btn-primary" onclick="openAgreement(true)">Open Co-Design Agreement</button></div>'
      : '<div class="engine-note ag-later">' + esc(tx('agLater')) + '</div>');
    return;
  }
  el.classList.add('open');
  var editable = ME.isOrganizer && !a.locked;
  var rows = a.params.map(function (p) {
    var label = de ? p.label_de : p.label, other = de ? p.label : p.label_de;
    var shown = de ? p.display_de : p.display, ctl;
    if (editable && p.kind === 'number') {
      ctl = '<button class="step-btn" onclick="stepParam(' + p.id + ',-1)" aria-label="less">−</button><span class="ag-val">' + esc(shown) + '</span><button class="step-btn" onclick="stepParam(' + p.id + ',1)" aria-label="more">+</button>';
    } else if (editable) {
      ctl = '<div class="seg">' + p.options.map(function (o) {
        return '<button class="' + (o.v === p.value ? 'on' : '') + '" onclick="setParam(' + p.id + ',\'' + o.v + '\')">' + esc(de ? o.de : o.en) + '</button>';
      }).join('') + '</div>';
    } else {
      ctl = '<span class="ag-val">' + esc(shown) + '</span>';
    }
    var votes = a.locked ? '<span class="ag-tally">✓ ' + p.ok + ' · ✋ ' + p.not_yet + '</span>' :
      '<div class="ag-votes"><button class="vote-btn agree' + (p.my_vote === 'ok' ? ' on' : '') + '" onclick="voteParam(' + p.id + ',\'ok\')">✓ ' + esc(tx('agWorks')) + ' ' + p.ok + '</button>' +
      '<button class="vote-btn not_yet' + (p.my_vote === 'not_yet' ? ' on' : '') + '" onclick="voteParam(' + p.id + ',\'not_yet\')">✋ ' + esc(tx('agNotYet')) + ' ' + p.not_yet + '</button></div>';
    return '<div class="ag-row"><div class="ag-label">' + esc(label) + '<small>' + esc(other) + '</small></div><div class="ag-value">' + ctl + '</div>' + votes + '</div>';
  }).join('');
  var signers = a.signers.map(function (s) {
    return '<div class="signer' + (s.signed ? ' done' : '') + '"><span class="sig-check">' + (s.signed ? '✓' : '') + '</span><div><b>' + esc(de ? s.label_de : s.label) + '</b><small>' +
      (s.signed ? esc(s.handle) + ' · ' + esc(s.at) : esc(tx('agWaiting'))) + '</small></div></div>';
  }).join('');
  var mine = a.signers.filter(function (s) { return s.mine; })[0];
  var signBtn = a.can_sign ? '<button class="btn-primary sign-btn" onclick="signAgreement()">✍ ' + esc(tx('agSign')) + '</button>' :
    (mine && !a.locked ? '<span class="signed-note">✓ ' + esc(tx('agYouSigned')) + '</span>' : '');
  var notice = !a.locked && a.notice ? '<div class="ag-notice">' + esc(a.notice === 'charter_changed' ? tx('agCleared2') : tx('agCleared')) + '</div>' : '';
  var lockInfo = a.locked ? '<div class="ag-locked">' + ICON.lock + '<div>' + esc(tx('agLockedLong')) + ' ' + esc(a.locked_at) +
    '<br><span class="hash">SHA-256 ' + esc((a.hash || '').slice(0, 16)) + '…' + esc((a.hash || '').slice(-8)) + '</span> · <a href="/charter" target="_blank">' + esc(tx('agOpen')) + ' ↗</a></div></div>' : '';
  el.innerHTML = head + notice + '<div class="ag-params">' + rows + '</div>' +
    '<div class="ag-sign"><div class="signers">' + signers + '</div>' + signBtn + '</div>' + lockInfo +
    (editable ? '<div class="engine-note ag-foot">Changing a value or an action clears all signatures, so every group signs the final version. <a href="/charter" target="_blank">Preview charter ↗</a></div>' : '');
}
function openAgreement(open) { api('/api/agreement/open', { open: open }).catch(function (e) { toast(e.message); }); }
function setParam(id, value) { api('/api/agreement/params/' + id, { value: value }).catch(function (e) { toast(e.message); }); }
function stepParam(id, dir) {
  var p = state.th.agreement.params.filter(function (x) { return x.id === id; })[0]; if (!p) return;
  var v = Math.max(p.min, Math.min(p.max, parseFloat(p.value) + dir * p.step));
  if (String(v) !== String(p.value)) setParam(id, v);
}
function voteParam(id, v) { api('/api/agreement/params/' + id + '/vote', { vote: v }).catch(function (e) { toast(e.message); }); }
function signAgreement() {
  if (!confirm(tx('agConfirm'))) return;
  api('/api/agreement/sign', {}).then(function (d) { toast(d.locked ? tx('agLocked') : tx('agYouSigned')); }).catch(function (e) { toast(e.message); });
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

  var top = th.top_concerns.slice(0, 5);
  var max = Math.max.apply(null, top.map(function (t) { return t.score; }).concat([1]));
  if ($('concernList')) {
    $('concernList').innerHTML = top.map(function (t, i) {
      var total = 0; Object.keys(t.role_mix).forEach(function (k) { total += t.role_mix[k]; });
      var seg = Object.keys(ROLES).filter(function (k) { return t.role_mix[k]; }).map(function (k) {
        return '<span style="width:' + (100 * t.score / max) * (t.role_mix[k] / total) + '%;background:' + ROLES[k].color + '"></span>';
      }).join('');
      var focus = th.focus && th.focus.key === t.key && th.phase === 'live';
      return '<div class="concern' + (focus ? ' is-focus' : '') + '"><span class="concern-rank">#' + (i + 1) + '</span>' +
        '<span class="concern-title"><span class="theme-dot" style="background:' + t.color + '"></span>' + esc(themeLabel(t.key)) + (focus ? '<span class="now-chip">' + esc(tx('nowDiscussing')) + '</span>' : '') + '</span>' +
        '<span class="concern-score">' + t.score + '</span>' +
        '<div class="concern-bar">' + seg + '</div>' +
        '<div class="concern-meta">' + esc(t.summary) + ' · ' + t.support + ' "me too"</div>' +
        '<div class="concern-quote">“' + esc(t.top_quote) + '”</div>' +
      '</div>';
    }).join('') || '<div class="feed-empty">No concerns posted yet.</div>';
    $('roleLegend').innerHTML = Object.keys(ROLES).filter(function (k) { return k !== 'organizer'; }).map(function (k) {
      return '<span><i style="background:' + ROLES[k].color + '"></i>' + esc(ROLES[k].label) + '</span>';
    }).join('');
  }

  renderClock(); renderFocus(); renderPoll(); renderPulse(); renderReactions(); renderCharter(); renderAgreement(); renderSurvey();
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
  var acts = state.th.actions, locked = state.th.charter_locked;
  $('charterSub').innerHTML = locked ? '<span class="lock-pill">' + ICON.lock + esc(tx('agLocked')) + '</span>' : 'written live — everyone can agree or say "not yet"';
  if ($('addActionBtn')) $('addActionBtn').classList.toggle('hidden', locked);
  if (locked && $('actionForm')) $('actionForm').classList.remove('show');
  $('charterBody').innerHTML = acts.map(function (a) {
    var status = ME.isOrganizer && !locked
      ? '<select class="mini-select" onchange="setActionStatus(' + a.id + ',this.value)">' + ['proposed', 'agreed', 'unresolved'].map(function (s) {
          return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>'
      : '<span class="status-pill status-' + a.status + '">' + esc(statusWord(a.status)) + '</span>';
    var votes = locked
      ? '<span class="ag-tally">✓ ' + a.agree + ' · ✋ ' + a.not_yet + '</span>'
      : '<div class="vote-btns"><button class="vote-btn agree' + (a.my_vote === 'agree' ? ' on' : '') + '" onclick="voteAction(' + a.id + ',\'agree\')">✓ Agree ' + a.agree + '</button>' +
        '<button class="vote-btn not_yet' + (a.my_vote === 'not_yet' ? ' on' : '') + '" onclick="voteAction(' + a.id + ',\'not_yet\')">Not yet ' + a.not_yet + '</button></div>';
    return '<tr><td><span class="tag" style="background:' + a.theme_color + '1A;color:' + a.theme_color + '">' + esc(themeLabel(a.theme)) + '</span></td>' +
      '<td class="c-title"><div class="charter-title">' + esc(a.title) + '</div></td>' +
      '<td style="color:var(--text-secondary)">' + esc(a.owner) + '</td><td style="color:var(--text-secondary)">' + esc(a.due) + '</td>' +
      '<td>' + status + '</td><td>' + votes + '</td></tr>';
  }).join('') || '<tr><td colspan="6" class="engine-note" style="padding:14px 8px">No actions yet — the Product Team adds them live during the meeting.</td></tr>';
  if ($('actTheme') && !$('actTheme').options.length) {
    $('actTheme').innerHTML = themeKeys().map(function (k) { return '<option value="' + k + '">' + esc(THEMES[k].label) + '</option>'; }).join('');
  }
}
function voteAction(id, v) { api('/api/townhall/actions/' + id + '/vote', { vote: v }); }
function setActionStatus(id, s) { api('/api/townhall/actions/' + id + '/status', { status: s }); }
function toggleActionForm() { $('actionForm').classList.toggle('show'); }
function prefillAction(theme) {
  if (state.th && state.th.charter_locked) return;
  $('actionForm').classList.add('show'); $('actTheme').value = theme;
  scrollPanelTo($('actionForm'));
  setTimeout(function () { $('actTitle').focus(); }, 350);
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
  var ag = th.agreement;
  if (ag && ag.params.length) {
    lines.push('', '## Co-Design Agreement — trial rules');
    ag.params.forEach(function (p) { lines.push('- ' + p.label + ': **' + p.display + '**'); });
    lines.push('', '## Signatures');
    ag.signers.forEach(function (s) { lines.push('- ' + s.label + ': ' + (s.signed ? s.handle + ' · ' + s.at : 'not signed')); });
    if (ag.locked) lines.push('', 'Locked on ' + ag.locked_at + ' · SHA-256 `' + ag.hash + '`');
  }
  lines.push('', '## Top concerns at the time of export');
  th.top_concerns.slice(0, 5).forEach(function (t, i) { lines.push((i + 1) + '. ' + t.label + ' — ' + t.summary); });
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
  capRec.onerror = function (e) { var m = speechError(e.error); if (m) toast(m); };
  capRec.onend = function () { if (capOn) { try { capRec.start(); } catch (x) {} } else setCapUI(false); };
  capOn = true;
  try { capRec.start(); setCapUI(true); } catch (x) { capOn = false; toast(tx('noSpeech')); }
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
        } else if (it.type === 'big') {
          ctl = '<label class="toggle-switch"><input type="checkbox"' + (document.body.classList.contains('big') ? ' checked' : '') + ' onchange="toggleBig(this.checked)"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>';
        } else {
          ctl = '<label class="toggle-switch' + (it.locked ? ' locked' : '') + '" title="' + (it.locked ? 'Always on for privacy' : '') + '"><input type="checkbox"' + (it.default ? ' checked' : '') + (it.locked ? ' disabled' : '') + '><div class="toggle-track"></div><div class="toggle-thumb"></div></label>';
        }
        return '<div class="settings-row"><span class="settings-label">' + esc(it.label) + '</span>' + ctl + '</div>';
      }).join('') + '</div>';
    }).join('') + '<div class="settings-section"><a class="btn-ghost signout-btn" href="/logout">' + esc(tx('signOut')) + ' · ' + esc(personName({ name: ME.name, role: ME.role })) + '</a></div>';
  });
}

(function init() {
  $('langDe').classList.toggle('active', state.lang === 'de');
  $('langEn').classList.toggle('active', state.lang === 'en');
  initBig();
  var ts = $('themeSelect');
  themeKeys().forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = THEMES[k].label; ts.appendChild(o); });
  try { new QRCode($('qrBox'), { text: BOOT.joinUrl, width: 128, height: 128, colorDark: '#0B3C5D', colorLight: '#ffffff' }); } catch (e) {}
  $('qrUrl').textContent = BOOT.joinUrl.replace(/^https?:\/\//, '');
  $('speechLang').value = speechLangCode(); $('capLang').value = speechLangCode();
  var cm = null; try { cm = localStorage.getItem('bp_cmode'); } catch (e) {}
  renderQuick();
  setComposerMode(cm === 'write' || cm === 'quick' ? cm : composerMode);
  loadFeed(); loadInsights(); loadTownHall(); loadContacts(); loadNotifications(); loadSettings();
  var saved = null; try { saved = localStorage.getItem('bp_mode'); } catch (e) {}
  switchMode(saved && $(saved + 'Panel') ? saved : 'square');
  setInterval(function () { if (state.th && state.th.phase === 'live') { renderClock(); } }, 1000);
  setInterval(function () { if (ME.isOrganizer && state.mode === 'townhall') loadTownHall(); }, 30000);
})();
