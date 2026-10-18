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
- Nothing can require installing a native app; joining must take seconds.
- German workplace privacy rules forbid identifiable worker telemetry, so participation must be anonymous while still
  showing which stakeholder group a voice belongs to.
- Most workers write and speak German; Priya works in English.
- The town hall is one 60-minute session across time zones (Halifax ADT / Stuttgart CET).

### Why existing tools are not enough

Presentation tools and audience-polling software such as Mentimeter or Slido collect votes on questions the host
already chose. They cannot capture complex industrial friction in workers' own words, they offer no live
German ⇄ English translation, and they end with fragmented charts instead of an agreement both sides can act on.

## The solution

BridgePulse supports the town hall **before, during and after** the 60 minutes. Workers scan a QR code, pick their
group and language, and join an anonymous mobile web page with no download. Priya (the Product Team) sees the same
input translated into English, grouped into themes and ranked by impact.

| Phase | Space in the app | What happens |
|---|---|---|
| Before | **Square** | An X-style company feed. Pinned company broadcasts from the Product Team announce the town hall. Employees post concerns anonymously as text, photos or short videos, in German or English, optionally tagged with a plant location. Each post is translated, auto-categorised into a theme and can be supported with "Me too". |
| Before / during | **Chat** | Direct messages and breakout rooms for smaller-group discussion, with speech-to-text input and per-message translation plus notes on German workplace terms. |
| During | **Town Hall** | Live captions in both languages, "Biggest impact first" theme ranking, live polls, a comfort pulse, live reactions, and an **action charter** written live that every participant can agree with or mark "not yet". |
| After | **Town Hall** | A two-question survey (*Did you feel heard? Does the action plan address your concerns?*) and the final action charter stays visible to everyone. |

## Features and the needs they address

| Feature | Who it serves | Need addressed |
|---|---|---|
| QR join, no install, no name or e-mail | Shop-floor workers | Frictionless mobile access during a shift |
| Anonymous identity showing only the stakeholder group | Workers, union | Psychological safety; compliance with German privacy expectations |
| Automatic DE ⇄ EN translation of posts, comments, chat and captions | Workers and Priya | Remove the language barrier in both directions |
| Theme classification (Physical Safety, Machine Pacing & Workload, Job Security, Co-determination & Privacy, Training & Skills, Production Targets & Pressure) | Priya | Make sense of many concerns quickly |
| Role-weighted priority (Line Worker 1.5×, Safety Officer 1.3×, Union Rep 1.2×, Plant Director 1.0×) | Workers, Priya | Make sure shop-floor voices surface first, not only the loudest or most senior |
| Photo and video posts with plant location, photo metadata stripped | Workers, safety officers | Show a near miss or blocked aisle instead of describing it |
| Pinned company broadcasts | Priya | One trusted channel for announcements before the session |
| Breakout rooms | All groups | Smaller, private discussions |
| Live captions with speech recognition | Remote and noisy-floor participants | Follow the discussion in their own language |
| Live poll (raw or weighted), comfort pulse, reactions | Priya | Read the room in real time and adapt the agenda |
| Action charter with agree / not yet | All groups | Leave with a shared, visible agreement rather than survey charts |
| After-meeting survey | Priya, management | Check whether participants actually felt heard |
| Pulse Insights side panel | Priya | Theme ranking, role mix, translation context and live room mood at a glance |

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
| H1 | Number and depth of anonymous posts and "Me too" support compared with open discussion |
| H2 | Time for Priya to identify and address the top-ranked themes; quality of translation and categorisation |
| H3 | Agree / not-yet votes on each action and the after-meeting "felt heard" and "plan addresses concerns" scores |

## User validation approach

The team plans to speak with international project managers, workplace-change specialists, factory supervisors and
labour-relations experts, and to run a simulated town hall with this prototype. The simulation is used to assess:

- how intuitive the tool is for Priya as facilitator,
- how well translation and theme grouping perform,
- whether participants feel psychologically safe posting,
- how much alignment participants show around the live action charter.

### Running a simulated town hall

