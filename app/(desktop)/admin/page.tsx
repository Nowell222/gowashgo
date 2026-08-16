export default function AdminDashboardPage() {
  return (
    <div className="desktop-content fade-in">
      <div className="page-heading">
        <div className="page-heading__text">
          <h1 className="page-heading__title">Platform Dashboard</h1>
          <p className="page-heading__subtitle">Overview across all WashGo branches.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total Branches</div>
          <div className="stat-card__value">1</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Users</div>
          <div className="stat-card__value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Revenue (All Time)</div>
          <div className="stat-card__value">₱0</div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Platform Activity</h2>
        </div>
        <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
          <div className="empty-state__icon">📊</div>
          <p className="empty-state__title">No activity yet</p>
          <p className="empty-state__description">Platform-wide metrics will appear here.</p>
        </div>
      </div>
    </div>
  );
}
