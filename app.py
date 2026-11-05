import os
import json
import time
import uuid
import logging
import socket as pysocket
import sqlite3
import hashlib
import secrets
import random
from collections import deque
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, jsonify, abort
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

import bp_engine as bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)
def _load_secret():
    if os.environ.get('BP_SECRET'):
        return os.environ['BP_SECRET']
    path = os.path.join(BASE_DIR, '.secret_key')
    if not os.path.exists(path):
        with open(path, 'w') as f:
            f.write(secrets.token_hex(32))
    with open(path) as f:
        return f.read().strip()

app.secret_key = _load_secret()
app.config['MAX_CONTENT_LENGTH'] = 40 * 1024 * 1024
logging.getLogger('werkzeug').setLevel(logging.ERROR)
socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)
login_manager = LoginManager(app)
login_manager.login_view = 'join_page'
login_manager.session_protection = None

DB_PATH = os.path.join(BASE_DIR, 'bridgepulse.db')
UPLOAD_DIR = os.path.join(BASE_DIR, 'static', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
PORT = int(os.environ.get('PORT', 8080))

ZONES = ['Hall 1 · Body shop', 'Hall 2 · Paint', 'Hall 3 · Final assembly', 'Hall 4 · Logistics / AMR lanes',
         'Warehouse', 'Break room', 'Office']

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            alias TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'line_worker',
            language TEXT NOT NULL DEFAULT 'de',
            status TEXT DEFAULT 'offline',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            lang TEXT, content_en TEXT, content_de TEXT, tr_engine TEXT,
            theme TEXT, zone TEXT,
            media_url TEXT, media_type TEXT,
            is_broadcast INTEGER DEFAULT 0,
            created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS post_support (
            post_id INTEGER, user_id INTEGER, created_at TIMESTAMP,
            PRIMARY KEY (post_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL, author_id INTEGER NOT NULL,
            content TEXT NOT NULL, lang TEXT, content_en TEXT, content_de TEXT,
            created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS groups_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_by INTEGER,
            private INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER, user_id INTEGER,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL, receiver_id INTEGER, group_id INTEGER,
            content TEXT NOT NULL, lang TEXT, content_en TEXT, content_de TEXT,
            msg_type TEXT DEFAULT 'text',
            created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS th_state (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL, options TEXT NOT NULL,
            is_open INTEGER DEFAULT 1, created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS poll_votes (
            poll_id INTEGER, user_id INTEGER, option_idx INTEGER,
            PRIMARY KEY (poll_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS pulses (
            user_id INTEGER PRIMARY KEY, value INTEGER, updated_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            theme TEXT, title TEXT NOT NULL, owner TEXT, due TEXT,
            status TEXT DEFAULT 'proposed', created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS action_votes (
            action_id INTEGER, user_id INTEGER, vote TEXT,
            PRIMARY KEY (action_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS survey (
            user_id INTEGER PRIMARY KEY, heard INTEGER, plan TEXT, comment TEXT, created_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS agreement_params (
            id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, label TEXT, label_de TEXT,
            kind TEXT, value TEXT, unit TEXT, unit_de TEXT, min REAL, max REAL, step REAL,
            options TEXT, sort INTEGER
        );
        CREATE TABLE IF NOT EXISTS param_votes (
            param_id INTEGER, user_id INTEGER, vote TEXT,
            PRIMARY KEY (param_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS agreement_signatures (
            role TEXT PRIMARY KEY, user_id INTEGER, handle TEXT, signed_at TIMESTAMP
        );
    ''')
    conn.commit()
    conn.close()

def migrate_db():
    conn = get_db()
    cols = {r['name'] for r in conn.execute('PRAGMA table_info(posts)').fetchall()}
    for name, kind in (('tags', 'TEXT'), ('sentiment', 'INTEGER')):
        if name not in cols:
            conn.execute('ALTER TABLE posts ADD COLUMN %s %s' % (name, kind))
    action_cols = {r['name'] for r in conn.execute('PRAGMA table_info(actions)').fetchall()}
    for name in ('title_de', 'owner_de', 'due_de'):
        if name not in action_cols:
            conn.execute('ALTER TABLE actions ADD COLUMN %s TEXT' % name)
    poll_cols = {r['name'] for r in conn.execute('PRAGMA table_info(polls)').fetchall()}
    for name in ('question_de', 'options_de'):
        if name not in poll_cols:
            conn.execute('ALTER TABLE polls ADD COLUMN %s TEXT' % name)
    conn.commit()
    conn.close()

def minutes_since(ts):
    try:
        return (datetime.now() - datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')).total_seconds() / 60.0
    except Exception:
        return 1e9

def now_str(delta_minutes=0):
    return (datetime.now() - timedelta(minutes=delta_minutes)).strftime('%Y-%m-%d %H:%M:%S')

def time_ago(ts):
    try:
        dt = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return ''
    s = (datetime.now() - dt).total_seconds()
    if s < 60: return 'now'
    if s < 3600: return '%dm' % (s // 60)
    if s < 86400: return '%dh' % (s // 3600)
    return '%dd' % (s // 86400)

def get_state(key, default=None):
    conn = get_db()
    row = conn.execute('SELECT value FROM th_state WHERE key = ?', (key,)).fetchone()
    conn.close()
    return row['value'] if row else default

def set_state(key, value):
    conn = get_db()
    conn.execute('INSERT OR REPLACE INTO th_state (key, value) VALUES (?, ?)', (key, value))
    conn.commit()
    conn.close()

class User(UserMixin):
    def __init__(self, row):
        self.id = row['id']
        self.username = row['username']
        self.display_name = row['display_name']
        self.alias = row['alias']
        self.role = row['role']
        self.language = row['language']
        self.status = row['status']

    @property
    def is_organizer(self):
        return self.role == 'organizer'

    @property
    def public_name(self):
        return public_name(self.role, self.display_name)

    @property
    def role_label(self):
        return bp.ROLES[self.role]['label']

    @property
    def color(self):
        return bp.ROLES[self.role]['color']

    def get_initials(self):
        return initials_for(self.role, self.alias, self.display_name)

def public_name(role, display_name):
    if role == 'organizer':
        return display_name
    return 'Anonymous ' + bp.ROLES[role]['label']

def word_initials(name):
    words = [w for w in name.split() if w[:1].isalnum()]
    return ''.join(w[0] for w in words[:2]).upper() or name[:2].upper()

def initials_for(role, alias, display_name):
    if role == 'organizer':
        return word_initials(display_name)
    return {'line_worker': 'LW', 'safety_officer': 'SO', 'union_rep': 'UR', 'director': 'PD'}.get(role, '??')

def handle_for(alias):
    return '@' + alias.lower().replace('-', '')

def person(row, prefix=''):
    role, alias, dn = row[prefix + 'role'], row[prefix + 'alias'], row[prefix + 'display_name']
    return {
        'name': public_name(role, dn),
        'handle': handle_for(alias),
        'role': role,
        'role_label': bp.ROLES[role]['label'],
        'color': bp.ROLES[role]['color'],
        'initials': initials_for(role, alias, dn),
    }

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return User(row) if row else None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def make_alias(role):
    prefix = {'line_worker': 'LW', 'safety_officer': 'SO', 'union_rep': 'UR',
              'director': 'PD', 'organizer': 'TH'}[role]
    return '%s-%04d' % (prefix, random.randint(1000, 9999))

def create_user(conn, username, password, role, language, display_name=None):
    alias = make_alias(role)
    conn.execute('INSERT INTO users (username, password_hash, display_name, alias, role, language) '
                 'VALUES (?, ?, ?, ?, ?, ?)',
                 (username, hash_password(password), display_name or alias, alias, role, language))
    return conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()['id']

def organizer_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not current_user.is_authenticated or not current_user.is_organizer:
            return jsonify({'error': 'Only the Product Team can do this'}), 403
        return f(*a, **kw)
    return wrapper

online_users = {}
reaction_counts = {'agree': 0, 'unsure': 0, 'concern': 0, 'applause': 0}
reaction_log = deque(maxlen=500)

def lan_ip():
    s = pysocket.socket(pysocket.AF_INET, pysocket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

def join_url():
    host = request.host.split(':')[0]
    if host in ('localhost', '127.0.0.1'):
        return 'http://%s:%d/join' % (lan_ip(), PORT)
    return request.host_url.rstrip('/') + '/join'

def translate_fields(text):
    lang = bp.detect_language(text)
    if lang == 'de':
        en, engine = bp.translate(text, 'en', 'de')
        return lang, en, text, engine
    de, engine = bp.translate(text, 'de', 'en')
    return lang, text, de, engine

@app.route('/')
@login_required
def index():
    themes = {k: {'label': v['label'], 'label_de': v['label_de'], 'color': v['color'], 'icon': v['icon']}
              for k, v in bp.THEMES.items()}
    themes['other'] = {'label': bp.THEME_OTHER['label'], 'label_de': bp.THEME_OTHER['label_de'],
                       'color': bp.THEME_OTHER['color'], 'icon': bp.THEME_OTHER['icon']}
    return render_template('index.html', user=current_user, zones=ZONES, themes=themes,
                           roles=bp.ROLES, join_url=join_url(), llm=bp.llm_available(),
                           quick_tags=bp.QUICK_TAGS, sentiments=bp.SENTIMENTS, agenda=bp.AGENDA,
                           signer_roles=bp.SIGNER_ROLES,
                           action_templates=bp.ACTION_TEMPLATES if current_user.is_organizer else {},
                           poll_templates=bp.POLL_TEMPLATES if current_user.is_organizer else [])

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        conn = get_db()
        row = conn.execute('SELECT * FROM users WHERE username = ? AND password_hash = ?',
                           (username, hash_password(password))).fetchone()
        conn.close()
        if row:
            login_user(User(row), remember=True)
            return redirect(url_for('index'))
        error = 'Invalid username or password'
    return render_template('login.html', error=error, join_url=join_url())

@app.route('/join', methods=['GET', 'POST'])
def join_page():
    if request.method == 'GET':
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        return render_template('join.html', roles=bp.ROLES, public_roles=bp.PUBLIC_ROLES, icons=bp.ROLE_ICONS)
    role = request.form.get('role', 'line_worker')
    language = request.form.get('language', 'de')
    if role not in bp.PUBLIC_ROLES:
        role = 'line_worker'
    if language not in ('de', 'en'):
        language = 'de'
    conn = get_db()
    uid = create_user(conn, 'anon_' + secrets.token_hex(5), secrets.token_hex(16), role, language)
    conn.commit()
    row = conn.execute('SELECT * FROM users WHERE id = ?', (uid,)).fetchone()
    conn.close()
    login_user(User(row), remember=True)
    return redirect(url_for('index'))

@app.route('/register')
def register():
    return redirect(url_for('join_page'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('join_page'))

@app.route('/api/me', methods=['GET', 'POST'])
@login_required
def api_me():
    if request.method == 'POST':
        lang = (request.get_json() or {}).get('language')
        if lang in ('de', 'en'):
            conn = get_db()
            conn.execute('UPDATE users SET language = ? WHERE id = ?', (lang, current_user.id))
            conn.commit()
            conn.close()
            current_user.language = lang
    return jsonify({'id': current_user.id, 'name': current_user.public_name, 'alias': current_user.alias,
                    'handle': handle_for(current_user.alias), 'role': current_user.role,
                    'role_label': current_user.role_label, 'language': current_user.language,
                    'is_organizer': current_user.is_organizer})

def charter_locked():
    return bool(get_state('agreement_locked_at'))

def actions_by_theme(conn):
    locked = charter_locked()
    out = {}
    for a in conn.execute('SELECT theme, title, title_de, status FROM actions ORDER BY id').fetchall():
        out.setdefault(a['theme'], {'title': a['title'], 'title_de': a['title_de'] or a['title'],
                                    'status': 'signed' if locked else a['status']})
    return out

def serialize_post(conn, r, uid, theme_actions=None):
    supporters = conn.execute('''SELECT u.role FROM post_support s JOIN users u ON s.user_id = u.id
                                 WHERE s.post_id = ?''', (r['id'],)).fetchall()
    supporter_roles = [s['role'] for s in supporters]
    n_comments = conn.execute('SELECT COUNT(*) c FROM comments WHERE post_id = ?', (r['id'],)).fetchone()['c']
    mine = conn.execute('SELECT 1 FROM post_support WHERE post_id = ? AND user_id = ?', (r['id'], uid)).fetchone()
    t = bp.theme_meta(r['theme'])
    try:
        tags = [x for x in json.loads(r['tags'] or '[]') if x in bp.QUICK_TAGS]
    except (TypeError, ValueError):
        tags = []
    return {
        'tags': tags, 'sentiment': r['sentiment'],
        'action': (theme_actions or {}).get(r['theme']) if not r['is_broadcast'] else None,
        'id': r['id'],
        'author': person(r),
        'is_mine': r['author_id'] == uid,
        'content': r['content'], 'lang': r['lang'],
        'content_en': r['content_en'], 'content_de': r['content_de'], 'tr_engine': r['tr_engine'],
        'theme': r['theme'], 'theme_label': t['label'], 'theme_color': t['color'],
        'zone': r['zone'], 'media_url': r['media_url'], 'media_type': r['media_type'],
        'is_broadcast': bool(r['is_broadcast']),
        'support': len(supporter_roles), 'supported': bool(mine),
        'score': bp.post_score(r['role'], supporter_roles, n_comments),
        'supporter_roles': supporter_roles,
        'comments': n_comments,
        'time': time_ago(r['created_at']), 'created_at': r['created_at'],
    }

POST_SELECT = '''SELECT p.*, u.role, u.alias, u.display_name FROM posts p JOIN users u ON p.author_id = u.id'''

@app.route('/api/posts')
@login_required
def api_posts():
    sort = request.args.get('sort', 'latest')
    theme = request.args.get('theme', '')
    conn = get_db()
    acts = actions_by_theme(conn)
    broadcasts = [serialize_post(conn, r, current_user.id) for r in
                  conn.execute(POST_SELECT + ' WHERE p.is_broadcast = 1 ORDER BY p.created_at DESC').fetchall()]
    q, args = POST_SELECT + ' WHERE p.is_broadcast = 0', []
    if theme:
        q += ' AND p.theme = ?'
        args.append(theme)
    rows = conn.execute(q + ' ORDER BY p.created_at DESC LIMIT 200', args).fetchall()
    posts = [serialize_post(conn, r, current_user.id, acts) for r in rows]
    conn.close()
    if sort == 'top':
        posts.sort(key=lambda p: p['score'], reverse=True)
    return jsonify({'broadcasts': broadcasts, 'posts': posts})

@app.route('/api/posts', methods=['POST'])
@login_required
def api_create_post():
    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    media_url = data.get('media_url') or None
    tags = []
    for t in data.get('tags') or []:
        if t in bp.QUICK_TAGS and t not in tags:
            tags.append(t)
    tags = tags[:3]
    try:
        sentiment = int(data.get('sentiment')) if data.get('sentiment') not in (None, '') else None
    except (TypeError, ValueError):
        sentiment = None
    if sentiment is not None and not 1 <= sentiment <= 5:
        sentiment = None
    if not content and not media_url and not tags:
        return jsonify({'error': 'Pick a problem, speak, write something or add a photo'}), 400
    broadcast = 1 if (data.get('broadcast') and current_user.is_organizer) else 0
    theme = data.get('theme') or (bp.QUICK_TAGS[tags[0]]['theme'] if tags else bp.classify_theme(content))
    if theme not in bp.THEMES and theme != 'other':
        theme = 'other'
    if broadcast:
        theme, tags, sentiment = 'other', [], None
    if content:
        lang, en, de, engine = translate_fields(content)
    else:
        lang, en, de, engine = current_user.language, '', '', 'none'
    zone = data.get('zone') if data.get('zone') in ZONES else None
    conn = get_db()
    cur = conn.execute('''INSERT INTO posts (author_id, content, lang, content_en, content_de, tr_engine, theme, zone,
                          media_url, media_type, is_broadcast, created_at, tags, sentiment)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                       (current_user.id, content, lang, en, de, engine, theme, zone,
                        media_url, data.get('media_type'), broadcast, now_str(),
                        json.dumps(tags) if tags else None, sentiment))
    pid = cur.lastrowid
    conn.commit()
    conn.close()
    socketio.emit('feed_changed', {'post_id': pid, 'broadcast': bool(broadcast)})
    return jsonify({'id': pid, 'theme': theme})

@app.route('/api/posts/<int:pid>', methods=['DELETE'])
@login_required
def api_delete_post(pid):
    conn = get_db()
    row = conn.execute('SELECT author_id FROM posts WHERE id = ?', (pid,)).fetchone()
    if not row:
        conn.close()
        abort(404)
    if row['author_id'] != current_user.id and not current_user.is_organizer:
        conn.close()
        return jsonify({'error': 'Not allowed'}), 403
    conn.execute('DELETE FROM posts WHERE id = ?', (pid,))
    conn.execute('DELETE FROM post_support WHERE post_id = ?', (pid,))
    conn.execute('DELETE FROM comments WHERE post_id = ?', (pid,))
    conn.commit()
    conn.close()
    socketio.emit('feed_changed', {'post_id': pid})
    return jsonify({'ok': True})

@app.route('/api/posts/<int:pid>/support', methods=['POST'])
@login_required
def api_support(pid):
    conn = get_db()
    exists = conn.execute('SELECT 1 FROM post_support WHERE post_id = ? AND user_id = ?',
                          (pid, current_user.id)).fetchone()
    if exists:
        conn.execute('DELETE FROM post_support WHERE post_id = ? AND user_id = ?', (pid, current_user.id))
    else:
        conn.execute('INSERT INTO post_support (post_id, user_id, created_at) VALUES (?,?,?)',
                     (pid, current_user.id, now_str()))
    conn.commit()
    r = conn.execute(POST_SELECT + ' WHERE p.id = ?', (pid,)).fetchone()
    out = serialize_post(conn, r, current_user.id, actions_by_theme(conn)) if r else {}
    conn.close()
    socketio.emit('post_updated', {'post_id': pid})
    return jsonify(out)

@app.route('/api/posts/<int:pid>/comments', methods=['GET', 'POST'])
@login_required
def api_comments(pid):
    conn = get_db()
    if request.method == 'POST':
        content = ((request.get_json() or {}).get('content') or '').strip()
        if content:
            lang, en, de, _ = translate_fields(content)
            conn.execute('INSERT INTO comments (post_id, author_id, content, lang, content_en, content_de, created_at) '
                         'VALUES (?,?,?,?,?,?,?)', (pid, current_user.id, content, lang, en, de, now_str()))
            conn.commit()
            socketio.emit('post_updated', {'post_id': pid, 'comment': True})
    rows = conn.execute('''SELECT c.*, u.role, u.alias, u.display_name FROM comments c
                           JOIN users u ON c.author_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC''',
                        (pid,)).fetchall()
    out = [{'id': r['id'], 'author': person(r), 'content': r['content'], 'lang': r['lang'],
            'content_en': r['content_en'], 'content_de': r['content_de'], 'time': time_ago(r['created_at']),
            'is_mine': r['author_id'] == current_user.id} for r in rows]
    conn.close()
    return jsonify(out)

ALLOWED_MEDIA = {'.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
                 '.mp4': 'video', '.webm': 'video', '.mov': 'video', '.m4v': 'video'}

@app.route('/api/upload', methods=['POST'])
@login_required
def api_upload():
    f = request.files.get('file')
    if not f or not f.filename:
        return jsonify({'error': 'No file'}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_MEDIA:
        return jsonify({'error': 'Photos (jpg, png, webp, gif) or videos (mp4, webm, mov) only'}), 400
    name = uuid.uuid4().hex + ext
    f.save(os.path.join(UPLOAD_DIR, name))
    return jsonify({'url': '/static/uploads/' + name, 'type': ALLOWED_MEDIA[ext]})

def post_text_en(p):
    return p['content_en'] or p['content'] or bp.tag_line(p['tags'], 'en')

def compute_insights(conn):
    rows = conn.execute(POST_SELECT + ' WHERE p.is_broadcast = 0').fetchall()
    posts = [serialize_post(conn, r, -1) for r in rows]
    by_theme = {}
    tag_totals = {}
    for p in posts:
        by_theme.setdefault(p['theme'], []).append(p)
        for t in p['tags']:
            tag_totals[t] = tag_totals.get(t, 0) + 1
    themes = []
    for key, plist in by_theme.items():
        plist.sort(key=lambda p: p['score'], reverse=True)
        meta = bp.theme_meta(key)
        role_mix, tag_counts, feelings, recent = {}, {}, [], 0
        for p in plist:
            role_mix[p['author']['role']] = role_mix.get(p['author']['role'], 0) + 1
            for r in p['supporter_roles']:
                role_mix[r] = role_mix.get(r, 0) + 1
            for t in p['tags']:
                tag_counts[t] = tag_counts.get(t, 0) + 1
            if p['sentiment']:
                feelings.append(p['sentiment'])
            if minutes_since(p['created_at']) <= 15:
                recent += 1
        voices = sum(role_mix.values()) or 1
        texted = [p for p in plist if p['content']]
        quote_post = texted[0] if texted else plist[0]
        themes.append({
            'key': key, 'label': meta['label'], 'label_de': meta.get('label_de', meta['label']), 'color': meta['color'],
            'icon': meta.get('icon', ''),
            'score': round(sum(p['score'] for p in plist), 1),
            'posts': len(plist), 'support': sum(p['support'] for p in plist),
            'role_mix': role_mix,
            'top_role': max(role_mix, key=role_mix.get),
            'line_share': round(100 * role_mix.get('line_worker', 0) / voices),
            'tag_counts': sorted(tag_counts.items(), key=lambda kv: kv[1], reverse=True),
            'sentiment_avg': round(sum(feelings) / len(feelings), 1) if feelings else None,
            'sentiment_n': len(feelings),
            'recent': recent,
            'summary': bp.summarize_theme(key, [{'role': p['author']['role'],
                                                 'supporter_roles': p['supporter_roles']} for p in plist]),
            'summary_de': bp.summarize_theme(key, [{'role': p['author']['role'],
                                                    'supporter_roles': p['supporter_roles']} for p in plist], 'de'),
            'top_quote': post_text_en(quote_post)[:180],
            'top_quote_de': (quote_post['content_de'] or quote_post['content']
                             or bp.tag_line(quote_post['tags'], 'de'))[:180],
            'top_post_id': quote_post['id'],
            '_texts': [post_text_en(p)[:300] for p in plist[:12]],
        })
    themes.sort(key=lambda t: t['score'], reverse=True)
    role_totals = {}
    for r in conn.execute('SELECT role, COUNT(*) c FROM users GROUP BY role').fetchall():
        role_totals[r['role']] = r['c']
    de_share = round(100 * sum(1 for p in posts if p['lang'] == 'de') / max(1, len(posts)))
    return {'themes': themes, 'total_posts': len(posts), 'de_share': de_share,
            'tag_totals': sorted(tag_totals.items(), key=lambda kv: kv[1], reverse=True),
            'participants': sum(v for k, v in role_totals.items() if k != 'organizer'),
            'role_totals': role_totals, 'llm': bp.llm_available(), 'tr_mode': bp.translation_mode()}

def public_themes(themes):
    return [{k: v for k, v in t.items() if not k.startswith('_')} for t in themes]

@app.route('/api/insights')
@login_required
def api_insights():
    conn = get_db()
    out = compute_insights(conn)
    conn.close()
    out['themes'] = public_themes(out['themes'])
    return jsonify(out)

@app.route('/api/translate', methods=['POST'])
@login_required
def api_translate():
    text = ((request.get_json() or {}).get('text') or '').strip()
    target = (request.get_json() or {}).get('target', 'en')
    tr, engine = bp.translate(text, target)
    return jsonify({'source': bp.detect_language(text), 'translation': tr, 'engine': engine,
                    'notes': bp.cultural_notes(text), 'theme': bp.theme_meta(bp.classify_theme(text))['label']})

@app.route('/api/contacts')
@login_required
def api_contacts():
    conn = get_db()
    users = conn.execute("SELECT * FROM users WHERE id != ? AND username NOT LIKE 'anon_%' ORDER BY role, id",
                         (current_user.id,)).fetchall()
    groups = conn.execute('''SELECT g.* FROM groups_table g JOIN group_members gm ON g.id = gm.group_id
                             WHERE gm.user_id = ?''', (current_user.id,)).fetchall()
    contacts = []
    for g in groups:
        last = conn.execute('''SELECT m.content, m.created_at, u.role, u.alias, u.display_name FROM messages m
                               JOIN users u ON m.sender_id = u.id WHERE m.group_id = ?
                               ORDER BY m.created_at DESC, m.id DESC LIMIT 1''', (g['id'],)).fetchone()
        n = conn.execute('SELECT COUNT(*) c FROM group_members WHERE group_id = ?', (g['id'],)).fetchone()['c']
        contacts.append({
            'id': g['id'], 'name': g['name'], 'initials': word_initials(g['name'].replace('Breakout', '')),
            'color': '#8DC8E8', 'status': None, 'members': n,
            'preview': (person(last)['name'].replace('Anonymous ', '') + ': ' + last['content'][:40]) if last else '',
            'time': last['created_at'][11:16] if last else '', 'type': 'group', 'target_id': g['id'],
        })
    for u in users:
        last = conn.execute('''SELECT content, created_at FROM messages WHERE (sender_id = ? AND receiver_id = ?)
                               OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC, id DESC LIMIT 1''',
                            (current_user.id, u['id'], u['id'], current_user.id)).fetchone()
        p = person(u)
        contacts.append({
            'id': u['id'], 'name': p['name'] if u['role'] == 'organizer' else p['name'] + ' ' + p['handle'],
            'initials': p['initials'], 'color': p['color'], 'role_label': p['role_label'],
            'status': 'online' if (u['id'] in online_users or u['username'] == 'helper') else 'offline',
            'preview': last['content'][:40] if last else '', 'time': last['created_at'][11:16] if last else '',
            'type': 'chat', 'target_id': u['id'],
        })
    conn.close()
    return jsonify(contacts)

def serialize_msg(r, uid):
    p = person(r)
    return {'id': r['id'], 'sender_id': r['sender_id'], 'content': r['content'], 'lang': r['lang'],
            'content_en': r['content_en'], 'content_de': r['content_de'], 'msg_type': r['msg_type'],
            'display_name': p['name'], 'role_label': p['role_label'], 'avatar_color': p['color'],
            'initials': p['initials'], 'time': (r['created_at'] or '')[11:16], 'is_me': r['sender_id'] == uid}

@app.route('/api/messages/<chat_type>/<int:target_id>')
@login_required
def api_messages(chat_type, target_id):
    conn = get_db()
    sel = 'SELECT m.*, u.role, u.alias, u.display_name FROM messages m JOIN users u ON m.sender_id = u.id '
    if chat_type == 'chat':
        rows = conn.execute(sel + '''WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
                                     ORDER BY m.created_at ASC, m.id ASC LIMIT 200''',
                            (current_user.id, target_id, target_id, current_user.id)).fetchall()
    else:
        rows = conn.execute(sel + 'WHERE m.group_id = ? ORDER BY m.created_at ASC, m.id ASC LIMIT 200',
                            (target_id,)).fetchall()
    out = [serialize_msg(r, current_user.id) for r in rows]
    conn.close()
    return jsonify(out)

@app.route('/api/groups', methods=['POST'])
@login_required
def api_create_group():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Room name required'}), 400
    conn = get_db()
    gid = conn.execute('INSERT INTO groups_table (name, created_by) VALUES (?, ?)', (name, current_user.id)).lastrowid
    conn.execute('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', (gid, current_user.id))
    for mid in data.get('members', []):
        conn.execute('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', (gid, mid))
    conn.commit()
    conn.close()
    return jsonify({'id': gid, 'name': name})

@app.route('/api/groups/<int:gid>/join', methods=['POST'])
@login_required
def api_join_group(gid):
    conn = get_db()
    g = conn.execute('SELECT private FROM groups_table WHERE id = ?', (gid,)).fetchone()
    if not g or g['private']:
        conn.close()
        return jsonify({'error': 'This room is invite-only'}), 403
    conn.execute('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', (gid, current_user.id))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/rooms')
@login_required
def api_rooms():
    conn = get_db()
    rows = conn.execute('''SELECT g.id, g.name, COUNT(gm.user_id) n,
                           SUM(CASE WHEN gm.user_id = ? THEN 1 ELSE 0 END) mine
                           FROM groups_table g LEFT JOIN group_members gm ON g.id = gm.group_id
                           GROUP BY g.id HAVING g.private = 0 OR mine > 0 ORDER BY g.id''', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([{'id': r['id'], 'name': r['name'], 'members': r['n'], 'joined': bool(r['mine'])} for r in rows])

def townhall_state(uid, is_org):
    conn = get_db()
    phase = get_state('phase', 'before')
    poll = conn.execute('SELECT * FROM polls ORDER BY id DESC LIMIT 1').fetchone()
    poll_out = None
    if poll:
        opts = json.loads(poll['options'])
        counts = [0] * len(opts)
        weighted = [0.0] * len(opts)
        for v in conn.execute('''SELECT pv.option_idx, u.role FROM poll_votes pv JOIN users u ON pv.user_id = u.id
                                 WHERE pv.poll_id = ?''', (poll['id'],)).fetchall():
            if 0 <= v['option_idx'] < len(opts):
                counts[v['option_idx']] += 1
                weighted[v['option_idx']] += bp.role_weight(v['role'])
        mine = conn.execute('SELECT option_idx FROM poll_votes WHERE poll_id = ? AND user_id = ?',
                            (poll['id'], uid)).fetchone()
        try:
            opts_de = json.loads(poll['options_de'] or 'null') or opts
        except (TypeError, ValueError):
            opts_de = opts
        if len(opts_de) != len(opts):
            opts_de = opts
        poll_out = {'id': poll['id'], 'question': poll['question'], 'options': opts,
                    'question_de': poll['question_de'] or poll['question'], 'options_de': opts_de, 'counts': counts,
                    'weighted': [round(w, 1) for w in weighted], 'total': sum(counts),
                    'is_open': bool(poll['is_open']), 'my_vote': mine['option_idx'] if mine else None}
    pulses = conn.execute('SELECT value FROM pulses').fetchall()
    dist = [0] * 5
    for p in pulses:
        if 1 <= p['value'] <= 5:
            dist[p['value'] - 1] += 1
    my_pulse = conn.execute('SELECT value FROM pulses WHERE user_id = ?', (uid,)).fetchone()
    avg = round(sum((i + 1) * c for i, c in enumerate(dist)) / max(1, sum(dist)), 1)
    actions = []
    for a in conn.execute('SELECT * FROM actions ORDER BY id').fetchall():
        votes = conn.execute('SELECT vote, COUNT(*) c FROM action_votes WHERE action_id = ? GROUP BY vote',
                             (a['id'],)).fetchall()
        vd = {v['vote']: v['c'] for v in votes}
        mine = conn.execute('SELECT vote FROM action_votes WHERE action_id = ? AND user_id = ?',
                            (a['id'], uid)).fetchone()
        meta = bp.theme_meta(a['theme'])
        actions.append({'id': a['id'], 'theme': a['theme'], 'theme_label': meta['label'], 'theme_color': meta['color'],
                        'theme_icon': meta.get('icon', ''),
                        'title': a['title'], 'title_de': a['title_de'] or a['title'],
                        'owner': a['owner'], 'owner_de': a['owner_de'] or a['owner'],
                        'due': a['due'], 'due_de': a['due_de'] or a['due'], 'status': a['status'],
                        'agree': vd.get('agree', 0), 'not_yet': vd.get('not_yet', 0),
                        'my_vote': mine['vote'] if mine else None})
    my_survey = conn.execute('SELECT * FROM survey WHERE user_id = ?', (uid,)).fetchone()
    survey_out = {'done': bool(my_survey)}
    if is_org:
        rows = conn.execute('SELECT heard, plan, comment FROM survey').fetchall()
        survey_out.update({
            'n': len(rows),
            'heard_avg': round(sum(r['heard'] for r in rows) / max(1, len(rows)), 1),
            'plan': {k: sum(1 for r in rows if r['plan'] == k) for k in ('yes', 'partly', 'no')},
            'comments': [r['comment'] for r in rows if r['comment']][-8:],
        })
    online_roles = {}
    if online_users:
        qs = ','.join('?' * len(online_users))
        for r in conn.execute('SELECT role, COUNT(*) c FROM users WHERE id IN (%s) GROUP BY role' % qs,
                              list(online_users.keys())).fetchall():
            online_roles[r['role']] = r['c']
    insights = compute_insights(conn)
    agreement = agreement_state(conn, uid)
    survey_n = conn.execute('SELECT COUNT(*) c FROM survey').fetchone()['c']
    conn.close()
    clock = clock_info(phase)
    focus = focus_info() if phase == 'live' else None
    recent_concern = sum(1 for ts, kind in reaction_log if kind == 'concern' and time.time() - ts <= 120)
    out = {
        'phase': phase, 'title': get_state('title', ''), 'when': get_state('when', ''),
        'title_de': get_state('title_de') or get_state('title', ''), 'when_de': get_state('when_de') or get_state('when', ''),
        'poll': poll_out,
        'pulse': {'avg': avg, 'dist': dist, 'n': sum(dist), 'mine': my_pulse['value'] if my_pulse else None},
        'reactions': reaction_counts, 'actions': actions, 'survey': survey_out,
        'online': len(online_users), 'online_roles': online_roles,
        'top_concerns': public_themes(insights['themes']),
        'clock': clock, 'focus': focus, 'agreement': agreement,
        'charter_locked': agreement['locked'],
    }
    if is_org:
        cards = build_cards(insights['themes'], actions, focus)
        out['cards'] = cards
        out['prompts'] = bp.session_prompts({
            'phase': phase, 'cards': cards, 'total_posts': insights['total_posts'], 'survey_n': survey_n,
            'elapsed': clock['elapsed'], 'remaining': clock['remaining'], 'segment': clock['segment'],
            'focus': focus, 'agreement_open': agreement['open'], 'agreement_locked': agreement['locked'],
            'missing_signers': [s['label'] for s in agreement['signers'] if not s['signed']],
            'pulse_n': sum(dist), 'pulse_avg': avg, 'recent_concern': recent_concern,
        })
    return out

def clock_info(phase):
    started = get_state('live_started_at')
    ended = get_state('live_ended_at')
    started = float(started) if started else None
    ended = float(ended) if ended else None
    now = time.time()
    if not started or phase == 'before':
        elapsed = 0.0
    else:
        elapsed = ((ended if phase == 'after' and ended else now) - started) / 60.0
    return {'started': started if phase != 'before' else None, 'ended': ended, 'server_now': now,
            'elapsed': round(elapsed, 2), 'remaining': round(max(0.0, bp.SESSION_MINUTES - elapsed), 2),
            'segment': bp.agenda_segment(elapsed) if started and phase == 'live' else None,
            'duration': bp.SESSION_MINUTES}

def focus_info():
    key = get_state('focus_theme') or ''
    if not key:
        return None
    since = float(get_state('focus_started_at') or time.time())
    meta = bp.theme_meta(key)
    return {'key': key, 'label': meta['label'], 'label_de': meta.get('label_de', meta['label']),
            'color': meta['color'], 'icon': meta.get('icon', ''),
            'started': since, 'minutes': round((time.time() - since) / 60.0, 1)}

def build_cards(themes, actions, focus):
    cards = []
    for t in themes[:3]:
        summary = bp.cluster_summary(t['label'], t['_texts'])
        card = {k: v for k, v in t.items() if not k.startswith('_')}
        card.update({
            'summary_text': summary or bp.auto_summary(t),
            'summary_engine': 'llm' if summary else 'auto',
            'actions': [a for a in actions if a['theme'] == t['key']][:2],
            'is_focus': bool(focus and focus['key'] == t['key']),
        })
        card['prompts'] = bp.card_prompts(card)
        cards.append(card)
    return cards

def param_display(p, lang):
    if p['kind'] == 'number':
        unit = p['unit_de'] if lang == 'de' else p['unit']
        return '%s %s' % (p['value'], unit)
    for o in json.loads(p['options'] or '[]'):
        if o['v'] == p['value']:
            return o[lang]
    return p['value']

def agreement_state(conn, uid):
    params = []
    for p in conn.execute('SELECT * FROM agreement_params ORDER BY sort, id').fetchall():
        votes = {v['vote']: v['c'] for v in conn.execute(
            'SELECT vote, COUNT(*) c FROM param_votes WHERE param_id = ? GROUP BY vote', (p['id'],)).fetchall()}
        mine = conn.execute('SELECT vote FROM param_votes WHERE param_id = ? AND user_id = ?', (p['id'], uid)).fetchone()
        params.append({
            'id': p['id'], 'key': p['key'], 'label': p['label'], 'label_de': p['label_de'], 'kind': p['kind'],
            'value': p['value'], 'unit': p['unit'], 'unit_de': p['unit_de'],
            'min': p['min'], 'max': p['max'], 'step': p['step'],
            'options': json.loads(p['options'] or '[]'),
            'display': param_display(p, 'en'), 'display_de': param_display(p, 'de'),
            'ok': votes.get('ok', 0), 'not_yet': votes.get('not_yet', 0), 'my_vote': mine['vote'] if mine else None,
        })
    sigs = {r['role']: r for r in conn.execute('SELECT * FROM agreement_signatures').fetchall()}
    locked_at = get_state('agreement_locked_at')
    me = conn.execute('SELECT role FROM users WHERE id = ?', (uid,)).fetchone()
    role = me['role'] if me else None
    signers = []
    for r in bp.SIGNER_ROLES:
        s = sigs.get(r)
        signers.append({'role': r, 'label': bp.SIGNER_LABELS[r][0], 'label_de': bp.SIGNER_LABELS[r][1],
                        'signed': bool(s), 'handle': s['handle'] if s else None,
                        'at': (s['signed_at'] or '')[11:16] if s else None,
                        'mine': bool(s and s['user_id'] == uid)})
    return {
        'open': get_state('agreement_open') == '1', 'locked': bool(locked_at), 'locked_at': locked_at,
        'hash': get_state('agreement_hash'), 'notice': get_state('agreement_notice') or '',
        'params': params, 'signers': signers,
        'can_sign': bool(role in bp.SIGNER_ROLES and role not in sigs and not locked_at),
        'is_signer': role in bp.SIGNER_ROLES,
    }

def charter_snapshot(conn):
    params = [{'label': p['label'], 'label_de': p['label_de'], 'value': param_display(p, 'en'),
               'value_de': param_display(p, 'de')}
              for p in conn.execute('SELECT * FROM agreement_params ORDER BY sort, id').fetchall()]
    actions = []
    for a in conn.execute('SELECT * FROM actions ORDER BY id').fetchall():
        votes = {v['vote']: v['c'] for v in conn.execute(
            'SELECT vote, COUNT(*) c FROM action_votes WHERE action_id = ? GROUP BY vote', (a['id'],)).fetchall()}
        actions.append({'theme': bp.theme_meta(a['theme'])['label'], 'title': a['title'], 'owner': a['owner'],
                        'title_de': a['title_de'] or a['title'], 'owner_de': a['owner_de'] or a['owner'],
                        'due': a['due'], 'status': a['status'],
                        'agree': votes.get('agree', 0), 'not_yet': votes.get('not_yet', 0)})
    sigs = {r['role']: r for r in conn.execute('SELECT * FROM agreement_signatures').fetchall()}
    signatures = [{'group': bp.SIGNER_LABELS[r][0], 'group_de': bp.SIGNER_LABELS[r][1],
                   'handle': sigs[r]['handle'], 'signed_at': sigs[r]['signed_at']}
                  for r in bp.SIGNER_ROLES if r in sigs]
    return {'title': get_state('title', ''), 'when': get_state('when', ''),
            'params': params, 'actions': actions, 'signatures': signatures}

def lock_agreement():
    conn = get_db()
    conn.execute("UPDATE actions SET status = 'agreed' WHERE status = 'proposed'")
    conn.commit()
    snap = charter_snapshot(conn)
    conn.close()
    snap['locked_at'] = now_str()
    canonical = json.dumps(snap, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    set_state('agreement_snapshot', canonical)
    set_state('agreement_hash', hashlib.sha256(canonical.encode('utf-8')).hexdigest())
    set_state('agreement_locked_at', snap['locked_at'])

def clear_signatures(reason):
    conn = get_db()
    n = conn.execute('SELECT COUNT(*) c FROM agreement_signatures').fetchone()['c']
    conn.execute('DELETE FROM agreement_signatures')
    conn.commit()
    conn.close()
    if n:
        set_state('agreement_notice', reason)

def locked_response():
    return jsonify({'error': 'The charter is signed and locked.'}), 409

def broadcast_th():
    socketio.emit('th_update', {})

@app.route('/api/townhall')
@login_required
def api_townhall():
    return jsonify(townhall_state(current_user.id, current_user.is_organizer))

@app.route('/api/townhall/phase', methods=['POST'])
@login_required
@organizer_required
def api_phase():
    phase = (request.get_json() or {}).get('phase')
    if phase in ('before', 'live', 'after'):
        current = get_state('phase', 'before')
        if phase == 'live' and (current == 'before' or not get_state('live_started_at')):
            set_state('live_started_at', str(time.time()))
            set_state('live_ended_at', '')
        if phase == 'live' and current == 'after':
            set_state('live_ended_at', '')
        if phase == 'after':
            set_state('live_ended_at', str(time.time()))
            set_state('focus_theme', '')
        if phase == 'before':
            set_state('live_started_at', '')
            set_state('live_ended_at', '')
            set_state('focus_theme', '')
        set_state('phase', phase)
        broadcast_th()
    return jsonify({'phase': get_state('phase')})

@app.route('/api/townhall/focus', methods=['POST'])
@login_required
@organizer_required
def api_focus():
    theme = (request.get_json() or {}).get('theme') or ''
    if theme and theme not in bp.THEMES and theme != 'other':
        return jsonify({'error': 'Unknown theme'}), 400
    set_state('focus_theme', theme)
    set_state('focus_started_at', str(time.time()))
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/townhall/poll', methods=['POST'])
@login_required
@organizer_required
def api_new_poll():
    data = request.get_json() or {}
    q = (data.get('question') or '').strip()
    opts = [o.strip() for o in data.get('options', []) if o and o.strip()]
    if not q or len(opts) < 2:
        return jsonify({'error': 'A question and at least two options are needed'}), 400
    # Store a German version so workers can vote in their own language: from Priya's form, else from the
    # matching ready-made poll, else the English text. No translation service.
    tpl = bp.poll_template(q) or {}
    q_de = (data.get('question_de') or '').strip() or tpl.get('de') or q
    opts_de = [o.strip() for o in data.get('options_de', []) if o and o.strip()]
    if len(opts_de) != len(opts):
        opts_de = tpl.get('options_de') if tpl.get('options') == opts else opts
    conn = get_db()
    conn.execute('UPDATE polls SET is_open = 0')
    conn.execute('INSERT INTO polls (question, options, question_de, options_de, is_open, created_at) VALUES (?,?,?,?,1,?)',
                 (q, json.dumps(opts), q_de, json.dumps(opts_de), now_str()))
    conn.commit()
    conn.close()
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/townhall/poll/close', methods=['POST'])
@login_required
@organizer_required
def api_close_poll():
    conn = get_db()
    conn.execute('UPDATE polls SET is_open = 0')
    conn.commit()
    conn.close()
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/townhall/poll/vote', methods=['POST'])
@login_required
def api_poll_vote():
    data = request.get_json() or {}
    conn = get_db()
    poll = conn.execute('SELECT * FROM polls WHERE id = ? AND is_open = 1', (data.get('poll_id'),)).fetchone()
    if poll:
        conn.execute('INSERT OR REPLACE INTO poll_votes (poll_id, user_id, option_idx) VALUES (?,?,?)',
                     (poll['id'], current_user.id, int(data.get('option', 0))))
        conn.commit()
    conn.close()
    broadcast_th()
    return jsonify({'ok': bool(poll)})

@app.route('/api/townhall/pulse', methods=['POST'])
@login_required
def api_pulse():
    v = int((request.get_json() or {}).get('value', 3))
    v = max(1, min(5, v))
    conn = get_db()
    conn.execute('INSERT OR REPLACE INTO pulses (user_id, value, updated_at) VALUES (?,?,?)',
                 (current_user.id, v, now_str()))
    conn.commit()
    conn.close()
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/townhall/react', methods=['POST'])
@login_required
def api_react():
    kind = (request.get_json() or {}).get('kind')
    if kind in reaction_counts:
        reaction_counts[kind] += 1
        reaction_log.append((time.time(), kind))
        socketio.emit('reaction', {'kind': kind, 'counts': reaction_counts})
        if kind == 'concern':
            broadcast_th()
    return jsonify(reaction_counts)

@app.route('/api/townhall/actions', methods=['POST'])
@login_required
@organizer_required
def api_add_action():
    if charter_locked():
        return locked_response()
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title required'}), 400
    owner = (data.get('owner') or '').strip()
    due = (data.get('due') or '').strip()
    # Workers read the charter in German. The German text comes from Priya's form (a ready-made template or
    # what she typed); if she typed a template title by hand, the template supplies it. No translation service.
    tpl = bp.action_template(title) or {}
    title_de = (data.get('title_de') or '').strip() or tpl.get('de') or title
    owner_de = (data.get('owner_de') or '').strip() or (tpl.get('owner_de') if owner == tpl.get('owner') else '') or owner
    due_de = (data.get('due_de') or '').strip() or (tpl.get('due_de') if due == tpl.get('due') else '') or due
    conn = get_db()
    conn.execute('INSERT INTO actions (theme, title, title_de, owner, owner_de, due, due_de, status, created_at) '
                 'VALUES (?,?,?,?,?,?,?,?,?)',
                 (data.get('theme') or 'other', title, title_de, owner, owner_de, due, due_de, 'proposed', now_str()))
    conn.commit()
    conn.close()
    clear_signatures('charter_changed')
    broadcast_th()
    socketio.emit('feed_changed', {})
    return jsonify({'ok': True})

@app.route('/api/townhall/actions/<int:aid>/status', methods=['POST'])
@login_required
@organizer_required
def api_action_status(aid):
    if charter_locked():
        return locked_response()
    status = (request.get_json() or {}).get('status')
    if status in ('proposed', 'agreed', 'unresolved'):
        conn = get_db()
        conn.execute('UPDATE actions SET status = ? WHERE id = ?', (status, aid))
        conn.commit()
        conn.close()
        clear_signatures('charter_changed')
        broadcast_th()
        socketio.emit('feed_changed', {})
    return jsonify({'ok': True})

@app.route('/api/townhall/actions/<int:aid>/vote', methods=['POST'])
@login_required
def api_action_vote(aid):
    if charter_locked():
        return locked_response()
    vote = (request.get_json() or {}).get('vote')
    if vote in ('agree', 'not_yet'):
        conn = get_db()
        conn.execute('INSERT OR REPLACE INTO action_votes (action_id, user_id, vote) VALUES (?,?,?)',
                     (aid, current_user.id, vote))
        conn.commit()
        conn.close()
        broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/survey', methods=['POST'])
@login_required
def api_survey():
    data = request.get_json() or {}
    heard = max(1, min(5, int(data.get('heard', 3))))
    plan = data.get('plan') if data.get('plan') in ('yes', 'partly', 'no') else 'partly'
    conn = get_db()
    conn.execute('INSERT OR REPLACE INTO survey (user_id, heard, plan, comment, created_at) VALUES (?,?,?,?,?)',
                 (current_user.id, heard, plan, (data.get('comment') or '').strip()[:500], now_str()))
    conn.commit()
    conn.close()
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/agreement/open', methods=['POST'])
@login_required
@organizer_required
def api_agreement_open():
    if charter_locked():
        return locked_response()
    set_state('agreement_open', '1' if (request.get_json() or {}).get('open', True) else '0')
    broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/agreement/params/<int:pid>', methods=['POST'])
@login_required
@organizer_required
def api_agreement_param(pid):
    if charter_locked():
        return locked_response()
    value = str((request.get_json() or {}).get('value', '')).strip()
    conn = get_db()
    p = conn.execute('SELECT * FROM agreement_params WHERE id = ?', (pid,)).fetchone()
    if not p:
        conn.close()
        abort(404)
    if p['kind'] == 'number':
        try:
            num = float(value)
        except ValueError:
            conn.close()
            return jsonify({'error': 'Enter a number'}), 400
        value = '%g' % max(p['min'], min(p['max'], num))
    elif value not in [o['v'] for o in json.loads(p['options'] or '[]')]:
        conn.close()
        return jsonify({'error': 'Not one of the options'}), 400
    changed = value != p['value']
    if changed:
        conn.execute('UPDATE agreement_params SET value = ? WHERE id = ?', (value, pid))
        conn.execute('DELETE FROM param_votes WHERE param_id = ?', (pid,))
        conn.commit()
    conn.close()
    if changed:
        clear_signatures('values_changed')
        broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/agreement/params/<int:pid>/vote', methods=['POST'])
@login_required
def api_agreement_param_vote(pid):
    if charter_locked():
        return locked_response()
    if get_state('agreement_open') != '1':
        return jsonify({'error': 'The agreement is not open yet'}), 400
    vote = (request.get_json() or {}).get('vote')
    if vote in ('ok', 'not_yet'):
        conn = get_db()
        conn.execute('INSERT OR REPLACE INTO param_votes (param_id, user_id, vote) VALUES (?,?,?)',
                     (pid, current_user.id, vote))
        conn.commit()
        conn.close()
        broadcast_th()
    return jsonify({'ok': True})

@app.route('/api/agreement/sign', methods=['POST'])
@login_required
def api_agreement_sign():
    if charter_locked():
        return locked_response()
    if get_state('agreement_open') != '1':
        return jsonify({'error': 'The agreement is not open yet'}), 400
    role = current_user.role
    if role not in bp.SIGNER_ROLES:
        return jsonify({'error': 'The works council, plant management and the Product Team sign the charter'}), 403
    conn = get_db()
    existing = conn.execute('SELECT handle FROM agreement_signatures WHERE role = ?', (role,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'Already signed for this group by ' + existing['handle']}), 409
    handle = current_user.public_name if role == 'organizer' else handle_for(current_user.alias)
    conn.execute('INSERT INTO agreement_signatures (role, user_id, handle, signed_at) VALUES (?,?,?,?)',
                 (role, current_user.id, handle, now_str()))
    conn.commit()
    signed = {r['role'] for r in conn.execute('SELECT role FROM agreement_signatures').fetchall()}
    conn.close()
    set_state('agreement_notice', '')
    if all(r in signed for r in bp.SIGNER_ROLES):
        lock_agreement()
        socketio.emit('feed_changed', {})
    broadcast_th()
    return jsonify({'ok': True, 'locked': charter_locked()})

@app.route('/charter')
@login_required
def charter_page():
    locked_at = get_state('agreement_locked_at')
    if locked_at:
        snap = json.loads(get_state('agreement_snapshot') or '{}')
        digest = get_state('agreement_hash')
    else:
        conn = get_db()
        snap = charter_snapshot(conn)
        conn.close()
        digest = None
    return render_template('charter.html', snap=snap, digest=digest, locked=bool(locked_at),
                           lang=current_user.language)

@app.route('/api/notifications')
@login_required
def api_notifications():
    phase = get_state('phase', 'before')
    when = get_state('when', '')
    notes = [
        {'id': 1, 'title': 'Town Hall: ' + get_state('title', ''), 'text': when + ' — share concerns in the Square beforehand.', 'time': 'pinned', 'read': phase != 'before'},
        {'id': 2, 'title': 'You are anonymous', 'text': 'Posts only show your group (e.g. Line Worker). Management never sees names.', 'time': '', 'read': False},
        {'id': 3, 'title': 'Write in German or English', 'text': 'Every post and chat message is translated automatically.', 'time': '', 'read': True},
    ]
    if phase == 'live':
        notes.insert(0, {'id': 4, 'title': 'Town Hall is LIVE', 'text': 'Open the Town Hall tab to vote and react.', 'time': 'now', 'read': False})
    if phase == 'after':
        notes.insert(0, {'id': 5, 'title': 'Did you feel heard?', 'text': '2-minute survey in the Town Hall tab.', 'time': 'now', 'read': False})
    return jsonify(notes)

SETTINGS_SECTIONS = [
    {'title': 'Accessibility', 'items': [
        {'key': 'big', 'label': 'Large text & buttons (glove mode)', 'type': 'big'},
    ]},
    {'title': 'Privacy · Zero-Log Shield', 'items': [
        {'key': 'anon', 'label': 'Always post anonymously', 'type': 'toggle', 'default': True, 'locked': True},
        {'key': 'nolog', 'label': 'No IP address or device data recorded', 'type': 'toggle', 'default': True, 'locked': True},
        {'key': 'strip_meta', 'label': 'Remove photo location data', 'type': 'toggle', 'default': True, 'locked': True},
    ]},
    {'title': 'Language', 'items': [
        {'key': 'language', 'label': 'Show posts in', 'type': 'language'},
        {'key': 'show_original', 'label': 'Show original text under translation', 'type': 'toggle', 'default': False},
    ]},
    {'title': 'Notifications', 'items': [
        {'key': 'broadcast_notif', 'label': 'Company broadcasts', 'type': 'toggle', 'default': True},
        {'key': 'sound_notif', 'label': 'Message sounds', 'type': 'toggle', 'default': False},
    ]},
]

@app.route('/api/settings')
@login_required
def api_settings():
    return jsonify(SETTINGS_SECTIONS)

from models.bot_replies import get_bot_reply

def get_bot_user_id():
    conn = get_db()
    row = conn.execute('SELECT id FROM users WHERE username = ?', ('helper',)).fetchone()
    conn.close()
    return row['id'] if row else None

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        online_users[current_user.id] = request.sid
        emit('user_online', {'user_id': current_user.id}, broadcast=True)
        broadcast_th()

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        online_users.pop(current_user.id, None)
        emit('user_offline', {'user_id': current_user.id}, broadcast=True)
        broadcast_th()

@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room')
    if room:
        join_room(room)

@socketio.on('leave_room')
def handle_leave_room(data):
    room = data.get('room')
    if room:
        leave_room(room)

@socketio.on('send_message')
def handle_send_message(data):
    if not current_user.is_authenticated:
        return
    content = (data.get('content') or '').strip()
    chat_type = data.get('chat_type', 'chat')
    target_id = data.get('target_id')
    msg_type = 'voice' if data.get('msg_type') == 'voice' else 'text'
    if not content or not target_id:
        return
    lang, en, de, _ = translate_fields(content)
    now = now_str()
    conn = get_db()
    if chat_type == 'chat':
        mid = conn.execute('INSERT INTO messages (sender_id, receiver_id, content, lang, content_en, content_de, msg_type, created_at) '
                           'VALUES (?,?,?,?,?,?,?,?)', (current_user.id, target_id, content, lang, en, de, msg_type, now)).lastrowid
        room = 'chat_%d_%d' % (min(current_user.id, target_id), max(current_user.id, target_id))
    else:
        mid = conn.execute('INSERT INTO messages (sender_id, group_id, content, lang, content_en, content_de, msg_type, created_at) '
                           'VALUES (?,?,?,?,?,?,?,?)', (current_user.id, target_id, content, lang, en, de, msg_type, now)).lastrowid
        room = 'group_%d' % target_id
    conn.commit()
    r = conn.execute('SELECT m.*, u.role, u.alias, u.display_name FROM messages m JOIN users u ON m.sender_id = u.id '
                     'WHERE m.id = ?', (mid,)).fetchone()
    conn.close()
    msg = serialize_msg(r, -1)
    msg['client_id'] = data.get('client_id')
    emit('new_message', msg, room=room)

    bot_id = get_bot_user_id()
    if chat_type == 'chat' and bot_id and target_id == bot_id:
        reply = get_bot_reply(content, current_user.language)
        rl, ren, rde, _ = translate_fields(reply)
        conn2 = get_db()
        bid = conn2.execute('INSERT INTO messages (sender_id, receiver_id, content, lang, content_en, content_de, created_at) '
                            'VALUES (?,?,?,?,?,?,?)', (bot_id, current_user.id, reply, rl, ren, rde, now_str())).lastrowid
        conn2.commit()
        br = conn2.execute('SELECT m.*, u.role, u.alias, u.display_name FROM messages m JOIN users u ON m.sender_id = u.id '
                           'WHERE m.id = ?', (bid,)).fetchone()
        conn2.close()
        socketio.sleep(0.8)
        emit('new_message', serialize_msg(br, -1), room=room)

@socketio.on('caption')
def handle_caption(data):
    if not current_user.is_authenticated:
        return
    text = (data.get('text') or '').strip()
    if not text:
        return
    lang, en, de, engine = translate_fields(text)
    emit('caption', {'speaker': current_user.public_name, 'role_label': current_user.role_label,
                     'lang': lang, 'en': en, 'de': de, 'final': bool(data.get('final', True)),
                     'time': datetime.now().strftime('%H:%M')}, broadcast=True)

@socketio.on('call_user')
def handle_call(data):
    target_id = data.get('target_id')
    if target_id in online_users:
        emit('incoming_call', {'caller_id': current_user.id, 'caller_name': current_user.public_name,
                               'call_type': data.get('call_type', 'voice')}, room=online_users[target_id])

@socketio.on('accept_call')
def handle_accept(data):
    caller_id = data.get('caller_id')
    if caller_id in online_users:
        emit('call_accepted', {'accepter_id': current_user.id}, room=online_users[caller_id])

@socketio.on('reject_call')
def handle_reject(data):
    caller_id = data.get('caller_id')
    if caller_id in online_users:
        emit('call_rejected', {'rejecter_name': current_user.public_name}, room=online_users[caller_id])

@socketio.on('end_call')
def handle_end_call(data):
    target_id = data.get('target_id')
    if target_id in online_users:
        emit('call_ended', {}, room=online_users[target_id])

from seed_data import seed_demo

if __name__ == '__main__':
    init_db()
    migrate_db()
    seed_demo(get_db, create_user, translate_fields, now_str)
    print('=' * 56)
    print('  BridgePulse is running')
    print('  On this computer : http://localhost:%d' % PORT)
    print('  On a phone (same Wi-Fi): http://%s:%d/join' % (lan_ip(), PORT))
    print('  Product Team     : priya / priya123')
    print('  Demo logins      : worker, union, safety, director / test123')
    print('  Translation      : %s' % bp.translation_mode())
    print('  Request logging  : off (Zero-Log)')
    print('=' * 56)
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True, allow_unsafe_werkzeug=True, log_output=False)
