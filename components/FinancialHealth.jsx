import { formatMoney } from '../lib/utils'

export function FinancialHealth({ revenue, collected, outstanding }) {
  const total = revenue || 1
  const collectedPercent = Math.min(Math.round((collected / total) * 100), 100)
  const outstandingPercent = Math.min(Math.round((outstanding / total) * 100), 100)

  return (
    <div className="cresoa-financial-health">
      <div className="cresoa-financial-row">
        <span>Revenue</span>
        <span>{formatMoney(revenue)}</span>
        <div className="cresoa-progress-bar">
          <div className="cresoa-progress-fill" style={{ width: '100%' }} />
        </div>
      </div>
      <div className="cresoa-financial-row">
        <span>Collected</span>
        <span>{formatMoney(collected)}</span>
        <div className="cresoa-progress-bar">
          <div className="cresoa-progress-fill" style={{ width: `${collectedPercent}%` }} />
        </div>
        <span className="cresoa-progress-label">{collectedPercent}%</span>
      </div>
      <div className="cresoa-financial-row">
        <span>Outstanding</span>
        <span>{formatMoney(outstanding)}</span>
        <div className="cresoa-progress-bar">
          <div className="cresoa-progress-fill" style={{ width: `${outstandingPercent}%` }} />
        </div>
        <span className="cresoa-progress-label">{outstandingPercent}%</span>
      </div>
    </div>
  )
}
