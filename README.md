# BridgePulse

**A town hall kit that helps a remote facilitator turn a sceptical, multilingual shop-floor audience into co-designers.**

DGIN 5001 Capstone in Digital Innovation · Group 4 · Dalhousie University · Fall 2026

---

## The design challenge

Priya is a Senior Product Manager at a B2B industrial automation company in Halifax, Nova Scotia. She is leading
the rollout of AI-assisted Autonomous Mobile Robots (AMRs) at an automotive plant in Stuttgart, Germany. The rollout
is failing: veteran assembly workers bypass the robots or block their paths, and the works council is threatening to
halt the contract because workers were not consulted on how the AI controls floor traffic.

Priya has one 60-minute virtual town hall, run from Halifax, to rebuild trust and secure buy-in to adapt the pilot.
The audience has four groups with different needs:

| Group | What they want |
|---|---|
| Veteran assembly line workers | Guaranteed physical safety, uninterrupted workflows, an answer on job replacement |
| Trade union / works council | Worker autonomy, privacy and co-determination rights over AI-driven pacing |
| Plant operations directors | Daily quotas met and a return on the robotics investment, without strikes |
| Health & safety compliance officers | Human–robot traffic flows with zero incidents |

### Scenario boundaries and assumptions

- Around 30 stakeholders (C-suite, AMR technical specialists, implementation leads) sit in the boardroom; about 100
  invited workers, union reps, directors and safety officers dial in remotely, many from the shop floor.
- Shop-floor participants use their own phones, often during a shift, in noisy conditions.
- On the floor people wear gloves and have only a few seconds of attention to spare, so input has to work with large
  tap targets, voice and very little reading or typing.
- Nothing can require installing a native app or creating an account; joining must take seconds.
- German workplace privacy rules forbid identifiable worker telemetry, so participation must be anonymous while still
  showing which stakeholder group a voice belongs to.
- Most workers write and speak German; Priya works in English.
- The town hall is one 60-minute session across time zones (Halifax ADT / Stuttgart CET).

### Why existing tools are not enough

Presentation tools and audience-polling software such as Mentimeter or Slido collect votes on questions the host
already chose. They cannot capture complex industrial friction in workers' own words, they offer no live
German ⇄ English translation, and they end with fragmented charts instead of an agreement both sides can act on.

## The solution

BridgePulse supports the town hall **before, during and after** the 60 minutes. Workers scan a QR code, tap their
group once and are in: no download, no account, no name. Priya (the Product Team) sees the same input translated
into English, grouped into themes and condensed into three ranked focus cards.

| Phase | Space in the app | What happens |
|---|---|---|
| Before | **Square** | An X-style company feed. Pinned company broadcasts from the Product Team announce the town hall. Workers send a **quick report** (tap up to three large problem tiles, swipe a feeling slider, optionally speak, add a photo and a plant zone) or write a longer post with text, photos or short videos in German or English. Each post is translated, sorted into a theme and can be supported with "Me too". |
| Before / during | **Chat** | Direct messages and breakout rooms for smaller-group discussion, with speech-to-text input and per-message translation plus notes on German workplace terms. |
| During | **Town Hall** | A 60-minute agenda clock. Priya works from three ranked focus cards with facilitation prompts and presses **Discuss now**; everyone else sees a "Now discussing" banner. Live captions in both languages, live polls, a comfort pulse, live reactions and an **action charter** that every participant can agree with or mark "not yet". |
| Final 15 minutes | **Town Hall** | The **Co-Design Agreement**: concrete trial rules (AMR speed cap, trial length, joint review checkpoints, lanes, near-miss pause, data list, reskilling date) are set on screen. Workers answer "Works for me / Not yet" on each rule; the works council, plant management and the Product Team each sign for their group. When all three have signed, the charter is locked. |
| After | **Town Hall** and `/charter` | A two-question survey (*Did you feel heard? Does the action plan address your concerns?*). The signed charter, with its fingerprint, stays visible to everyone and can be printed or saved as PDF. |

## Features and the needs they address

