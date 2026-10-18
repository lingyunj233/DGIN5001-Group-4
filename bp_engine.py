import os
import re
import json
import html
import time
import urllib.parse
import urllib.request

ROLES = {
    'line_worker':    {'label': 'Line Worker',     'label_de': 'Bandarbeiter/in',      'weight': 1.5, 'color': '#2F7FB0'},
    'safety_officer': {'label': 'Safety Officer',  'label_de': 'Sicherheitsfachkraft', 'weight': 1.3, 'color': '#E07A00'},
    'union_rep':      {'label': 'Union Rep',       'label_de': 'Betriebsrat',          'weight': 1.2, 'color': '#2F9E6E'},
    'director':       {'label': 'Plant Director',  'label_de': 'Werksleitung',         'weight': 1.0, 'color': '#7C5CD6'},
    'organizer':      {'label': 'Product Team',    'label_de': 'Produktteam',       'weight': 0.0, 'color': '#0B3C5D'},
}
PUBLIC_ROLES = ['line_worker', 'safety_officer', 'union_rep', 'director']

def role_weight(role):
    return ROLES.get(role, {}).get('weight', 1.0)

THEMES = {
    'safety': {
        'label': 'Physical Safety', 'color': '#E5484D',
        'kw': ['safety', 'unsafe', 'collision', 'collide', 'crash', 'injur', 'accident', 'danger', 'hazard',
               'emergency stop', 'e-stop', 'hurt', 'near miss', 'near-miss', 'sensor', 'blind spot',
               'sicherheit', 'unsicher', 'kollision', 'zusammenstoß', 'zusammenstoss', 'verletz', 'unfall',
               'gefahr', 'gefährlich', 'not-aus', 'notaus', 'beinahe', 'toter winkel', 'stolper', 'quetsch'],
    },
    'pacing': {
        'label': 'Machine Pacing & Workload', 'color': '#E07A00',
        'kw': ['pace', 'pacing', 'speed', 'too fast', 'faster', 'tempo', 'cycle time', 'takt', 'break', 'workload',
               'tired', 'exhaust', 'overtime', 'rhythm', 'keep up',
               'schnell', 'taktzeit', 'pause', 'arbeitslast', 'müde', 'erschöpf', 'überstunden', 'stress',
               'hinterher', 'rhythmus', 'belastung'],
    },
    'jobs': {
        'label': 'Job Security', 'color': '#7C5CD6',
        'kw': ['job', 'replace', 'replaced', 'layoff', 'laid off', 'fired', 'redundan', 'future', 'contract',
               'my position', 'unemploy', 'displace',
               'arbeitsplatz', 'arbeitsplätze', 'ersetzt', 'ersetzen', 'entlass', 'kündig', 'zukunft',
               'stelle', 'arbeitslos', 'abbau', 'stellenabbau'],
    },
    'codetermination': {
        'label': 'Co-determination & Privacy', 'color': '#2F9E6E',
        'kw': ['union', 'works council', 'co-determination', 'codetermination', 'consult', 'monitor', 'tracking',
               'track', 'surveillance', 'camera', 'privacy', 'data', 'telemetry', 'agreement',
               'betriebsrat', 'mitbestimmung', 'gewerkschaft', 'überwach', 'kamera', 'daten', 'datenschutz',
               'betriebsvereinbarung', 'ig metall', 'gefragt', 'mitspracherecht'],
    },
    'training': {
        'label': 'Training & Skills', 'color': '#C2418C',
        'kw': ['training', 'train ', 'trained', 'learn', 'reskill', 'upskill', 'skill', 'course', 'manual',
               'instruction', 'explain',
               'schulung', 'weiterbildung', 'lernen', 'qualifizier', 'einweisung', 'anleitung', 'erklär',
               'umschulung'],
    },
    'targets': {
        'label': 'Production Targets & Pressure', 'color': '#5F7D95',
        'kw': ['target', 'quota', 'pressure', 'deadline', 'output', 'kpi', 'management', 'bonus',
               'ziel', 'zielvorgabe', 'quote', 'druck', 'stückzahl', 'stückzahlen', 'vorgabe', 'leistung', 'chef'],
    },
}
THEME_OTHER = {'label': 'Other', 'color': '#94A3B8'}

