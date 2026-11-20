"""Simplified plant map for the demo (a made-up car plant, not a real one).

Two levels: five zones, and three fixed, numbered spots inside each zone. People can only pick a zone or one of
its spots, never an exact point, so reports from the same place add up and nobody can be located precisely.
The drawing uses neutral colours only: in the app, colour means theme.

The browser builds the SVG from this data (static/js/app.js, "Plant map").
"""

ZONES = [
    {'key': 'Warehouse', 'rect': [8, 8, 100, 96],
     'title': {'en': 'Warehouse', 'de': 'Lager'}, 'sub': {'en': 'Parts in', 'de': 'Teileeingang'},
     'short': {'en': 'Warehouse', 'de': 'Lager'}},
    {'key': 'Hall 4 · Logistics / AMR lanes', 'rect': [116, 8, 236, 96],
     'title': {'en': 'Hall 4', 'de': 'Halle 4'}, 'sub': {'en': 'Logistics · AMR lanes', 'de': 'Logistik · AMR-Spuren'},
     'short': {'en': 'Hall 4 · Logistics', 'de': 'Halle 4 · Logistik'}},
    {'key': 'Hall 1 · Body shop', 'rect': [8, 128, 112, 164],
     'title': {'en': 'Hall 1', 'de': 'Halle 1'}, 'sub': {'en': 'Body shop', 'de': 'Karosseriebau'},
     'short': {'en': 'Hall 1 · Body shop', 'de': 'Halle 1 · Karosseriebau'}},
    {'key': 'Hall 2 · Paint', 'rect': [126, 128, 96, 164],
     'title': {'en': 'Hall 2', 'de': 'Halle 2'}, 'sub': {'en': 'Paint', 'de': 'Lackiererei'},
     'short': {'en': 'Hall 2 · Paint', 'de': 'Halle 2 · Lackiererei'}},
    {'key': 'Hall 3 · Final assembly', 'rect': [228, 128, 124, 164],
     'title': {'en': 'Hall 3', 'de': 'Halle 3'}, 'sub': {'en': 'Final assembly', 'de': 'Montage'},
     'short': {'en': 'Hall 3 · Assembly', 'de': 'Halle 3 · Montage'}},
]

# Order used in drop-down lists (Hall 1 to 4, then the warehouse).
ZONE_KEYS = ['Hall 1 · Body shop', 'Hall 2 · Paint', 'Hall 3 · Final assembly', 'Hall 4 · Logistics / AMR lanes', 'Warehouse']

# Three spots per zone: position in the zone drawing (viewBox 0 0 360 240) and the name.
SPOTS = {
    'Warehouse': [
        {'x': 30, 'y': 120, 'en': 'Truck docks', 'de': 'Laderampen'},
        {'x': 170, 'y': 135, 'en': 'Rack aisles', 'de': 'Regalgänge'},
        {'x': 328, 'y': 120, 'en': 'Gate to Hall 4', 'de': 'Tor zu Halle 4'}],
    'Hall 4 · Logistics / AMR lanes': [
        {'x': 144, 'y': 198, 'en': 'Narrow aisle: AMRs cross forklifts', 'de': 'Enger Gang: AMR kreuzt Stapler'},
        {'x': 222, 'y': 90, 'en': 'Supermarket & kitting', 'de': 'Supermarkt & Kitting'},
        {'x': 316, 'y': 142, 'en': 'AMR charging', 'de': 'AMR-Ladestation'}],
    'Hall 1 · Body shop': [
        {'x': 64, 'y': 39, 'en': 'AMR drop-off', 'de': 'AMR-Übergabe'},
        {'x': 217, 'y': 95, 'en': 'Robot cells', 'de': 'Roboterzellen'},
        {'x': 180, 'y': 207, 'en': 'Walkway by the line', 'de': 'Fußweg an der Linie'}],
    'Hall 2 · Paint': [
        {'x': 64, 'y': 39, 'en': 'AMR drop-off', 'de': 'AMR-Übergabe'},
        {'x': 230, 'y': 89, 'en': 'Paint booths', 'de': 'Lackierkabinen'},
        {'x': 230, 'y': 192, 'en': 'Drying oven', 'de': 'Trockner'}],
    'Hall 3 · Final assembly': [
        {'x': 79, 'y': 79, 'en': 'AMR drop-off at the line', 'de': 'AMR-Übergabe an der Linie'},
        {'x': 200, 'y': 132, 'en': 'Assembly stations', 'de': 'Montagestationen'},
        {'x': 295, 'y': 202, 'en': 'End-of-line test', 'de': 'Endprüfung'}],
}

DETAIL, DETAIL2, NAVY, MUTED = '#D5DEE5', '#9FB0BD', '#0B3C5D', '#6B8194'


