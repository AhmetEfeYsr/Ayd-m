import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconRefresh } from "../components/Icons";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showTake, setShowTake] = useState(false);
  const [attendanceType, setAttendanceType] = useState("EXAM");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [a, s, c] = await Promise.all([
        apiRequest("GET", "/api/attendance"),
        apiRequest("GET", "/api/students"),
        apiRequest("GET", "/api/admin/classes")
      ]);
      setRecords(Array.isArray(a) ? a : []);
      setStudents(Array.isArray(s) ? s : []);
      setClasses(Array.isArray(c) ? c : []);
    } catch { 
      setRecords([]); 
      setStudents([]); 
      setClasses([]); 
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTake = async () => {
    const recs = Object.entries(selectedStudents).map(([studentId, status]) => ({
      studentId, status, type: attendanceType,
    }));
    if (recs.length === 0) return;
    try { 
      await apiRequest("POST", "/api/attendance", { records: recs }); 
      setShowTake(false); 
      setSelectedStudents({}); 
      load(); 
    } catch (e: any) { 
      alert("Hata: " + (e?.message || e)); 
    }
  };

  const toggleStudent = (id: string, status: string) => {
    setSelectedStudents((prev) => ({ ...prev, [id]: status }));
  };

  const statusLabel: Record<string, string> = { PRESENT: "Var", ABSENT: "Yok", LATE: "Geç", EXCUSED: "İzinli" };
  const statusClass: Record<string, string> = { PRESENT: "success", ABSENT: "danger", LATE: "warning", EXCUSED: "info" };

  const filteredStudents = selectedClassId
    ? students.filter((s) => s.classId === selectedClassId)
    : students;

  const studentMap = students.reduce((acc, s) => {
    acc[s.id] = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email;
    return acc;
  }, {} as Record<string, string>);

  return (
    <>
      <div className="page-header"><h2>Yoklama</h2><p>Sınav ve ders yoklamalarını alın ve görüntüleyin</p></div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowTake(!showTake)}>
            {showTake ? "İptal" : "Yoklama Al"}
          </button>
          <div className="toolbar-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /></button>
        </div>

        {showTake && (
          <div className="card mb-4">
            <div className="card-title">Yoklama Al</div>
            
            <div className="form-row" style={{ marginBottom: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Tür</label>
                <select className="form-select" value={attendanceType} onChange={(e) => setAttendanceType(e.target.value)}>
                  <option value="EXAM">Sınav</option>
                  <option value="LESSON">Ders</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Sınıf Filtresi</label>
                <select className="form-select" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">Tüm Öğrenciler</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrapper mb-4" style={{ maxHeight: "300px", overflowY: "auto" }}>
              <table>
                <thead><tr><th>Öğrenci</th><th>Var</th><th>Yok</th><th>Geç</th><th>İzinli</th></tr></thead>
                <tbody>
                  {filteredStudents.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center" }}>Sınıfta kayıtlı öğrenci yok.</td></tr> :
                    filteredStudents.map((s) => (
                      <tr key={s.id}>
                        <td style={{fontWeight:600}}>{`${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email}</td>
                        {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((st) => (
                          <td key={st} style={{ textAlign: "center" }}>
                            <input type="checkbox" checked={selectedStudents[s.id] === st} onChange={() => toggleStudent(s.id, st)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-success" onClick={handleTake} disabled={Object.keys(selectedStudents).length === 0}>
              Yoklamayı Kaydet ({Object.keys(selectedStudents).length} öğrenci)
            </button>
          </div>
        )}

        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Öğrenci</th><th>Tür</th><th>Durum</th><th>Tarih</th></tr></thead>
              <tbody>
                {records.length === 0 ? <tr><td colSpan={4}><div className="empty-state"><p>Henüz yoklama kaydı yok</p></div></td></tr> :
                  records.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{studentMap[r.studentId] || r.studentId}</strong></td>
                      <td><span className="badge neutral">{r.type === "EXAM" ? "Sınav" : "Ders"}</span></td>
                      <td><span className={`badge ${statusClass[r.status] || "neutral"}`}>{statusLabel[r.status] || r.status}</span></td>
                      <td>{r.date ? new Date(r.date).toLocaleDateString("tr-TR") : "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
