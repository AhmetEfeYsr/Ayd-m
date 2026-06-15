export default function AdminLoading() {
  return (
    <div className="admin-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="loading-spinner" />
        <p style={{ color: "var(--text-secondary)", marginTop: 16, fontSize: 14 }}>Yükleniyor...</p>
      </div>
    </div>
  );
}
