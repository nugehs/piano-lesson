import type { FretPosition } from '../lib/guitar'
import './TabStrip.css'

export type TabStep = {
  positions: FretPosition[]
  state?: 'idle' | 'current' | 'done'
}

type TabStripProps = {
  steps: TabStep[]
  label?: string
}

/** Compact string×fret tab for the current phrase (not full engraving). */
export function TabStrip({ steps, label }: TabStripProps) {
  return (
    <div className="tabstrip" role="img" aria-label={label ?? 'Guitar tablature'}>
      <div className="tabstrip__scroll">
        {steps.map((step, index) => {
          const state = step.state ?? 'idle'
          const text =
            step.positions.length === 0
              ? '–'
              : step.positions
                  .slice()
                  .sort((a, b) => b.string - a.string)
                  .map((p) => `${p.string}:${p.fret}`)
                  .join(' ')
          return (
            <div key={`${index}-${text}`} className={`tabstrip__step is-${state}`}>
              <span className="tabstrip__index">{index + 1}</span>
              <strong>{text}</strong>
            </div>
          )
        })}
      </div>
    </div>
  )
}
