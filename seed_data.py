import json
import random

SEED_POSTS = [
    ('worker', 60 * 26, 'de',
     'Gestern ist ein AMR in Halle 4 fast mit einem Gabelstapler zusammengestoßen. Der Gang ist zu eng für beide. '
     'Wer ist verantwortlich, wenn etwas passiert?',
     'Yesterday an AMR in Hall 4 almost collided with a forklift. The aisle is too narrow for both. '
     'Who is responsible if something happens?',
     None, 'safety', 'Hall 4 · Logistics / AMR lanes', '/static/seed/hall4-aisle.svg'),
    ('anon_s1', 60 * 50, 'de',
     'Ehrlich gesagt: Wir haben alle Angst, dass die Roboter in zwei Jahren unsere Arbeitsplätze ersetzen. '
     'Niemand sagt uns, was mit uns passiert.',
     'Honestly: we are all afraid the robots will replace our jobs within two years. '
     'Nobody tells us what will happen to us.',
     None, 'jobs', None, None),
    ('anon_s2', 60 * 30, 'de',
     'Seit die AMRs die Teile liefern, fühlt sich die Taktzeit kürzer an. Die Teile kommen schneller, aber wir sind '
     'nicht mehr Leute geworden. Keine Zeit für eine kurze Pause.',
     'Since the AMRs started delivering parts, the cycle time feels shorter. Parts arrive faster, but there are no '
     'more of us. No time for a short break.',
     None, 'pacing', 'Hall 3 · Final assembly', None),
    ('union', 60 * 44, 'de',
     'Der Betriebsrat wurde bei der Einführung der AMRs nicht rechtzeitig einbezogen. Die Roboter haben Kameras und '
     'Sensoren – welche Daten werden über uns gespeichert? Das gehört in eine Betriebsvereinbarung.',
     'The works council was not involved in time when the AMRs were introduced. The robots have cameras and '
     'sensors — what data is stored about us? This belongs in a works agreement.',
     None, 'codetermination', None, None),
    ('safety', 60 * 20, 'de',
     'Die Not-Aus-Taster an den AMRs sitzen auf Hüfthöhe an der Rückseite. In der Praxis erreicht man sie nicht '
     'schnell genug. Bitte vor dem nächsten Rollout prüfen.',
     'The emergency-stop buttons on the AMRs sit at hip height on the back. In practice you cannot reach them fast '
     'enough. Please check before the next rollout.',
     None, 'safety', 'Hall 3 · Final assembly', None),
    ('anon_s3', 60 * 70, 'de',
     'Wir hatten 45 Minuten Einweisung für ein komplett neues System. Die Anleitung gibt es nur auf Englisch.',
     'We had a 45-minute briefing for a completely new system. The manual is only available in English.',
     None, 'training', None, None),
    ('anon_s4', 60 * 9, 'de',
     'Ich bin seit 27 Jahren hier. Ich bin nicht gegen Technik, aber ich will wissen, ob es für Leute wie mich noch '
     'einen Platz gibt – vielleicht als Bediener oder Techniker für die Roboter?',
     "I've been here for 27 years. I'm not against technology, but I want to know whether there is still a place "
     "for people like me — maybe as an operator or technician for the robots?",
     None, 'jobs', None, None),
    ('director', 60 * 15, 'en',
     'We committed to the customer that Line 3 reaches full AMR throughput by Q1. I hear the concerns, but we need '
     'a realistic plan to get there — not an open-ended pause.',
     None,
     'Wir haben dem Kunden zugesagt, dass Linie 3 bis Q1 den vollen AMR-Durchsatz erreicht. Ich höre die Sorgen, '
     'aber wir brauchen einen realistischen Plan dafür – keine Pause ohne Ende.',
     'targets', None, None),
    ('anon_s5', 60 * 5, 'de',
     'Die Roboter piepen ständig. In Halle 3 ist es sowieso schon laut, man hört die Warnsignale kaum noch.',
     'The robots beep constantly. Hall 3 is loud anyway — you can barely hear the warning signals any more.',
     None, 'safety', 'Hall 3 · Final assembly', None),
    ('safety', 60 * 3, 'de',
     'Vorschlag: eine Testwoche mit halber AMR-Geschwindigkeit und markierten Fahrwegen, bevor wir hochfahren.',
     'Suggestion: a test week with the AMRs at half speed and marked lanes before we ramp up.',
     None, 'pacing', 'Hall 4 · Logistics / AMR lanes', None),
    ('anon_s6', 60 * 33, 'de',
     'Der Druck von oben ist enorm. Stückzahlen hoch, aber bei Fehlern sind wir schuld, nicht der Roboter.',
     'The pressure from above is huge. Output targets go up, but when there are mistakes we get blamed, not the robot.',
     None, 'targets', None, None),
    ('union', 60 * 2, 'de',
     'Warum findet das Town Hall auf Englisch statt? Viele Kollegen aus der Frühschicht verstehen nicht alles.',
     'Why is the Town Hall held in English? Many colleagues from the early shift do not understand everything.',
     None, 'other', None, None),
]