| Feature | Who it serves | Need addressed |
|---|---|---|
| One-tap guest join from the QR code (`/join`): tap your group, choose Deutsch / English, done | Shop-floor workers | No registration screen, so no hesitation before the first report |
| Zero-Log Shield badge on the join page and in the composer | Workers, union | States exactly what is and is not recorded (see Privacy by design) |
| Anonymous identity showing only the stakeholder group and a random handle | Workers, union | Psychological safety; compliance with German privacy expectations |
| Quick report: ten large, high-contrast problem tiles (e.g. "Pacing hazard", "Corridor blockage", "Near miss", "E-stop out of reach") | Workers in gloves | Report a problem without typing |
| One-swipe feeling slider (😟 → 😊) | Workers, Priya | Capture how strongly people feel, not only what the problem is |
| Voice to text in the quick report, the long post and Chat (German or English) | Workers in gloves or with busy hands | Say more without a keyboard; the phone keyboard's microphone is the fallback |
| Glove mode (**Aa** button): bigger text, larger tap targets, stronger contrast; on by default on touch screens, except for the Product Team and plant directors | Shop-floor workers | Usable with gloves and at a glance |
| Simple view (default for line workers, switchable in Settings): the report form sits behind one **Problem melden** button; the Town Hall shows only what the current phase needs, in the same order as for everyone else (the live box with captions first, which before the meeting shows the start time), then reactions, poll and comfort pulse (side by side on tablets); scores, role breakdowns and other facilitator analytics are hidden | Shop-floor workers on phones | Find the one thing to do without scrolling through dashboards |
| Bilingual charter and polls: **+ Turn into action** and **+ New poll** offer ready-made English + German versions (`ACTION_TEMPLATES` and `POLL_TEMPLATES` in `bp_engine.py`), or Priya types the German line herself; the meeting title, demo actions and demo poll are stored in both languages | German-speaking workers, Priya | Workers vote on actions and polls in German without a live translation service |
| Colour means theme: each theme has its own colour (checked for normal and colour-blind vision) shown next to its name; stakeholder groups are named in words and have no colour of their own (where a bar splits by group it uses dark-to-light shades of one slate, line workers darkest); status is a text pill | Everyone | Concerns can be grouped at a glance, and a colour never stands for a theme and a group at the same time |
| German interface for the worker-facing screens (join page, quick report, posts, Co-Design Agreement) | German-speaking workers | No English needed to take part |
| Automatic DE ⇄ EN translation of posts, comments, chat and captions | Workers and Priya | Remove the language barrier in both directions |
| Theme classification (Physical Safety, Machine Pacing & Workload, Job Security, Co-determination & Privacy, Training & Skills, Production Targets & Pressure) | Priya | Make sense of many concerns quickly |
| Role-weighted priority (Line Worker 1.5×, Safety Officer 1.3×, Union Rep 1.2×, Plant Director 1.0×) | Workers, Priya | Make sure shop-floor voices surface first, not only the loudest or most senior |
| Three ranked focus cards for Priya: summary, most-reported tiles, share of line workers, average feeling, linked actions and up to three prompts | Priya | Read three cards instead of a stream of translated comments while presenting |
| 60-minute agenda clock with time-based prompts (move on, open the agreement, signatures missing) | Priya | Keep the session on time and know when to pivot |
| Discuss now / "Now discussing" banner | All participants | Everyone knows which concern is on the table and where to react |
| Photo and video posts with plant location, photo metadata stripped | Workers, safety officers | Show a near miss or blocked aisle instead of describing it |
| Pinned company broadcasts | Priya | One trusted channel for announcements before the session |
| Breakout rooms | All groups | Smaller, private discussions |
| Live captions with speech recognition | Remote and noisy-floor participants | Follow the discussion in their own language |
| Live poll (raw or weighted), comfort pulse, reactions | Priya | Read the room in real time and adapt the agenda |
| Action charter with agree / not yet; posts show when their concern is in the charter | All groups | Leave with a shared, visible agreement rather than survey charts |
| Co-Design Agreement with signatures from works council, plant management and Product Team | Union, directors, Priya | A compromise both sides formally accept before the call ends, instead of minutes e-mailed later |
| Locked charter with SHA-256 fingerprint and printable `/charter` page | All groups | Nobody can quietly change what was signed |
| After-meeting survey | Priya, management | Check whether participants actually felt heard |
| Pulse Insights side panel | Priya | Theme ranking, most-reported tiles, role mix, translation context and live room mood at a glance |

