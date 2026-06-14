import { useState, useEffect } from "react";
import { getSyncStatus, getOfflineQueueCount, apiRequest } from "../hooks/useApi";
import { IconSync, IconChart } from "../components/Icons";

export default function DashboardPage() {
  const [status, setStatus] = useState<any>({});
  const [offlineCount, setOfflineCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [s, oc] = await Promise.all([getSyncStatus(), getOfflineQueueCount()]);
      setStatus(s);
      setOfflineCount(oc as number);
      try {
        const exams = await apiRequest("GET", "/api/exams") as any[];
        setExamCount(Array.isArray(exams) ? exams.length : 0);
      } catch { setExamCount(0); }
      try {
        const students = await apiRequest("GET", "/api/students") as any[];
        setStudentCount(Array.isArray(students) ? students.length : 0);
      } catch { setStudentCount(0); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); const t = setInterval(loadData, 10000); return () => clearInterval(t); }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /> Yükleniyor...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Gösterge Paneli</h2>
        <p>Sistem durumu ve özet istatistikler</p>
      </div>
      <div className="page-body">
        <div className="card-grid">
          <div className="stat-card">
            <div className="stat-icon success"><IconSync /></div>
            <div className="stat-content">
              <div className="stat-label">Senkronize Edilen</div>
              <div className="stat-value">{status.total_synced ?? 0}</div>
              <div className={`stat-change ${status.is_online ? "up" : "down"}`}>
                {status.is_online ? "● Çevrimiçi" : "○ Çevrimdışı"}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning"><IconChart /></div>
            <div className="stat-content">
              <div className="stat-label">Bekleyen Kuyruk</div>
              <div className="stat-value">{offlineCount}</div>
              <div className="stat-change">{offlineCount > 0 ? "Offline cache'de" : "Temiz"}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary"><IconChart /></div>
            <div className="stat-content">
              <div className="stat-label">Toplam Sınav</div>
              <div className="stat-value">{examCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info"><IconChart /></div>
            <div className="stat-content">
              <div className="stat-label">Toplam Öğrenci</div>
              <div className="stat-value">{studentCount}</div>
            </div>
          </div>
        </div>

        {status.total_failed > 0 && (
          <div className="action-bar mt-4">
            ⚠️ {status.total_failed} başarısız gönderim var. Ayarları kontrol edin ve yeniden senkronize edin.
          </div>
        )}

        <div className="card mt-4">
          <div className="card-title">Sistem Bilgisi</div>
          <div className="table-wrapper">
            <table>
              <tbody>
                <tr><td style={{fontWeight:600}}>Son Senkronizasyon</td><td>{status.last_sync || "Henüz yok"}</td></tr>
                <tr><td style={{fontWeight:600}}>Toplam Başarısız</td><td>{status.total_failed ?? 0}</td></tr>
                <tr><td style={{fontWeight:600}}>Bağlantı Durumu</td><td><span className={`badge ${status.is_online ? "success" : "danger"}`}>{status.is_online ? "Bağlı" : "Bağlı Değil"}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