def theme_meta(key):
    return THEMES.get(key, THEME_OTHER)

def classify_theme(text):
    t = (text or '').lower()
    best, best_hits = 'other', 0
    for key, meta in THEMES.items():
        hits = sum(1 for k in meta['kw'] if k in t)
        if hits > best_hits:
            best, best_hits = key, hits
    return best

_DE_HINTS = set('der die das und ist nicht ich wir sie es ein eine mit auf für zu bei wird werden haben '
                'sind auch noch nur wenn aber oder weil dass kein keine mehr sehr unsere unser mein meine '
                'halle schicht roboter arbeit warum wie was wer'.split())
_EN_HINTS = set('the and is are not we they it a an with on for to at will be have has also only if but or '
                'because that no more very our my hall shift robot work why how what who'.split())

def detect_language(text):
    if not text:
        return 'en'
    if re.search(r'[äöüßÄÖÜ]', text):
        return 'de'
    words = re.findall(r"[a-zA-Zäöüß]+", text.lower())
    de = sum(1 for w in words if w in _DE_HINTS)
    en = sum(1 for w in words if w in _EN_HINTS)
    return 'de' if de > en else 'en'

LLM_API_KEY = os.environ.get('BP_LLM_API_KEY') or os.environ.get('ANTHROPIC_API_KEY')
LLM_MODEL = os.environ.get('BP_LLM_MODEL', 'claude-haiku-5-5')

def llm_available():
    return bool(LLM_API_KEY)

def translation_mode():
    if llm_available():
        return 'LLM API'
    if FREE_TRANSLATE and _free_ok():
        return 'free online API (MyMemory)'
    return 'offline glossary'

def _llm(prompt, max_tokens=600):
    body = json.dumps({
        'model': LLM_MODEL,
        'max_tokens': max_tokens,
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages', data=body,
        headers={'content-type': 'application/json', 'x-api-key': LLM_API_KEY,
                 'anthropic-version': '2023-06-01'})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode('utf-8'))
    return ''.join(b.get('text', '') for b in data.get('content', [])).strip()