def _interior(key, lang):
    """The simplified inside of one zone: racks, robot cells, lines. Decoration only, not clickable."""
    o = []

    def lbl(x, y, en, de):
        o.append('<text x="%s" y="%s" font-size="10" fill="%s">%s</text>' % (x, y, MUTED, de if lang == 'de' else en))

    def drop(x, y, w, h):  # AMR drop-off area
        o.append('<rect x="%s" y="%s" width="%s" height="%s" rx="4" fill="url(#pm-hatchn)" stroke="%s" stroke-width="1.2" '
                 'stroke-dasharray="4 3"/>' % (x, y, w, h, NAVY))

    if key == 'Warehouse':
        for i in range(4):
            o.append('<rect x="0" y="%d" width="10" height="28" rx="2" fill="%s"/>' % (40 + i * 46, DETAIL2))
        for i in range(5):
            o.append('<rect x="70" y="%d" width="200" height="10" rx="2" fill="%s"/>' % (30 + i * 40, DETAIL))
        o.append('<rect x="349" y="98" width="10" height="44" fill="#FFFFFF"/><path d="M336 92 v56" stroke="%s" stroke-width="2"/>' % DETAIL2)
        lbl(70, 226, 'Racks', 'Regale')
        lbl(300, 162, '→ Hall 4', '→ Halle 4')
    elif key == 'Hall 4 · Logistics / AMR lanes':
        o.append('<rect x="20" y="22" width="96" height="140" fill="url(#pm-hatch)" stroke="#DCE4EA"/>')
        lbl(26, 156, 'Forklifts', 'Stapler')
        o.append('<rect x="134" y="22" width="20" height="210" fill="#E6ECF0"/>')
        for r in range(2):
            for i in range(3):
                o.append('<rect x="%d" y="%d" width="26" height="36" rx="3" fill="%s"/>' % (174 + i * 34, 36 + r * 74, DETAIL))
        for i in range(3):
            y = 30 + i * 34
            o.append('<rect x="292" y="%d" width="48" height="24" rx="4" fill="#E8EEF2" stroke="%s" stroke-width="1.3"/>'
                     '<path d="M318 %d l-5 8 h5 l-2 8 l7 -10 h-5 l2 -6 z" fill="%s"/>' % (y, NAVY, y + 4, NAVY))
        o.append('<path d="M14 198 H346" stroke="%s" stroke-width="2.5" stroke-dasharray="7 5" fill="none"/>' % NAVY)
        lbl(196, 222, 'AMR lane', 'AMR-Spur')
    elif key == 'Hall 1 · Body shop':
        drop(24, 22, 80, 34)
        for r in range(2):
            for c in range(4):
                x, y = 150 + c * 45, 70 + r * 50
                o.append('<rect x="%d" y="%d" width="30" height="30" rx="4" fill="none" stroke="%s" stroke-width="2"/>'
                         '<circle cx="%d" cy="%d" r="6" fill="%s"/>' % (x - 15, y - 15, DETAIL, x, y, DETAIL2))
        o.append('<rect x="24" y="160" width="312" height="10" rx="3" fill="%s"/>' % DETAIL)
        lbl(24, 186, 'Body line', 'Karosserie-Linie')
        o.append('<rect x="24" y="198" width="312" height="18" rx="3" fill="#FFFFFF" stroke="%s" stroke-dasharray="4 4"/>' % DETAIL)
    elif key == 'Hall 2 · Paint':
        drop(24, 22, 80, 34)
        for i in range(3):
            y = 30 + i * 44
            o.append('<rect x="130" y="%d" width="200" height="30" rx="3" fill="%s"/>' % (y, DETAIL))
            for k in range(8):
                o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#FFFFFF" stroke-width="3"/>'
                         % (144 + k * 24, y + 4, 144 + k * 24, y + 26))
        o.append('<rect x="130" y="172" width="200" height="40" rx="4" fill="#E3E9EE" stroke="#C9D5DE"/>')
    elif key == 'Hall 3 · Final assembly':
        o.append('<path d="M30 50 H330 V105 H30 V160 H330" stroke="%s" stroke-width="10" fill="none" stroke-linejoin="round"/>' % DETAIL)
        for x in range(150, 330, 30):
            for y in (50, 105, 160):
                o.append('<rect x="%d" y="%d" width="4" height="6" fill="%s"/>' % (x, y - 3, DETAIL2))
        drop(44, 64, 70, 30)
        o.append('<rect x="250" y="180" width="90" height="44" rx="4" fill="#E3E9EE" stroke="#C9D5DE"/>')
        lbl(30, 186, 'Assembly line', 'Montagelinie')
    return ''.join(o)


def valid_spot(zone, spot):
    """1 to 3 if the spot exists in that zone, otherwise None (= the whole zone or no location)."""
    try:
        n = int(spot)
    except (TypeError, ValueError):
        return None
    return n if zone in SPOTS and 1 <= n <= len(SPOTS[zone]) else None


def boot():
    """Everything the browser needs to draw the map, in both languages."""
    return {'zones': ZONES, 'spots': SPOTS,
            'inside': {z['key']: {'en': _interior(z['key'], 'en'), 'de': _interior(z['key'], 'de')} for z in ZONES}}