## Design hypotheses

1. If workers can share feedback anonymously from their phones without downloading anything, they will express their
   real concerns more readily than in an open discussion or a traditional survey.
2. If German comments are translated and organised into clear priority themes in real time, Priya will be able to
   address the underlying issues within the 60-minute window.
3. If the platform produces a shared, visible action charter during the call, both labour and management will be more
   likely to feel heard, trust the process and commit to the next steps of the pilot.

How the prototype lets the team test them:

| Hypothesis | Signal in the prototype |
|---|---|
| H1 | Number of anonymous reports, how many are sent as quick reports (tiles, voice) versus typed, and "Me too" support compared with open discussion |
| H2 | Whether Priya gets through the three focus cards within the agenda; quality of translation and categorisation |
| H3 | "Works for me / Not yet" on each trial rule and action, whether all three groups sign before the end, and the after-meeting "felt heard" and "plan addresses concerns" scores |

## User validation

The team ran structured proxy walkthroughs of the deployed prototype with ten participants covering all five roles
(line work and shift supervision, health & safety, labour relations, product management, plant operations), using
four open-ended questions on QR onboarding, shop-floor reporting, multilingual summarising and the shared charter.
The findings were cross-referenced with secondary research on German co-determination, glove-friendly industrial
interfaces and cognitive load during remote presentations.

### Changes after user validation

| # | What we heard | What changed in the prototype | Hypothesis |
|---|---|---|---|
| 1 | Even an "anonymous registration" step makes shop-floor workers hesitate. | The sign-up page is gone. `/join` is one tap on a group button, with a visible **Zero-Log Shield**. The Product Team signs in on a separate page. | H1 |
| 2 | Noise and PPE gloves make open text input impractical during a shift. | **Quick report** with large, high-contrast preset tiles and a one-swipe feeling slider; typing is optional. | H1 |
| 3 | Reading raw translated German comments while presenting on camera overloads the facilitator. | Priya's Town Hall view leads with **three ranked focus cards** with prompts, a 60-minute agenda clock and **Discuss now**. With an LLM key configured, each card also gets a one-sentence AI summary. | H2 |
| 4 | Meeting minutes e-mailed afterwards are trusted by neither side. | **Co-Design Agreement** in the final 15 minutes: explicit trial rules, signatures from works council, plant management and Product Team, then a locked charter with a fingerprint. | H3 |

Two further changes came from the team's own review of the shop-floor setting: **voice to text** in every place a
worker can write, and **glove mode** with larger text and tap targets. A later review found the worker screens too
dense for a phone and the colours ambiguous (the same orange meant a theme, the safety officers and "not yet"), which
led to the **simple view** and to colour being used for themes only.

### Running a simulated town hall

1. Start the app and open it twice side by side: Priya (`priya / priya123`) in one window, and a worker on a phone
   (scan the QR code) or in a private window at `/join`.
2. As a worker, tap a group and send a few **quick reports** in German (tiles, feeling slider, voice) and press
   "Me too" on other posts. Repeat as a union rep and a plant director.
3. As Priya, open **Town Hall** and press **● Go live**. The agenda clock starts.
4. Work through the three focus cards: press **Discuss now** on one (workers see the banner), launch a poll, speak or
   type a caption, watch the comfort pulse and reactions, and use **+ Turn into action** to add it to the charter.
5. In the final 15 minutes press **Open Co-Design Agreement**, adjust the trial rules, and let workers answer
   "Works for me / Not yet". Sign as Priya, the union rep (`union / test123`) and the plant director
   (`director / test123`); the charter locks after the third signature.
6. Press **End & open survey**; participants answer the two survey questions. Open the signed charter
   (`/charter`) and print or save it as PDF.

## Technical architecture