_GLOSSARY_DE_EN = {
    'der': 'the', 'die': 'the', 'das': 'the', 'den': 'the', 'dem': 'the', 'des': 'of the',
    'ein': 'a', 'eine': 'a', 'einen': 'a', 'einem': 'a', 'und': 'and', 'oder': 'or', 'aber': 'but',
    'ist': 'is', 'sind': 'are', 'war': 'was', 'wird': 'will', 'werden': 'will be', 'wurde': 'was',
    'nicht': 'not', 'kein': 'no', 'keine': 'no', 'nie': 'never', 'immer': 'always', 'sehr': 'very',
    'zu': 'too', 'viel': 'much', 'mehr': 'more', 'weniger': 'less', 'noch': 'still', 'schon': 'already',
    'ich': 'I', 'wir': 'we', 'sie': 'they', 'er': 'he', 'es': 'it', 'uns': 'us', 'mich': 'me', 'mir': 'me',
    'mein': 'my', 'meine': 'my', 'unser': 'our', 'unsere': 'our', 'unseren': 'our',
    'haben': 'have', 'habe': 'have', 'hat': 'has', 'kann': 'can', 'können': 'can', 'muss': 'must',
    'müssen': 'must', 'soll': 'should', 'sollen': 'should', 'will': 'want', 'wollen': 'want',
    'mit': 'with', 'ohne': 'without', 'für': 'for', 'auf': 'on', 'in': 'in', 'im': 'in the', 'an': 'at',
    'am': 'at the', 'bei': 'at', 'von': 'from', 'vom': 'from the', 'nach': 'after', 'vor': 'before',
    'über': 'about', 'wegen': 'because of', 'weil': 'because', 'wenn': 'if', 'dass': 'that', 'wie': 'how',
    'was': 'what', 'warum': 'why', 'wer': 'who', 'wo': 'where', 'heute': 'today', 'morgen': 'tomorrow',
    'gestern': 'yesterday', 'jetzt': 'now', 'bitte': 'please', 'danke': 'thanks', 'ja': 'yes', 'nein': 'no',
    'roboter': 'robot', 'robotern': 'robots', 'halle': 'hall', 'schicht': 'shift', 'band': 'line',
    'fließband': 'assembly line', 'linie': 'line', 'arbeit': 'work', 'arbeiten': 'work',
    'arbeitsplatz': 'job', 'arbeitsplätze': 'jobs', 'kollegen': 'colleagues', 'kollege': 'colleague',
    'sicherheit': 'safety', 'gefährlich': 'dangerous', 'unfall': 'accident', 'fährt': 'drives',
    'fahren': 'drive', 'schnell': 'fast', 'langsam': 'slow', 'tempo': 'pace', 'pause': 'break',
    'pausen': 'breaks', 'ersetzt': 'replaced', 'angst': 'fear', 'sorge': 'worry', 'sorgen': 'worries',
    'zukunft': 'future', 'betriebsrat': 'works council', 'schulung': 'training', 'daten': 'data',
    'kamera': 'camera', 'kameras': 'cameras', 'überwacht': 'monitored', 'gefragt': 'asked',
    'niemand': 'nobody', 'alle': 'everyone', 'leute': 'people', 'stress': 'stress', 'druck': 'pressure',
    'ziel': 'target', 'ziele': 'targets', 'management': 'management', 'chef': 'boss', 'gut': 'good',
    'schlecht': 'bad', 'neue': 'new', 'neuen': 'new', 'alten': 'old', 'gang': 'aisle', 'gänge': 'aisles',
    'eng': 'narrow', 'laut': 'loud', 'hören': 'hear', 'sehen': 'see', 'stoppt': 'stops', 'stopp': 'stop',
    'wissen': 'know', 'ob': 'whether', 'sicher': 'safe', 'unsicher': 'unsafe', 'zu': 'too', 'fast': 'almost',
    'gefragt': 'asked', 'hat': 'has', 'niemand': 'nobody', 'warum': 'why', 'brauchen': 'need', 'braucht': 'needs',
    'passiert': 'happens', 'verstehen': 'understand', 'versteht': 'understands', 'fragen': 'ask', 'frage': 'question',
    'antwort': 'answer', 'plan': 'plan', 'woche': 'week', 'wochen': 'weeks', 'jahr': 'year', 'jahren': 'years',
    'teile': 'parts', 'gabelstapler': 'forklift', 'not-aus': 'emergency stop', 'kollegin': 'colleague',
    'einweisung': 'briefing', 'anleitung': 'manual', 'wieder': 'again', 'genug': 'enough', 'gibt': 'there is',
    'machen': 'do', 'macht': 'does', 'gemacht': 'done', 'sagen': 'say', 'sagt': 'says', 'gesagt': 'said',
    'uns': 'us', 'euch': 'you', 'ihr': 'you', 'ihnen': 'them', 'unsere': 'our', 'dafür': 'for that',
    'dagegen': 'against it', 'gegen': 'against', 'technik': 'technology', 'leben': 'life', 'familie': 'family',
}

def _glossary_translate(text, glossary):
    def repl(m):
        w = m.group(0)
        t = glossary.get(w.lower())
        if t is None:
            return w
        return t[0].upper() + t[1:] if w[0].isupper() and m.start() == 0 else t
    return re.sub(r"[A-Za-zÄÖÜäöüß]+", repl, text)

FREE_TRANSLATE = os.environ.get('BP_FREE_TRANSLATE', '1') != '0'
_free_retry_at = 0
_cache = {}

def _free_ok():
    return time.time() >= _free_retry_at

