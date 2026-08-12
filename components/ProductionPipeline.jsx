import { PRODUCTION_STAGES } from '../lib/constants'

export function ProductionPipeline({ counts, onStageClick }) {
  return (
    <div className="cresoa-pipeline">
      {PRODUCTION_STAGES.map((stage, index) => {
        const count = counts[stage] || 0
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onStageClick?.(stage)}
            className="cresoa-pipeline-item"
          >
            <span className="cresoa-pipeline-number">{count}</span>
            <span className="cresoa-pipeline-label">{stage}</span>
            {index < PRODUCTION_STAGES.length - 1 && (
              <span className="cresoa-pipeline-line" />
            )}
          </button>
        )
      })}
    </div>
  )
}