| Layer | This prototype | Target production stack |
|---|---|---|
| Frontend | Server-rendered HTML, CSS and vanilla JavaScript (mobile responsive) | React, TypeScript |
| Backend | Flask, Flask-Login | Flask |
| Real-time messaging | Flask-SocketIO (WebSocket) | WebSocket |
| Database and cache | SQLite | PostgreSQL, Redis |
| Calls and screen sharing | Call signalling only | LiveKit, WebRTC |
| Shared whiteboard | — | Canvas, Yjs |
| Files and recordings | Local `static/uploads` | S3 |
| Translation and AI assistance | LLM API if configured, otherwise a free online translation API, otherwise an offline glossary; themes from preset tiles and keyword rules; one-sentence focus-card summaries by the LLM if configured; rule-based prompts and cultural notes | LLM API (translation, categorisation, summaries, explaining wording and cultural differences) |
| Speech transcription | Browser Web Speech API (captions, chat, voice reports) | Speech recognition API |
| Delivery to Priya | Standalone web app with QR join | Microsoft Teams meeting plugin plus mobile web app for workers |

**Feasibility.** Every part of the target stack is an established, widely used technology. The prototype shows the
full flow end to end with a minimal stack that runs with one command; moving to production mainly means replacing
SQLite with PostgreSQL/Redis, adding LiveKit for audio and video, packaging the host view as a Teams app, and routing
translation, summaries and speech through providers under a data-processing agreement.

### Privacy by design

- Joining stores only a random handle (for example `@lw4821`), the chosen group, the language and the join time.
  No name, e-mail, phone number or password.
- Workers appear only as their group plus that handle; author IDs never reach the browser.
- **Zero-Log Shield:** the app writes no request log, does not bind sessions to the IP address or browser, and never
  stores an IP address or device data. The hosting provider or a reverse proxy in front of the app may keep its own
  access logs; those are outside the app and need to be covered by the deployment agreement.
- Photos are re-drawn in the browser before upload, removing EXIF and GPS data; uploaded files get random names.
- Only the Product Team can broadcast, run polls, change phases, set trial rules or edit the action charter; internal
  rooms are invite-only.
- Only the works council, plant management and Product Team can sign the agreement, one signature per group. Changing
  a trial rule or the action charter before the lock clears all signatures, so everyone signs the same final version.

## Getting started

### 1. Requirements

- **Python 3.9 or later.** Check with `python --version` (Windows) or `python3 --version` (macOS / Linux).
  - Windows: install from <https://www.python.org/downloads/> and tick **"Add python.exe to PATH"** in the installer.
  - macOS: install from python.org, or `brew install python`.
  - Linux (Ubuntu / Debian): `sudo apt install python3 python3-venv python3-pip`
- **Git** (optional, only needed for cloning): <https://git-scm.com/downloads>
- A modern browser. Chrome or Edge is recommended, because live captions and voice input need speech recognition.

### 2. Download the code

Either clone the repository:

```bash
git clone https://github.com/lingyunj233/DGIN5001-Group-4.git
cd DGIN5001-Group-4
```

or on GitHub click **Code → Download ZIP**, unzip it, and open a terminal in the unzipped folder.

### 3. Install and run

**Windows (PowerShell)**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

If PowerShell blocks `Activate.ps1`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and try again.
In Command Prompt (cmd) use `.venv\Scripts\activate.bat` instead.

**macOS**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

**Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

The virtual environment (`.venv`) is optional but keeps the packages separate from the rest of your system.
Next time you only need to activate it again and run `python app.py` (Windows) or `python3 app.py`.

### 4. Open it

When the terminal shows `BridgePulse is running`, open:

**<http://localhost:8080>**

This is the same address on Windows, macOS and Linux. Stop the server with `Ctrl + C`.

