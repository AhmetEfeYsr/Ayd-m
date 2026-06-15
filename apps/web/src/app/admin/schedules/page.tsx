"use client";
import { useState, useEffect, useMemo } from "react";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Entities for dropdowns
  const [classes, setClasses] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Modals state
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    classId: "", teacherId: "", classroomId: "", subjectId: "", dayOfWeek: "1", startTime: "09:00", endTime: "09:40"
  });
  const [eventForm, setEventForm] = useState({
    teacherId: "", classId: "", classroomId: "", type: "LATE_NOTICE", date: "", startTime: "", endTime: "", note: ""
  });

  const [scheduleFilters, setScheduleFilters] = useState<FilterCriteria>(EMPTY_FILTER);
  const [eventFilters, setEventFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  useEffect(() => {
    fetchData();
    // Load entities
    fetch("/api/admin/classes").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setClasses(d); }).catch(() => {});
    fetch("/api/admin/classrooms").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setClassrooms(d); }).catch(() => {});
    fetch("/api/admin/teachers").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTeachers(d); }).catch(() => {});
    fetch("/api/admin/subjects").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setSubjects(d); }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, eventRes] = await Promise.all([
        fetch("/api/admin/schedules"),
        fetch("/api/admin/schedules/events")
      ]);
      const s = await schedRes.json();
      const e = await eventRes.json();
      if (Array.isArray(s)) setSchedules(s);
      if (Array.isArray(e)) setEvents(e);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    return days[day - 1] || "Bilinmeyen";
  };

  // Create handlers
  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleForm),
      });
      if (res.ok) {
        setShowAddSchedule(false);
        setScheduleForm({ classId: "", teacherId: "", classroomId: "", subjectId: "", dayOfWeek: "1", startTime: "09:00", endTime: "09:40" });
        fetchData();
      } else {
        alert("Ekleme başarısız.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/schedules/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
      });
      if (res.ok) {
        setShowAddEvent(false);
        setEventForm({ teacherId: "", classId: "", classroomId: "", type: "LATE_NOTICE", date: "", startTime: "", endTime: "", note: "" });
        fetchData();
      } else {
        alert("Ekleme başarısız.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete handlers
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Bu sabit dersi silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/schedules?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Silme başarısız.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Bu bildirim/etkinlik kaydını silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/schedules/events?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        alert("Silme başarısız.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    let result = [...schedules];
    if (scheduleFilters.customQuery) {
      const q = scheduleFilters.customQuery.toLowerCase();
      result = result.filter(
        (s) =>
          getDayName(s.dayOfWeek).toLowerCase().includes(q) ||
          (s.teacherName || "").toLowerCase().includes(q) ||
          (s.classroomName || "").toLowerCase().includes(q) ||
          (s.subjectName || "").toLowerCase().includes(q) ||
          (s.className || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [schedules, scheduleFilters]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (eventFilters.dateFrom) {
      const from = new Date(eventFilters.dateFrom);
      result = result.filter((e) => e.date && new Date(e.date) >= from);
    }
    if (eventFilters.dateTo) {
      const to = new Date(eventFilters.dateTo);
      to.setHours(23, 59, 59);
      result = result.filter((e) => e.date && new Date(e.date) <= to);
    }
    if (eventFilters.customQuery) {
      const q = eventFilters.customQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.type || "").toLowerCase().includes(q) ||
          (e.note || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, eventFilters]);

  const handleExportSchedulesPDF = () => {
    exportPDF(
      "Ders Programı",
      [
        { header: "Sınıf", key: "className" },
        { header: "Gün", key: "day" },
        { header: "Saat", key: "time" },
        { header: "Ders", key: "subjectName" },
        { header: "Öğretmen", key: "teacherName" },
        { header: "Derslik", key: "classroomName" },
      ],
      filteredSchedules.map((s) => ({
        className: s.className || "-",
        day: getDayName(s.dayOfWeek),
        time: `${s.startTime} - ${s.endTime}`,
        subjectName: s.subjectName || "-",
        teacherName: s.teacherName || "-",
        classroomName: s.classroomName || "-",
      })),
      "ders-programi"
    );
  };

  const handleExportSchedulesExcel = () => {
    exportExcel(
      "Ders Programı",
      [
        { header: "Sınıf", key: "className", width: 15 },
        { header: "Gün", key: "day", width: 15 },
        { header: "Saat", key: "time", width: 15 },
        { header: "Ders", key: "subjectName", width: 20 },
        { header: "Öğretmen", key: "teacherName", width: 25 },
        { header: "Derslik", key: "classroomId", width: 25 },
      ],
      filteredSchedules.map((s) => ({
        className: s.className || "-",
        day: getDayName(s.dayOfWeek),
        time: `${s.startTime} - ${s.endTime}`,
        subjectName: s.subjectName || "-",
        teacherName: s.teacherName || "-",
        classroomId: s.classroomName || "-",
      })),
      "ders-programi"
    );
  };

  const eventTypeLabels: Record<string, string> = {
    LATE_NOTICE: "Geç Kalma",
    EXTRA_LESSON: "Ek Ders",
    CANCELLATION: "İptal",
  };

  const handleExportEventsPDF = () => {
    exportPDF(
      "Geç Kalma & Ek Ders Bildirimleri",
      [
        { header: "Tür", key: "type" },
        { header: "Tarih", key: "date" },
        { header: "Saat", key: "time" },
        { header: "Not", key: "note" },
      ],
      filteredEvents.map((e) => ({
        type: eventTypeLabels[e.type] || e.type,
        date: new Date(e.date).toLocaleDateString("tr-TR"),
        time: e.startTime ? `${e.startTime} - ${e.endTime}` : "-",
        note: e.note || "-",
      })),
      "bildirimler"
    );
  };

  const handleExportEventsExcel = () => {
    exportExcel(
      "Bildirimler",
      [
        { header: "Tür", key: "type", width: 15 },
        { header: "Tarih", key: "date", width: 15 },
        { header: "Saat", key: "time", width: 15 },
        { header: "Not", key: "note", width: 30 },
      ],
      filteredEvents.map((e) => ({
        type: eventTypeLabels[e.type] || e.type,
        date: new Date(e.date).toLocaleDateString("tr-TR"),
        time: e.startTime ? `${e.startTime} - ${e.endTime}` : "-",
        note: e.note || "-",
      })),
      "bildirimler"
    );
  };

  return (
    <div className="admin-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="admin-page-title" style={{ marginBottom: 8 }}>Ders Programı ve Adaptif Planlama</h1>
        <p className="header-subtitle">Ders programlarını, geç kalma bildirimlerini ve ek dersleri yönetin.</p>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Sabit Ders Sayısı</span>
          <div className="stat-value">{schedules.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Geç Kalma</span>
          <div className="stat-value" style={{ color: "#f59e0b" }}>
            {events.filter((e) => e.type === "LATE_NOTICE").length}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ek Ders</span>
          <div className="stat-value" style={{ color: "#10b981" }}>
            {events.filter((e) => e.type === "EXTRA_LESSON").length}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">İptal</span>
          <div className="stat-value" style={{ color: "#ef4444" }}>
            {events.filter((e) => e.type === "CANCELLATION").length}
          </div>
        </div>
      </div>

      {/* Haftalık Program */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">📅 Haftalık Sabit Program</h2>

        <FilterPanel
          filters={scheduleFilters}
          onChange={setScheduleFilters}
          onApply={() => {}}
          onReset={() => setScheduleFilters(EMPTY_FILTER)}
          showSearch
          extraActions={
            <div style={{ display: "flex", gap: 6 }}>
              <button className="admin-btn-sm" onClick={() => setShowAddSchedule(true)} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
                ➕ Ders Ekle
              </button>
              <button className="admin-btn-sm" onClick={handleExportSchedulesPDF} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
                📄 PDF
              </button>
              <button className="admin-btn-sm" onClick={handleExportSchedulesExcel} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                📊 Excel
              </button>
            </div>
          }
        />

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>Sınıf</th><th>Gün</th><th>Saat</th><th>Ders</th><th>Öğretmen</th><th>Derslik</th><th style={{ width: "80px" }}>İşlem</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}>Yükleniyor...</td></tr>}
              {!loading && filteredSchedules.length === 0 && <tr><td colSpan={7}>Kayıtlı program yok.</td></tr>}
              {filteredSchedules.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.className || "—"}</strong></td>
                  <td>{getDayName(s.dayOfWeek)}</td>
                  <td>{s.startTime} - {s.endTime}</td>
                  <td>{s.subjectName || "—"}</td>
                  <td>{s.teacherName || "—"}</td>
                  <td>{s.classroomName || "—"}</td>
                  <td>
                    <button className="admin-btn-sm" style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }} onClick={() => handleDeleteSchedule(s.id)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bildirimler */}
      <div className="stat-card">
        <h2 className="section-title">⚠️ Geç Kalma & Ek Ders Bildirimleri</h2>

        <FilterPanel
          filters={eventFilters}
          onChange={setEventFilters}
          onApply={() => {}}
          onReset={() => setEventFilters(EMPTY_FILTER)}
          showDateRange
          showSearch
          extraActions={
            <div style={{ display: "flex", gap: 6 }}>
              <button className="admin-btn-sm" onClick={() => setShowAddEvent(true)} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fde047" }}>
                ➕ Bildirim Ekle
              </button>
              <button className="admin-btn-sm" onClick={handleExportEventsPDF} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
                📄 PDF
              </button>
              <button className="admin-btn-sm" onClick={handleExportEventsExcel} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                📊 Excel
              </button>
            </div>
          }
        />

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>Tür</th><th>Tarih</th><th>Saat</th><th>Not</th><th style={{ width: "80px" }}>İşlem</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5}>Yükleniyor...</td></tr>}
              {!loading && filteredEvents.length === 0 && <tr><td colSpan={5}>Kayıtlı bildirim yok.</td></tr>}
              {filteredEvents.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="topic-badge" style={{
                      background: e.type === "LATE_NOTICE" ? "rgba(245, 158, 11, 0.15)" : e.type === "EXTRA_LESSON" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: e.type === "LATE_NOTICE" ? "#fbbf24" : e.type === "EXTRA_LESSON" ? "#34d399" : "#fca5a5"
                    }}>
                      {eventTypeLabels[e.type] || e.type}
                    </span>
                  </td>
                  <td>{new Date(e.date).toLocaleDateString("tr-TR")}</td>
                  <td>{e.startTime ? `${e.startTime} - ${e.endTime}` : "-"}</td>
                  <td>{e.note || "-"}</td>
                  <td>
                    <button className="admin-btn-sm" style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }} onClick={() => handleDeleteEvent(e.id)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Add Modal */}
      {showAddSchedule && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Sabit Ders Ekle</h3>
            
            <form onSubmit={handleAddScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Sınıf</label>
                <select className="admin-input" style={{ width: "100%" }} value={scheduleForm.classId} onChange={(e) => setScheduleForm({ ...scheduleForm, classId: e.target.value })} required>
                  <option value="">Sınıf Seçin</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Ders Konusu</label>
                <select className="admin-input" style={{ width: "100%" }} value={scheduleForm.subjectId} onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })} required>
                  <option value="">Ders Seçin</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Öğretmen</label>
                <select className="admin-input" style={{ width: "100%" }} value={scheduleForm.teacherId} onChange={(e) => setScheduleForm({ ...scheduleForm, teacherId: e.target.value })} required>
                  <option value="">Öğretmen Seçin</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{`${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Derslik</label>
                <select className="admin-input" style={{ width: "100%" }} value={scheduleForm.classroomId} onChange={(e) => setScheduleForm({ ...scheduleForm, classroomId: e.target.value })} required>
                  <option value="">Derslik Seçin</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Gün</label>
                <select className="admin-input" style={{ width: "100%" }} value={scheduleForm.dayOfWeek} onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: e.target.value })} required>
                  <option value="1">Pazartesi</option>
                  <option value="2">Salı</option>
                  <option value="3">Çarşamba</option>
                  <option value="4">Perşembe</option>
                  <option value="5">Cuma</option>
                  <option value="6">Cumartesi</option>
                  <option value="7">Pazar</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Başlangıç</label>
                  <input type="time" className="admin-input" style={{ width: "100%" }} value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Bitiş</label>
                  <input type="time" className="admin-input" style={{ width: "100%" }} value={scheduleForm.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setShowAddSchedule(false)}>İptal</button>
                <button type="submit" className="admin-btn-primary">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Add Modal */}
      {showAddEvent && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Yeni Bildirim / Etkinlik Ekle</h3>
            
            <form onSubmit={handleAddEventSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Tür</label>
                <select className="admin-input" style={{ width: "100%" }} value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} required>
                  <option value="LATE_NOTICE">Geç Kalma Bildirimi</option>
                  <option value="EXTRA_LESSON">Ek Ders Etkinliği</option>
                  <option value="CANCELLATION">Ders İptal Bildirimi</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Sınıf (Ek Ders için)</label>
                <select className="admin-input" style={{ width: "100%" }} value={eventForm.classId} onChange={(e) => setEventForm({ ...eventForm, classId: e.target.value })}>
                  <option value="">Sınıf Seçin (Opsiyonel)</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Derslik</label>
                <select className="admin-input" style={{ width: "100%" }} value={eventForm.classroomId} onChange={(e) => setEventForm({ ...eventForm, classroomId: e.target.value })}>
                  <option value="">Derslik Seçin (Opsiyonel)</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Öğretmen</label>
                <select className="admin-input" style={{ width: "100%" }} value={eventForm.teacherId} onChange={(e) => setEventForm({ ...eventForm, teacherId: e.target.value })} required>
                  <option value="">Öğretmen Seçin</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{`${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Tarih</label>
                <input type="date" className="admin-input" style={{ width: "100%" }} value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} required />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Başlangıç Saati</label>
                  <input type="time" className="admin-input" style={{ width: "100%" }} value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Bitiş Saati</label>
                  <input type="time" className="admin-input" style={{ width: "100%" }} value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Açıklama / Not</label>
                <textarea className="admin-input" style={{ width: "100%", height: "60px", resize: "none" }} value={eventForm.note} onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })} placeholder="Ders iptal sebebi, ek etüt detayları vb." />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setShowAddEvent(false)}>İptal</button>
                <button type="submit" className="admin-btn-primary">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