def _mymemory(text, source, target):
    global _free_retry_at
    parts, buf = [], ''
    for sent in re.split(r'(?<=[.!?])\s+', text):
        if len((buf + ' ' + sent).encode('utf-8')) > 450 and buf:
            parts.append(buf)
            buf = sent
        else:
            buf = (buf + ' ' + sent).strip()
    if buf:
        parts.append(buf)
    out = []
    for p in parts:
        url = 'https://api.mymemory.translated.net/get?' + urllib.parse.urlencode(
            {'q': p, 'langpair': '%s|%s' % (source, target)})
        try:
            with urllib.request.urlopen(url, timeout=6) as r:
                data = json.loads(r.read().decode('utf-8'))
        except Exception as e:
            _free_retry_at = time.time() + 300
            print('  [BridgePulse] Online translation unreachable, using glossary for 5 min:', e)
            return None
        t = (data.get('responseData') or {}).get('translatedText') or ''
        if str(data.get('responseStatus')) != '200' or not t or t.upper().startswith('MYMEMORY WARNING'):
            return None
        out.append(html.unescape(t))
    return ' '.join(out)

def translate(text, target='en', source=None):
    if not text:
        return text, 'none'
    source = source or detect_language(text)
    if source == target:
        return text, 'none'
    key = (text, target)
    if key in _cache:
        return _cache[key]
    result = None
    if llm_available():
        try:
            lang = 'English' if target == 'en' else 'German'
            out = _llm('Translate this workplace feedback from a German automotive plant into ' + lang +
                       '. Keep the tone and any shop-floor terms. Reply with the translation only.\n\n' + text)
            if out:
                result = (out, 'llm')
        except Exception as e:
            print('  [BridgePulse] LLM translation failed:', e)
    if result is None and FREE_TRANSLATE and _free_ok():
        out = _mymemory(text, source, target)
        if out:
            result = (out, 'online')
    if result is None:
        if target == 'en':
            result = (_glossary_translate(text, _GLOSSARY_DE_EN), 'glossary')
        else:
            return text, 'none'
    _cache[key] = result
    return result

CULTURAL_NOTES = [
    (['betriebsrat', 'works council'],
     'Betriebsrat = elected works council. Under German co-determination law (BetrVG) it must be involved '
     'before technology that can monitor employee behaviour or performance is introduced.'),
    (['mitbestimmung', 'co-determination'],
     'Mitbestimmung (co-determination) is a legal right in Germany, not a courtesy. Framing decisions as '
     '"already made" will read as a breach of trust.'),
    (['ig metall'],
     'IG Metall is the main metalworkers\' union in German automotive plants and negotiates collective agreements.'),
    (['schicht', 'shift'],
     'Shift workers may only be able to join from a phone during breaks — keep asks short.'),
    (['überwach', 'kamera', 'camera', 'tracking', 'monitor'],
     'Worker monitoring is a highly sensitive topic in Germany (GDPR + BetrVG). Be explicit about what data '
     'the AMRs collect and who can see it.'),
    (['takt', 'taktzeit'],
     'Takt / Taktzeit = line cycle time. Changes to Takt directly change workload and are usually negotiated.'),
]

def cultural_notes(text):
    t = (text or '').lower() + ' '
    notes = []
    for keys, note in CULTURAL_NOTES:
        if any(k in t for k in keys):
            notes.append(note)
    return notes[:2]

def post_score(author_role, supporter_roles, reply_count):
    return round(role_weight(author_role) + sum(role_weight(r) for r in supporter_roles) + 0.5 * reply_count, 2)

def summarize_theme(theme_key, posts):
    if not posts:
        return ''
    roles = {}
    for p in posts:
        roles[p['role']] = roles.get(p['role'], 0) + 1 + len(p.get('supporter_roles', []))
    top_role = max(roles, key=roles.get)
    share = round(100 * roles[top_role] / max(1, sum(roles.values())))
    return '%d post%s · %d%% of voices from %ss' % (
        len(posts), '' if len(posts) == 1 else 's', share, ROLES[top_role]['label'])
