import React from "react";
import * as Icons from "./Icons";
import BrandLogo from "./BrandLogo";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOnline: boolean;
  offlineCount: number;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Gösterge Paneli", icon: Icons.IconDashboard, section: "GENEL" },
  { id: "omr", label: "OMR Monitor", icon: Icons.IconFolder, section: "GENEL" },
  { id: "exams", label: "Sınav Yönetimi", icon: Icons.IconExam, section: "YÖNETİM" },
  { id: "teachers", label: "Öğretmenler", icon: Icons.IconStudents, section: "YÖNETİM" },
  { id: "classrooms", label: "Derslikler", icon: Icons.IconClass, section: "YÖNETİM" },
  { id: "classes", label: "Sınıflar", icon: Icons.IconClass, section: "YÖNETİM" },
  { id: "students", label: "Öğrenciler", icon: Icons.IconStudents, section: "YÖNETİM" },
  { id: "schedules", label: "Program", icon: Icons.IconAttendance, section: "YÖNETİM" },
  { id: "attendance", label: "Yoklama", icon: Icons.IconAttendance, section: "YÖNETİM" },
  { id: "sms", label: "SMS Bildirim", icon: Icons.IconSms, section: "BİLDİRİM" },
  { id: "telegram", label: "Telegram Rapor", icon: Icons.IconTelegram, section: "BİLDİRİM" },
  { id: "ai", label: "Yapay Zeka", icon: Icons.IconAI, section: "ARAÇLAR" },
  { id: "logs", label: "Sync Logları", icon: Icons.IconLog, section: "SİSTEM" },
  { id: "settings", label: "Ayarlar", icon: Icons.IconSettings, section: "SİSTEM" },
];

export default function Sidebar({ activePage, onNavigate, isOnline, offlineCount, theme, toggleTheme, onLogout }: SidebarProps) {
  let lastSection = "";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo flex items-center gap-3">
        <BrandLogo theme={theme} width={28} height={28} />
        <div>
          <h1 style={{ margin: 0, fontSize: "16px" }}>Sedusis</h1>
          <div className="version">OMR Senkronizasyon v0.1.0</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section !== lastSection;
          if (showSection) lastSection = item.section;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              {showSection && <div className="sidebar-section-label">{item.section}</div>}
              <button
                className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon />
                {item.label}
                {item.id === "omr" && offlineCount > 0 && (
                  <span className="sidebar-badge">{offlineCount}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer flex items-center justify-between">
        <div className="sync-indicator">
          <span className={`sync-dot ${isOnline ? "online" : "offline"}`} />
          {isOnline ? "Sunucu Bağlı" : "Çevrimdışı"}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title="Temayı Değiştir" style={{ padding: "4px" }}>
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Çıkış Yap" style={{ padding: "4px", color: "var(--danger)" }}>
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
