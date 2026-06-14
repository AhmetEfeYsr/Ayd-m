import { useState, useEffect } from "react";
import { getSyncLogs } from "../hooks/useApi";
import { IconRefresh } from "../components/Icons";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await getSyncLogs(); setLogs(r as any[]); } catch { setLogs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logTypeClass = (t: string) => {
    if (t.includes("ERROR") || t.includes("FAIL")) return "error";
    if (t.includes("SUCCESS") || t.includes("SYNCED") || t.includes("PARSED") || t.includes("START")) return "success";
    if (t.includes("WARN")) return "warning";
    return "info";
  };

  return (
    <>
      <div className="page-header"><h2>Sync Logları</h2><p>Tüm senkronizasyon olaylarının detaylı kaydı</p></div>
      <div className="page-body">
        <div className="toolbar"><div className="toolbar-spacer" /><button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /> Yenile</button></div>
        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="log-viewer" style={{maxHeight:"calc(100vh - 200px)"}}>
            {logs.length === 0 ? <div className="empty-state"><p>Henüz log yok</p></div> :
              logs.map((log, i) => (
                <div className="log-entry" key={i}>
                  <span className="log-time">{log.timestamp || ""}</span>
                  <span className={`log-type ${logTypeClass(log.eventType)}`}>{log.eventType}</span>
                  <span className="log-message">{log.details}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );
}
