import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-page">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 72, fontWeight: 700, marginBottom: 8, opacity: 0.3 }}>404</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Aradığınız sayfa bulunamadı.</p>
        <Link href="/" style={{ color: "#3b82f6", textDecoration: "underline" }}>Ana Sayfaya Dön</Link>
      </div>
    </main>
  );
}