SEED_COMMENTS = [
    (0, 'anon_s2', 'de', 'Genau. Ich musste letzte Woche selbst zur Seite springen.',
     'Exactly. I had to jump aside myself last week.', None),
    (0, 'safety', 'de', 'Ist dokumentiert. Wir messen die Gangbreiten diese Woche nach.',
     "It's documented. We are re-measuring the aisle widths this week.", None),
    (1, 'anon_s4', 'de', 'Mir geht es genauso. Ein klares Wort von der Werksleitung würde helfen.',
     'Same for me. A clear statement from plant management would help.', None),
    (3, 'director', 'en', 'Fair point. We will bring the data list to the works council before the Town Hall.',
     None, 'Berechtigter Punkt. Wir legen dem Betriebsrat die Datenliste vor dem Town Hall vor.'),
]

SEED_SUPPORT = {
    0: ['anon_s1', 'anon_s2', 'anon_s3', 'anon_s4', 'anon_s5', 'anon_s6', 'safety', 'union', 'anon_s7', 'anon_s8'],
    1: ['worker', 'anon_s2', 'anon_s3', 'anon_s5', 'anon_s6', 'anon_s7', 'anon_s8', 'union'],
    2: ['worker', 'anon_s1', 'anon_s5', 'anon_s6', 'anon_s7'],
    3: ['anon_s1', 'anon_s3', 'anon_s8', 'safety'],
    4: ['worker', 'anon_s2', 'anon_s4', 'union'],
    5: ['anon_s1', 'anon_s4', 'anon_s7'],
    6: ['worker', 'anon_s1', 'anon_s2', 'anon_s5', 'anon_s8'],
    7: ['director2'],
    8: ['worker', 'anon_s2', 'safety'],
    9: ['worker', 'anon_s1', 'anon_s5', 'union', 'director'],
    10: ['anon_s2', 'anon_s3'],
    11: ['anon_s1', 'anon_s3', 'anon_s6'],
}

BROADCASTS = [
    ('priya', 60 * 72, 'en',
     'Town Hall on the AMR rollout — Thursday 23 Oct, 16:00 CET (11:00 in Halifax). I will join from Canada with the '
     'implementation team. Until then, please share anything on your mind here: text, photos or short videos, in '
     'German or English. You are anonymous — we only ever see your group, never your name.',
     None,
     'Town Hall zum AMR-Rollout — Donnerstag, 23. Okt., 16:00 Uhr MEZ (11:00 Uhr in Halifax). Ich schalte mich mit '
     'dem Implementierungsteam aus Kanada zu. Bis dahin teilt bitte hier alles, was euch beschäftigt: Text, Fotos oder '
     'kurze Videos, auf Deutsch oder Englisch. Ihr seid anonym — wir sehen nur eure Gruppe, nie euren Namen.'),
]

