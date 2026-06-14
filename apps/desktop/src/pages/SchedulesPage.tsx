import React, { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest("GET", "/api/admin/schedules"),
      apiRequest("GET", "/api/admin/schedules/events")
    ])
    .then(([schedRes, eventRes]: any[]) => {
      setSchedules(Array.isArray(schedRes) ? schedRes : []);
      setEvents(Array.isArray(eventRes) ? eventRes : []);
    })
    .catch((e) => console.error("Error fetching schedules", e))
    .finally(() => setLoading(false));
  }, []);

  const getDayName = (day: number) => {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    return days[day - 1] || "Bilinmeyen";
  };

  return (
    <div className="page-body">
      <div className="card-grid">
        <div className="card">
          <div className="card-title">
            <span>📅</span> Sabit Ders Programı
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Gün</th><th>Saat</th><th>Öğretmen ID</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={3}>Yükleniyor...</td></tr>}
                {!loading && schedules.length === 0 && <tr><td colSpan={3}>Kayıtlı program yok.</td></tr>}
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td>{getDayName(s.dayOfWeek)}</td>
                    <td>{s.startTime} - {s.endTime}</td>
                    <td style={{ fontSize: 11 }}>{s.teacherId?.slice(0,8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>⚠️</span> Geç Kalma & Ek Ders Bildirimleri
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Tür</th><th>Tarih</th><th>Saat</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={3}>Yükleniyor...</td></tr>}
                {!loading && events.length === 0 && <tr><td colSpan={3}>Kayıtlı bildirim yok.</td></tr>}
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className={`badge ${e.type === "LATE_NOTICE" ? "warning" : "success"}`}>
                        {e.type === "LATE_NOTICE" ? "Geç Kalma" : e.type === "EXTRA_LESSON" ? "Ek Ders" : "İptal"}
                      </span>
                    </td>
                    <td>{new Date(e.date).toLocaleDateString("tr-TR")}</td>
                    <td>{e.startTime ? `${e.startTime}-${e.endTime}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
