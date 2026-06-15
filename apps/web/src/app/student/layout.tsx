"use client";

import UserButton from "@/components/UserButton";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import KeyCustodian from "@/components/KeyCustodian";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <nav className="top-nav">
        <Link href="/student" className="nav-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BrandLogo width={28} height={28} />
          YKS 2026
        </Link>
        <div className="nav-links">
          <Link href="/student" className="nav-link">Dashboard</Link>
          <Link href="/student/study-plan" className="nav-link">Çalışma Planı</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ThemeToggle />
          <UserButton />
        </div>
      </nav>
      <main className="main-content">{children}</main>
      <KeyCustodian />
    </div>
  );
}
