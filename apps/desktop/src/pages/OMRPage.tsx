import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getSyncStatus, getSyncLogs, getOfflineQueueCount, forceSync } from "../hooks/useApi";
import { IconRefresh } from "../components/Icons";

export default function OMRPage() {
  const [watchPath, setWatchPath] = useState<string>("");
  const [isWatching, setIsWatching] = useState(false);
  const [status, setStatus] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    try {
      const path = await invoke<string>("get_watch_directory");
      if (path) { setWatchPath(path); setIsWatching(true); }
      const [s, l, oc] = await Promise.all([getSyncStatus(), getSyncLogs(), getOfflineQueueCount()]);
      setStatus(s); setLogs(l as any[]); setOfflineCount(oc as number);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); const t = setInterval(loadData, 5000); return () => clearInterval(t); }, []);

  const handleSelectFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: "Optik Okuyucu Çıktı Klasörünü Seçin" });
    if (selected && typeof selected === "string") {
      await invoke("update_watch_directory", { path: selected });
      setWatchPath(selected); setIsWatching(true);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try { await forceSync(); } catch (e) { console.error(e); }
    setTimeout(() => { loadData(); setSyncing(false); }, 2000);
  };

  const logTypeClass = (t: string) => {
    if (t.includes("ERROR") || t.includes("FAIL")) return "error";
    if (t.includes("SUCCESS") || t.includes("SYNCED") || t.includes("PARSED")) return "success";
    if (t.includes("WARN")) return "warning";
    return "info";
  };

  return (
    <>
      <div className="page-header"><h2>OMR Monitor</h2><p>Dosya izleme, yığın durumu ve senkronizasyon logları</p></div>
      <div className="page-body">
        <div className="card mb-4">
          <div className="card-title">İzleme Durumu</div>
          <div className="flex items-center gap-3 mb-4">
            <span className={`sync-dot ${isWatching ? "online" : "offline"}`} />
            <span style={{fontWeight:600}}>{isWatching ? "Aktif İzleniyor" : "Beklemede"}</span>
          </div>
          <div className="path-display mb-4">{watchPath || "Henüz bir klasör seçilmedi..."}</div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSelectFolder}>
              <IconRefresh /> OMR Klasörünü {watchPath ? "Değiştir" : "Seç"}
            </button>
            {offlineCount > 0 && (
              <button className="btn btn-success" onClick={handleForceSync} disabled={syncing}>
                {syncing ? <><div className="spinner" /> Senkronize ediliyor...</> : <><IconRefresh /> Zorla Senkronize Et ({offlineCount})</>}
              </button>
            )}
          </div>
        </div>

        <div className="form-row mb-4">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-label">Senkronize</div>
              <div className="stat-value">{status.total_synced ?? 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-label">Başarısız</div>
              <div className="stat-value">{status.total_failed ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title flex justify-between items-center">
            Senkronizasyon Logları
            <button className="btn btn-ghost btn-sm" onClick={loadData}><IconRefresh /></button>
          </div>
          <div className="log-viewer">
            {logs.length === 0 ? (
              <div className="empty-state"><p>Henüz log kaydı yok</p></div>
            ) : logs.map((log, i) => (
              <div className="log-entry" key={i}>
                <span className="log-time">{log.timestamp?.slice(11, 19) || ""}</span>
                <span className={`log-type ${logTypeClass(log.eventType)}`}>{log.eventType}</span>
                <span className="log-message">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