- **Workers** land on the one-tap join page (<http://localhost:8080/join>).
- **Phone on the same Wi-Fi:** scan the QR code on the sign-in page or in the Square, or type the address printed
  next to "On a phone" in the terminal (for example `http://192.168.1.23:8080/join`). On Windows, click
  **Allow access** if the firewall asks. School or public Wi-Fi may block device-to-device connections.
- **Port already in use:** run on another port and open that one instead, e.g. <http://localhost:8090>.
  - Windows PowerShell: `$env:PORT=8090; python app.py`
  - Windows cmd: `set PORT=8090 && python app.py`
  - macOS / Linux: `PORT=8090 python3 app.py`

Demo data is created on first run; delete `bridgepulse.db` to reset it. If you ran an earlier version of
BridgePulse, delete `bridgepulse.db` once so the demo quick reports are loaded.

### Troubleshooting

| Problem | Fix |
|---|---|
| `python` / `pip` not found (Windows) | Reinstall Python with "Add python.exe to PATH", or use `py` and `py -m pip` |
| `No module named flask` | The packages went to a different Python; run `python -m pip install -r requirements.txt` with the same `python` you use to start the app |
| `ensurepip is not available` (Linux) | `sudo apt install python3-venv` |
| `Could not open requirements file` | The terminal is not in the project folder (`DGIN5001-Group-4`); `cd` into it first |
| Captions / voice input do nothing | Use Chrome, Edge or Safari and allow microphone access. Speech recognition only works on `http://localhost` or an `https://` address, so on a phone opened through the Wi-Fi address (`http://192.168…`) use the microphone on the phone keyboard instead, or test voice on the deployed `https://` site |
| No demo quick reports, focus cards look empty | Delete `bridgepulse.db` and start again |

| Role | Login |
|---|---|
| Priya, Senior Product Manager (Product Team: host controls, broadcasts, polls, focus cards, trial rules, signs for the Product Team) | `priya / priya123` |
| Line worker | `worker / test123` |
| Union rep (signs for the works council) | `union / test123` |
| Safety officer | `safety / test123` |
| Plant director (signs for plant management) | `director / test123` |

These accounts are on the sign-in page (`/login`, linked from the join page). Anyone can join without an account
at `/join`.

### Configuration

| Variable | Purpose |
|---|---|
| `BP_LLM_API_KEY` (or `ANTHROPIC_API_KEY`) | Use an LLM API for translation and for the one-sentence summaries on Priya's focus cards |
| `BP_LLM_MODEL` | Model name for the LLM API |
| `BP_FREE_TRANSLATE=0` | Turn off the free online translation fallback (recommended outside demos) |
| `BP_SECRET` | Key used to sign session cookies; if unset, one is generated into `.secret_key` |
| `PORT` | Port to run on (default 8080) |

Live captions and voice input need a browser with speech recognition (Chrome, Edge or Safari).

## Project structure

```
DGIN5001-Group-4/
├── app.py                 Flask routes, Socket.IO events, town hall, focus cards and Co-Design Agreement
├── bp_engine.py           Language detection, translation, themes, quick-report tiles, role weights,
│                          agenda and facilitation prompts, cultural notes
├── seed_data.py           Stuttgart AMR demo scenario and default trial rules
├── models/bot_replies.py  BridgePulse Helper FAQ bot
├── templates/
│   ├── join.html          One-tap guest join with Zero-Log Shield
│   ├── login.html         Product Team and demo sign-in
│   ├── index.html         The app: Square, Chat, Town Hall
│   └── charter.html       Printable signed charter (/charter)
└── static/
    ├── css/               app.css, auth.css
    ├── js/app.js          Front-end logic
    ├── vendor/            Socket.IO client, qrcode.js
    └── seed/              Demo image
```

## Known limitations and next steps

- The German interface covers the worker-facing screens (join page, quick report, posts, "Now discussing" banner and
  Co-Design Agreement); navigation, Chat, Settings and the Product Team views are still English.
- Themes come from the preset tiles and keyword rules. With an LLM key the focus cards get one-sentence AI
  summaries, but the grouping itself is not done by an LLM yet.
- Voice input uses the browser's speech recognition, which needs Chrome, Edge or Safari and an `https://` or
  `localhost` address. Some browsers process the audio on their vendor's servers, so a production version would use
  a speech API under the company's data-processing agreement.
- The charter lock and fingerprint are enforced by the app; they are not a qualified electronic signature.
- The agenda (segment lengths and the 15-minute agreement window) is fixed in `bp_engine.py`.
- Voice and video call buttons only perform signalling; real calls require LiveKit/WebRTC.
- Plant locations are chosen from a list; tagging issues on an interactive factory map is planned.
- The host view runs as a standalone web app rather than a Microsoft Teams plugin.
