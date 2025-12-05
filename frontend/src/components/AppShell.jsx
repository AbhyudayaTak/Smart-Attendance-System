function AppShell({ children, name, role, onLogout }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">QR</div>
          <div>
            <div>Smart Attendance</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Scan · Verify · Record</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {name && (
            <>
              <span style={{ fontSize: '0.85rem' }}>
                {name}{' '}
                <span className="badge">{role}</span>
              </span>
              <button className="btn btn-ghost" onClick={onLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;