ROOMS = [
    ('Breakout · Hall 4 Logistics', ['worker', 'anon_s1', 'anon_s2', 'priya', 'safety'], [
        ('anon_s1', 'de', 'Wer kommt morgen zur Begehung in Halle 4?', 'Who is coming to the Hall 4 walk-through tomorrow?', None),
        ('worker', 'de', 'Ich. Ich mache Fotos von der engen Stelle beim Regal 12.', "Me. I'll take photos of the narrow spot at rack 12.", None),
        ('priya', 'en', 'Thank you both — please post the photos in the Square so the safety team can see them before Thursday.', None,
         'Danke euch beiden — bitte postet die Fotos im Square, damit das Sicherheitsteam sie vor Donnerstag sieht.'),
    ]),
    ('Breakout · Safety & Works Council', ['union', 'safety', 'priya', 'director'], [
        ('union', 'de', 'Wir brauchen vor dem Town Hall eine Liste aller Daten, die die AMRs erfassen.',
         'Before the Town Hall we need a list of all the data the AMRs collect.', None),
        ('director', 'en', 'Agreed. I asked the vendor for the full sensor and log specification.', None,
         'Einverstanden. Ich habe beim Hersteller die vollständige Sensor- und Log-Spezifikation angefordert.'),
    ]),
    ('Product Team (internal)', ['priya', 'director'], [
        ('priya', 'en', 'Draft agenda: 1) safety in Hall 4, 2) job security & reskilling, 3) data and works agreement, 4) action charter.', None,
         'Agenda-Entwurf: 1) Sicherheit in Halle 4, 2) Arbeitsplatzsicherheit & Umschulung, 3) Daten und Betriebsvereinbarung, 4) Maßnahmenplan.'),
    ]),
]

ACTIONS = [
    ('safety', 'Mark dedicated AMR lanes in Hall 4 and cap AMR speed at 50% for a 2-week trial',
     'Safety team + AMR implementation lead', 'Nov 7', 'proposed'),
    ('jobs', 'Publish a written no-layoff & reskilling commitment for AMR-affected roles, co-signed with the works council',
     'Plant director + HR', 'Nov 30', 'proposed'),
]

