import { useState, useEffect, lazy, Suspense } from "react";
import { listen } from "@tauri-apps/api/event";
import { getOfflineQueueCount, getSyncStatus, getConfig, authEvents } from "./hooks/useApi";
import Sidebar from "./components/Sidebar";
import "./App.css";

// Lazy loaded page components
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const OMRPage = lazy(() => import("./pages/OMRPage"));
const ExamsPage = lazy(() => import("./pages/ExamsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const ClassesPage = lazy(() => import("./pages/ClassesPage"));
const ClassroomsPage = lazy(() => import("./pages/ClassroomsPage"));
const TeachersPage = lazy(() => import("./pages/TeachersPage"));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const SMSPage = lazy(() => import("./pages/SMSPage"));
const TelegramPage = lazy(() => import("./pages/TelegramPage"));
const AIPage = lazy(() => import("./pages/AIPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

const PageLoader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
    <div className="spinner" />
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [isOnline, setIsOnline] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("app-theme") as "dark" | "light") || "dark";
  });

  // Apply theme to body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    try {
      const config: any = await getConfig();
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("update_config", { config: { ...config, api_token: "" } });
    } catch {}
    setIsAuthenticated(false);
  };

  // Check auth state
  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    authEvents.addEventListener('unauthorized', onUnauthorized);

    getConfig().then((config: any) => {
      if (config && config.api_token && config.api_token.trim() !== "") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }).catch(() => {
      setIsAuthenticated(false);
    });

    return () => authEvents.removeEventListener('unauthorized', onUnauthorized);
  }, []);

  // Sync status dinleyicisi
  useEffect(() => {
    if (!isAuthenticated) return;
    const unlisten = listen<any>("sync-status-update", (event) => {
      setIsOnline(event.payload.is_online);
    });

    // İlk yüklemede durumu getir
    getSyncStatus().then((s: any) => setIsOnline(s?.is_online || false)).catch(() => {});
    getOfflineQueueCount().then((c) => setOfflineCount(c as number)).catch(() => {});

    const interval = setInterval(() => {
      getOfflineQueueCount().then((c) => setOfflineCount(c as number)).catch(() => {});
      getSyncStatus().then((s: any) => setIsOnline(s?.is_online || false)).catch(() => {});
    }, 10000);

    return () => { unlisten.then((fn) => fn()); clearInterval(interval); };
  }, [isAuthenticated]);

  const renderPage = () => {
    return (
      <Suspense fallback={<PageLoader />}>
        {(() => {
          switch (activePage) {
            case "dashboard": return <DashboardPage />;
            case "omr": return <OMRPage />;
            case "exams": return <ExamsPage />;
            case "teachers": return <TeachersPage />;
            case "classrooms": return <ClassroomsPage />;
            case "schedules": return <SchedulesPage />;
            case "students": return <StudentsPage />;
            case "classes": return <ClassesPage />;
            case "attendance": return <AttendancePage />;
            case "sms": return <SMSPage />;
            case "telegram": return <TelegramPage />;
            case "ai": return <AIPage />;
            case "logs": return <LogsPage />;
            case "settings": return <SettingsPage />;
            default: return <DashboardPage />;
          }
        })()}
      </Suspense>
    );
  };

  if (isAuthenticated === null) {
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="loading-overlay"><div className="spinner" /></div>}>
        <LoginPage onLogin={() => setIsAuthenticated(true)} theme={theme} />
      </Suspense>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOnline={isOnline}
        offlineCount={offlineCount}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
