FAQ = [
    (['anonym', 'name', 'who can see', 'wer sieht', 'identity', 'identität', 'boss', 'chef', 'management sees'],
     "Your name is never shown. Posts and messages only display your group (e.g. Line Worker) and a random handle. "
     "Priya and the product team see groups and themes, not people.",
     "Dein Name wird nie angezeigt. Beiträge und Nachrichten zeigen nur deine Gruppe (z. B. Bandarbeiter/in) und ein "
     "zufälliges Kürzel. Priya und das Produktteam sehen Gruppen und Themen, keine Personen."),
    (['data', 'daten', 'privacy', 'datenschutz', 'store', 'gespeichert', 'gdpr', 'dsgvo'],
     "We store your post text, the group you chose and your language — no e-mail, no phone number, no location. "
     "Photo location data is removed before upload.",
     "Gespeichert werden nur Text, gewählte Gruppe und Sprache — keine E-Mail, keine Telefonnummer, kein Standort. "
     "Standortdaten in Fotos werden vor dem Hochladen entfernt."),
    (['translate', 'übersetz', 'german', 'deutsch', 'english', 'englisch', 'sprache', 'language'],
     "Write in German or English — every post, comment and chat message is translated automatically. "
     "You can switch which language you read in under Settings.",
     "Schreib auf Deutsch oder Englisch — jeder Beitrag, Kommentar und jede Nachricht wird automatisch übersetzt. "
     "Die Lesesprache kannst du in den Einstellungen ändern."),
    (['town hall', 'meeting', 'when', 'wann', 'termin', 'versammlung'],
     "The Town Hall is a 60-minute live session. The most-supported concerns from the Square go on the agenda first, "
     "and you can vote, react and see the action plan being written live in the Town Hall tab.",
     "Das Town Hall ist eine 60-minütige Live-Sitzung. Die Themen mit der meisten Unterstützung im Square kommen zuerst "
     "auf die Agenda. Im Town-Hall-Tab kannst du live abstimmen, reagieren und den Maßnahmenplan mitverfolgen."),
    (['me too', 'support', 'vote', 'abstimm', 'unterstütz', 'weight', 'gewicht', 'priorit'],
     "Tap \"Me too\" on any post you agree with. Support is weighted by group so that shop-floor voices count most: "
     "Line Worker 1.5×, Safety Officer 1.3×, Union Rep 1.2×, Plant Director 1.0×.",
     "Tippe bei Beiträgen, denen du zustimmst, auf \"Ich auch\". Unterstützung wird nach Gruppe gewichtet, damit "
     "Stimmen aus der Produktion am meisten zählen: Bandarbeiter/in 1,5×, Sicherheitsfachkraft 1,3×, Betriebsrat 1,2×, "
     "Werksleitung 1,0×."),
    (['photo', 'foto', 'video', 'picture', 'bild'],
     "In the Square, tap the camera icon to add a photo or short video — useful for showing a blocked aisle or a "
     "hard-to-reach emergency stop.",
     "Im Square kannst du über das Kamera-Symbol ein Foto oder kurzes Video anhängen — z. B. um einen blockierten Gang "
     "oder einen schwer erreichbaren Not-Aus zu zeigen."),
    (['voice', 'sprach', 'speak', 'sprechen', 'mic', 'mikro'],
     "On the Chat page, tap the mic button and speak — your words are turned into a message and translated. "
     "Handy if you are wearing gloves.",
     "Auf der Chat-Seite einfach das Mikrofon drücken und sprechen — daraus wird eine übersetzte Nachricht. "
     "Praktisch mit Handschuhen."),
]

GREETINGS = ['hello', 'hi', 'hallo', 'hey', 'servus', 'moin', 'guten']

def get_bot_reply(message, language='de'):
    m = message.lower()
    de = language == 'de'
    for keys, en_text, de_text in FAQ:
        if any(k in m for k in keys):
            return de_text if de else en_text
    if any(m.strip().startswith(g) for g in GREETINGS):
        return ("Hallo! Ich bin der BridgePulse Helper. Frag mich z. B.: Wer sieht meinen Namen? Wie funktioniert die "
                "Übersetzung? Wann ist das Town Hall?") if de else \
               ("Hi! I'm the BridgePulse Helper. Ask me things like: Who can see my name? How does translation work? "
                "When is the Town Hall?")
    return ("Danke! Wenn das ein Anliegen für das Town Hall ist, poste es am besten im Square — dort kann es "
            "Unterstützung sammeln und wird in ein Thema eingeordnet.") if de else \
           ("Thanks! If this is a concern for the Town Hall, post it in the Square — there it can gather support "
            "and gets grouped into a theme.")
