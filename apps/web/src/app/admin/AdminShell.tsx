"use client";

import UserButton from "@/components/UserButton";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/teachers", label: "Öğretmenler", icon: "👩‍🏫" },
  { href: "/admin/classrooms", label: "Derslikler", icon: "🏢" },
  { href: "/admin/classes", label: "Sınıflar", icon: "🏫" },
  { href: "/admin/students", label: "Öğrenciler", icon: "👥" },
  { href: "/admin/schedules", label: "Program", icon: "📅" },
  { href: "/admin/exams", label: "Sınavlar", icon: "📝" },
  { href: "/admin/attendance", label: "Yoklama", icon: "✅" },
  { href: "/admin/sms", label: "SMS", icon: "📱" },
  { href: "/admin/feedback", label: "Geri Bildirimler", icon: "💬" },
];

export default function AdminShell({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole: string;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-header" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <BrandLogo width={32} height={32} />
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>YKS Admin</h2>
            <span className="role-badge">{userRole}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <UserButton placement="up" />
          <ThemeToggle />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