1. Open the app twice side by side: Priya in one window, a worker in a private window (or on a phone via the QR code).
2. As workers, post concerns in German in the **Square**, add photos, and press "Me too" on each other's posts.
3. As Priya, open **Town Hall** and press **● Go live**.
4. Launch a poll, speak or type a caption in English or German, and watch the comfort pulse and reactions.
5. Use **+ Turn into action** on the top concern to add it to the action charter; participants vote agree / not yet.
6. Press **End & open survey**; participants answer the two survey questions; download the charter.

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
| Translation and AI assistance | LLM API if configured, otherwise a free online translation API, otherwise an offline glossary; rule-based theme classification and cultural notes | LLM API (translation, categorisation, summaries, explaining wording and cultural differences) |
| Speech transcription | Browser Web Speech API | Speech recognition API |
| Delivery to Priya | Standalone web app with QR join | Microsoft Teams meeting plugin plus mobile web app for workers |

**Feasibility.** Every part of the target stack is an established, widely used technology. The prototype shows the
full flow end to end with a minimal stack that runs with one command; moving to production mainly means replacing
SQLite with PostgreSQL/Redis, adding LiveKit for audio and video, packaging the host view as a Teams app, and routing
translation through an LLM provider under a data-processing agreement.

### Privacy by design

- Workers appear only as their group plus a random handle (for example `@lw4821`); author IDs never reach the browser.
- Quick join stores no name, e-mail or phone number.
- Photos are re-drawn in the browser before upload, removing EXIF and GPS data; uploaded files get random names.
- Only the Product Team can broadcast, run polls, change phases or edit the action charter; internal rooms are invite-only.

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

- **Phone on the same Wi-Fi:** scan the QR code on the login page, or type the address printed next to
  "On a phone" in the terminal (for example `http://192.168.1.23:8080`). On Windows, click **Allow access**
  if the firewall asks. School or public Wi-Fi may block device-to-device connections.
- **Port already in use:** run on another port and open that one instead, e.g. <http://localhost:8090>.
  - Windows PowerShell: `$env:PORT=8090; python app.py`
  - Windows cmd: `set PORT=8090 && python app.py`
  - macOS / Linux: `PORT=8090 python3 app.py`

Demo data is created on first run; delete `bridgepulse.db` to reset it.

### Troubleshooting

| Problem | Fix |
|---|---|
| `python` / `pip` not found (Windows) | Reinstall Python with "Add python.exe to PATH", or use `py` and `py -m pip` |
| `No module named flask` | The packages went to a different Python; run `python -m pip install -r requirements.txt` with the same `python` you use to start the app |
| `ensurepip is not available` (Linux) | `sudo apt install python3-venv` |
| `Could not open requirements file` | The terminal is not in the project folder (`DGIN5001-Group-4`); `cd` into it first |
| Captions / voice input do nothing | Use Chrome or Edge and allow microphone access |

| Role | Login |
|---|---|
| Priya, Senior Product Manager (Product Team: host controls, broadcasts, polls, action charter) | `priya / priya123` |
| Line worker | `worker / test123` |
| Union rep | `union / test123` |
| Safety officer | `safety / test123` |
| Plant director | `director / test123` |

Anyone can also choose **Join anonymously** on the login page.

### Configuration

| Variable | Purpose |
|---|---|
| `BP_LLM_API_KEY` | Use an LLM API for translation |
| `BP_LLM_MODEL` | Model name for the LLM API |
| `BP_FREE_TRANSLATE=0` | Turn off the free online translation fallback (recommended outside demos) |
| `PORT` | Port to run on (default 8080) |

Live captions and voice input need a browser with speech recognition (Chrome, Edge or Safari).

## Project structure

```
DGIN5001-Group-4/
├── app.py                 Flask routes, Socket.IO events, town hall logic
├── bp_engine.py           Language detection, translation, theme classification, role weights, cultural notes
├── seed_data.py           Stuttgart AMR demo scenario
├── models/bot_replies.py  BridgePulse Helper FAQ bot
├── templates/             index.html, login.html, register.html
└── static/
    ├── css/               app.css, auth.css
    ├── js/app.js          Front-end logic
    ├── vendor/            Socket.IO client, qrcode.js
    └── seed/              Demo image
```

## Known limitations and next steps

- The interface text is English only; content is translated, but a German interface is still needed for shop-floor users.
- Voice and video call buttons only perform signalling; real calls require LiveKit/WebRTC.
- Plant locations are chosen from a list; tagging issues on an interactive factory map is planned.
- The host view runs as a standalone web app rather than a Microsoft Teams plugin.
