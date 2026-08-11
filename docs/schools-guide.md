# Keypath for schools

A practical guide for music teachers, department leads, and school IT / safeguarding teams who want to pilot Keypath in the classroom or for homework practice.

**What this document is:** how Keypath works today, how to run a lesson, how to set devices up safely, and what it does *not* do yet.

**Live app (GitHub Pages, when enabled):** https://nugehs.github.io/piano-lesson/

**In the app:** open **For schools** from the home path.

---

## 1. What Keypath is

Keypath is a browser-based practice path for:

| Instrument | How students play | What they see |
|------------|-------------------|---------------|
| **Piano** | USB MIDI keyboard (e.g. Yamaha), on-screen keys, or computer keys | Staff notation, piano keyboard, metronome timing |
| **Guitar** | Real guitar into the microphone, or tap the on-screen fretboard | Fretboard guides, simple tab, optional Tune up |

Students follow a staged curriculum, get coaching when they miss (wrong pitch, early/late, chord tips), can slow the tempo and retry, and keep progress **on that browser**.

There are **no student accounts**, **no class roster**, and **no teacher dashboard** in this version.

---

## 2. Who it’s for

- Beginners through early intermediate players
- Classroom **stations** (one device + instrument per station)
- Small-group or carousel practice while others do theory
- Homework on school Chromebooks / laptops **where MIDI or mic permissions work**

It is not a full substitute for a specialist instrumental teacher. Use it to structure practice, give instant feedback, and free the adult to circulate.

---

## 3. Quick start for teachers

1. Open the Keypath site in **Chrome** or **Edge** (best MIDI and mic support).
2. Choose **Piano** or **Guitar** at the top of the path.
3. Tap **Continue learning** (or open a specific lesson).
4. For guitar: **Tune up** before graded work; tap **Enable mic** when prompted.
5. For piano: plug the USB keyboard, allow MIDI when the browser asks.
6. After a failed attempt on timed lessons, use **Retry slower** so students nail notes before speeding up.
7. Use **Free play** for warm-up or exploration without a pass score.

### Suggested lesson length

| Block | What to do |
|-------|------------|
| 5 min | Free play or Tune up (guitar) |
| 15–25 min | 1–2 path lessons (demo → practice → retry if needed) |
| 5 min | Recap: what coaching said (early/late, wrong octave, chord shape) |

---

## 4. Curriculum map

### Piano (~23 lessons)

| Stage | Focus | Example lessons |
|-------|--------|-----------------|
| Foundations | Keys, names, middle C | Find Middle C, white/black keys, octaves |
| Reading | Staff → key | Treble landmarks, steps/skips, five-finger |
| Technique | Scales & flow | C/G major, arpeggio, with metronome |
| Harmony | Chords | Triads, cadences (simultaneous chord grading) |
| Repertoire | Melodies with rhythm | Twinkle, Ode, Mary |
| Advanced | Colour & shape | Inversions, C7, blues, improv lab |

### Guitar (~13 lessons)

| Stage | Focus | Example lessons |
|-------|--------|-----------------|
| Foundations | Strings & frets | Six strings, low E, open A/D, first frets |
| Open chords | Shapes | Em, Am, C, G, D, Em→Am change |
| Repertoire | Easy melodies | Twinkle / Ode phrases on high strings |

### How scoring works

- Lessons are **find**, **sequence**, **play-along**, or **learn** (mark complete).
- Pitch accuracy always matters; many lessons also grade **timing** against the metronome.
- Pass thresholds vary (often ~70–80%). Coaching explains misses in plain language.
- Guitar chords: prefer clean shapes on the fretboard; mic chord detection is **best-effort** (strums may register as the loudest notes). Students can complete chord steps by tapping frets if the room is noisy.

Progress is stored separately for piano and guitar. Resetting one instrument does not wipe the other.

---

## 5. Classroom setup

### Piano station

- USB MIDI keyboard + USB cable (class-compliant devices work in Chromebook/Chrome without drivers in most cases)
- Browser: Chrome or Edge
- Allow **MIDI** when asked
- Headphones recommended for dense classrooms
- Fallback: on-screen piano or computer keys (A–; row for C4 upward)

### Guitar station

- Acoustic or electric (with quiet amp / headphone amp)
- Standard tuning (E A D G B e) — use **Tune up**
- Allow **microphone**; sit close enough for a clear note
- Fallback: tap frets on screen to learn shapes without sound grading

### Shared school devices