def seed_demo(get_db, create_user, translate_fields, now_str):
    conn = get_db()
    if conn.execute('SELECT COUNT(*) c FROM users').fetchone()['c'] > 0:
        conn.execute("UPDATE users SET status = 'online' WHERE username = 'helper'")
        conn.execute("UPDATE users SET display_name = 'Priya · Senior Product Manager' WHERE username = 'priya'")
        conn.execute("UPDATE groups_table SET name = 'Product Team (internal)' WHERE name IN ('Town Hall Team (internal)', 'Host prep (internal)')")
        conn.commit()
        conn.close()
        return
    print('  [Seed] Creating BridgePulse demo data...')
    ids = {}
    ids['priya'] = create_user(conn, 'priya', 'priya123', 'organizer', 'en', 'Priya · Senior Product Manager')
    ids['helper'] = create_user(conn, 'helper', 'helper-' + str(random.random()), 'organizer', 'en', 'BridgePulse Helper')
    ids['worker'] = create_user(conn, 'worker', 'test123', 'line_worker', 'de')
    ids['union'] = create_user(conn, 'union', 'test123', 'union_rep', 'de')
    ids['safety'] = create_user(conn, 'safety', 'test123', 'safety_officer', 'de')
    ids['director'] = create_user(conn, 'director', 'test123', 'director', 'en')
    ids['director2'] = create_user(conn, 'anon_director2', 'x' + str(random.random()), 'director', 'de')
    for i in range(1, 9):
        ids['anon_s%d' % i] = create_user(conn, 'anon_s%d' % i, 'x' + str(random.random()), 'line_worker', 'de')

    def ins_post(author, mins, lang, orig, en, de, theme, zone, media, broadcast=0):
        en = en or orig
        de = de or orig
        cur = conn.execute('''INSERT INTO posts (author_id, content, lang, content_en, content_de, tr_engine, theme, zone,
                              media_url, media_type, is_broadcast, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
                           (ids[author], orig, lang, en, de, 'seed', theme, zone, media,
                            'image' if media else None, broadcast, now_str(mins)))
        return cur.lastrowid

    for b in BROADCASTS:
        ins_post(b[0], b[1], b[2], b[3], b[4], b[5], 'other', None, None, broadcast=1)
    post_ids = [ins_post(*p) for p in SEED_POSTS]

    for idx, users in SEED_SUPPORT.items():
        for u in users:
            conn.execute('INSERT OR IGNORE INTO post_support (post_id, user_id, created_at) VALUES (?,?,?)',
                         (post_ids[idx], ids[u], now_str(30)))
    for idx, author, lang, orig, en, de in SEED_COMMENTS:
        conn.execute('INSERT INTO comments (post_id, author_id, content, lang, content_en, content_de, created_at) '
                     'VALUES (?,?,?,?,?,?,?)', (post_ids[idx], ids[author], orig, lang, en or orig, de or orig,
                                                now_str(random.randint(60, 600))))

    for name, members, msgs in ROOMS:
        private = 1 if 'internal' in name else 0
        gid = conn.execute('INSERT INTO groups_table (name, created_by, private) VALUES (?, ?, ?)',
                           (name, ids['priya'], private)).lastrowid
        for m in members:
            conn.execute('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', (gid, ids[m]))
        for i, (author, lang, orig, en, de) in enumerate(msgs):
            conn.execute('INSERT INTO messages (sender_id, group_id, content, lang, content_en, content_de, created_at) '
                         'VALUES (?,?,?,?,?,?,?)', (ids[author], gid, orig, lang, en or orig, de or orig,
                                                    now_str(180 - i * 12)))

    conn.execute('INSERT INTO messages (sender_id, receiver_id, content, lang, content_en, content_de, created_at) '
                 'VALUES (?,?,?,?,?,?,?)',
                 (ids['helper'], ids['worker'],
                  'Hallo! Ich bin der BridgePulse Helper. Frag mich alles zu Anonymität, Übersetzung oder dem Town Hall.',
                  'de', "Hi! I'm the BridgePulse Helper. Ask me anything about anonymity, translation or the Town Hall.",
                  'Hallo! Ich bin der BridgePulse Helper. Frag mich alles zu Anonymität, Übersetzung oder dem Town Hall.',
                  now_str(240)))

    for k, v in [('phase', 'before'), ('title', 'AMR Rollout · Stuttgart Plant'),
                 ('when', 'Thu 23 Oct · 16:00 CET / 11:00 ADT')]:
        conn.execute('INSERT OR REPLACE INTO th_state (key, value) VALUES (?, ?)', (k, v))
    conn.execute('INSERT INTO polls (question, options, is_open, created_at) VALUES (?,?,1,?)',
                 ('Which topic should we open the Town Hall with?',
                  json.dumps(['Safety in Hall 4', 'Job security & reskilling', 'Data & works agreement', 'Line pace / breaks']),
                  now_str(100)))
    pid = conn.execute('SELECT MAX(id) m FROM polls').fetchone()['m']
    votes = {'anon_s1': 1, 'anon_s2': 0, 'anon_s3': 1, 'anon_s4': 1, 'anon_s5': 0, 'anon_s6': 3,
             'anon_s7': 0, 'anon_s8': 1, 'union': 2, 'safety': 0, 'director2': 3}
    for u, o in votes.items():
        conn.execute('INSERT INTO poll_votes (poll_id, user_id, option_idx) VALUES (?,?,?)', (pid, ids[u], o))
    for u, v in {'anon_s1': 2, 'anon_s2': 2, 'anon_s3': 3, 'anon_s4': 1, 'anon_s5': 2, 'anon_s6': 3,
                 'anon_s7': 2, 'anon_s8': 3, 'union': 2, 'safety': 3, 'director2': 4}.items():
        conn.execute('INSERT INTO pulses (user_id, value, updated_at) VALUES (?,?,?)', (ids[u], v, now_str(20)))
    for theme, title, owner, due, status in ACTIONS:
        conn.execute('INSERT INTO actions (theme, title, owner, due, status, created_at) VALUES (?,?,?,?,?,?)',
                     (theme, title, owner, due, status, now_str(50)))
    conn.commit()
    conn.close()
    print('  [Seed] Done.')
