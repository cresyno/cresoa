export function DashboardLoading() {
  return (
    <div className="cresoa-loading-grid">
      {[1,2,3,4].map(i => (
        <div key={i} className="cresoa-skeleton-card">
          <div className="cresoa-skeleton short" />
          <div className="cresoa-skeleton long" />
          <div className="cresoa-skeleton medium" />
        </div>
      ))}
    </div>
  )
}