- Progress lives in **that browser profile** on **that device** (`localStorage`)
- If students rotate machines, progress will not follow them
- For homework tracking that matters, assign a consistent device or profile per student
- Clearing site data or “Reset” on the progress panel wipes that instrument’s path on that browser

---

## 6. IT and safeguarding

### Data and privacy (current build)

| Topic | Behaviour today |
|-------|-----------------|
| Accounts | None |
| Names / emails | Not collected by the app |
| Progress | Stored locally in the browser (`keypath-progress-v2`, plus active instrument key) |
| Microphone | Used in-browser for **pitch detection**; the app does not upload recordings as designed today |
| MIDI | Local device → browser; not sent to a Keypath server |
| Hosting | Static web app (e.g. GitHub Pages); no school LMS integration |

Treat this as a **local practice tool**, not a cloud MIS product. Re-check privacy if you self-host behind filters or add future cloud features.

### Network and browsers

- Prefer **HTTPS** (required for mic and recommended for modern MIDI)
- Allowlist the hosting domain if the school uses a web filter
- Test mic and MIDI on a sample Chromebook/Windows laptop before a whole-class roll-out
- Safari and some locked-down browsers may block or limit MIDI/mic — validate on your fleet

### Safeguarding and room practice

- Use school-approved headphones; keep volumes reasonable
- Guitar mic: students should not need to grant mic to unrelated tabs; close other apps that capture audio
- Teachers remain responsible for supervision; Keypath does not provide chat, video, or peer messaging

### Accessibility

- If MIDI is blocked: use on-screen piano / computer keys
- If mic is blocked: use fretboard clicks for guitar shape lessons
- Visual guides highlight the next note/fret; coaching text is shown after misses

---

## 7. Suggested schemes of work

Adjust pace for year group and contact time. One “lesson” below ≈ one Keypath path lesson plus warm-up.

### Piano — 6 weeks (one contact / week)

| Week | Focus | Path lessons |
|------|--------|--------------|
| 1 | Keyboard geography | Foundations: Middle C → white keys → black keys |
| 2 | Reading start | Treble C–E, Spot G, steps/skips |
| 3 | Five-finger + pulse | Five-finger position (rhythm on) |
| 4 | Scale control | C major up / down at slow tempo |
| 5 | Harmony | C / Am triads, I–V–I |
| 6 | Tune | Twinkle or Ode play-along; Free play showcase |

### Guitar — 6 weeks

| Week | Focus | Path lessons |
|------|--------|--------------|
| 1 | Tuning + open strings | Tune up; Name the six strings; Find low E |
| 2 | More opens + fretting | Open A/D; First fret on high e; Climb across strings |
| 3 | First chord | Em shape (mic or fret taps) |
| 4 | Chord pair | Am; Em → Am change |
| 5 | Song chords | C, G, or D (one solid shape) |
| 6 | Melody | Twinkle or Ode phrase with metronome; Free play |

---

## 8. Limitations (be honest with leadership)

**Not available yet**

- Teacher dashboard / live class view
- Logins, Google Classroom / Microsoft sync
- Progress that travels across devices
- Reliable dense polyphonic “full strum” grading on guitar mic
- Capo, alternate tunings, advanced guitar techniques

**Fine for a pilot if you accept**

- Station- or device-based progress
- Teacher circulates and checks scores on each screen
- Guitar chords practiced visually when the room is loud

**Useful next asks if the pilot works**

- Class or student codes with exportable progress
- Printable / PDF scheme packs aligned to your local curriculum
- Offline or school-server hosting package

---

## 9. Support checklist

| Problem | What to try |
|---------|-------------|
| No MIDI | Chrome/Edge; replug USB; allow MIDI; try Free play to see if keys light |
| Double notes (MIDI + synth) | Expected that Yamaha sounds from the instrument; on-screen click uses the built-in sound |
| Mic denied | Site settings → allow microphone; HTTPS required |
| Guitar pitch wrong / jumpy | Closer to mic, one note at a time, Tune up first; or tap frets |
| “Wrong octave” coaching | Student is right letter, wrong register — move up/down an octave |
| Progress missing | Different device, profile, or browser; or Reset was used |
| Can’t pass timed lesson | Retry slower; clap the pulse before playing |

---

## 10. Contact and version note

Keypath is under active development. This guide matches the multi-instrument build with piano MIDI path, guitar mic/fretboard path, local progress, coaching feedback, and tempo slow-down.

For the long-form copy in-repo, keep this file updated when classroom behaviour or privacy claims change.
