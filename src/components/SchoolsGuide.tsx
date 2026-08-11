import './SchoolsGuide.css'

type SchoolsGuideProps = {
  onExit: () => void
}

export function SchoolsGuide({ onExit }: SchoolsGuideProps) {
  return (
    <section className="lesson schools">
      <header className="lesson__header">
        <button type="button" className="text-btn" onClick={onExit}>
          ← Path
        </button>
        <div>
          <p className="eyebrow">Schools</p>
          <h1>For schools</h1>
        </div>
      </header>

      <p className="lesson__teach">
        Keypath is a browser practice path for piano (MIDI / on-screen keys) and guitar (mic +
        fretboard). Progress stays on this device. There are no student logins or class rosters yet.
      </p>

      <div className="schools__sections">
        <section className="schools__block" aria-labelledby="schools-start">
          <h2 id="schools-start">Start here</h2>
          <ol>
            <li>Pick Piano or Guitar on the path.</li>
            <li>Continue learning — or open a specific lesson.</li>
            <li>Guitar: Tune up, then Enable mic. Piano: plug USB MIDI and allow access.</li>
            <li>Failed a timed lesson? Use Retry slower before full speed.</li>
            <li>Free play is for warm-ups without a pass score.</li>
          </ol>
        </section>

        <section className="schools__block" aria-labelledby="schools-setup">
          <h2 id="schools-setup">Classroom setup</h2>
          <ul>
            <li>
              <strong>Piano:</strong> USB keyboard + Chrome/Edge; headphones help in busy rooms.
              Fallback: click keys or computer keyboard.
            </li>
            <li>
              <strong>Guitar:</strong> standard tuning, Enable mic, or tap frets for silent shape
              practice.
            </li>
            <li>
              <strong>Shared devices:</strong> progress is per browser profile. Same machine/profile
              if you need continuity.
            </li>
          </ul>
        </section>

        <section className="schools__block" aria-labelledby="schools-privacy">
          <h2 id="schools-privacy">Privacy &amp; IT</h2>
          <ul>
            <li>No accounts and no cloud student names in this build.</li>
            <li>Progress is stored locally in the browser only.</li>
            <li>Mic is used for on-device pitch detection — not uploaded by the app as built today.</li>
            <li>Prefer HTTPS; allowlist this site if you use a web filter.</li>
          </ul>
        </section>

        <section className="schools__block" aria-labelledby="schools-curriculum">
          <h2 id="schools-curriculum">Curriculum snapshot</h2>
          <ul>
            <li>
              <strong>Piano (~23 lessons):</strong> Foundations → Reading → Technique → Harmony →
              Repertoire → Advanced.
            </li>
            <li>
              <strong>Guitar (~13 lessons):</strong> Foundations → Open chords → Repertoire.
            </li>
            <li>Coaching explains wrong pitch, early/late timing, and chord tips after misses.</li>
          </ul>
        </section>

        <section className="schools__block" aria-labelledby="schools-limits">
          <h2 id="schools-limits">Limits (honest)</h2>
          <ul>
            <li>No teacher dashboard or cross-device sync yet.</li>
            <li>Guitar mic chord grading is best-effort — use fret taps when the room is loud.</li>
            <li>Full written guide for leadership and IT: docs/schools-guide.md in the project repo.</li>
          </ul>
        </section>
      </div>

      <div className="lesson__actions">
        <button type="button" className="btn btn--primary" onClick={onExit}>
          Back to path
        </button>
      </div>
    </section>
  )
}
