import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconPlus, IconClose, IconRefresh } from "../components/Icons";

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "TYT", date: "", answerKeyString: "", isPublic: false });

  // Edit/Delete States
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", type: "TYT", date: "", answerKeyString: "", isPublic: false });
  const [saving, setSaving] = useState(false);

  // Kelebek states
  const [modalTab, setModalTab] = useState<"results" | "kelebek">("results");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [kelebekLoading, setKelebekLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [kelebekFilters, setKelebekFilters] = useState({
    classId: "",
    minNet: "",
    maxNet: "",
    minCapacity: "",
    maxCapacity: "",
  });

  const loadExams = async () => {
    setLoading(true);
    try { const r = await apiRequest("GET", "/api/exams"); setExams(Array.isArray(r) ? r : []); } catch { setExams([]); }
    setLoading(false);
  };

  useEffect(() => {
    loadExams();
    apiRequest("GET", "/api/admin/classes").then((r) => setClasses(Array.isArray(r) ? r : [])).catch(() => {});
    apiRequest("GET", "/api/admin/classrooms").then((r) => setClassrooms(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    try {
      await apiRequest("POST", "/api/exams", form);
      setShowCreate(false); setForm({ name: "", type: "TYT", date: "", answerKeyString: "", isPublic: false });
      loadExams();
    } catch (e: any) { alert("Hata: " + (e?.message || e)); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.id) return;
    setSaving(true);
    try {
      await apiRequest("PUT", `/api/exams/${editForm.id}`, editForm);
      setEditingExam(null);
      loadExams();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sınavı silmek istediğinize emin misiniz? Sınava ait tüm optik sonuçlar ve Kelebek planları silinecektir!")) return;
    try {
      await apiRequest("DELETE", `/api/exams/${id}`);
      loadExams();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    }
  };

  const loadResults = async (id: string) => {
    setSelectedExam(id);
    setModalTab("results");
    try { const r = await apiRequest("GET", `/api/exams/${id}/results`); setResults(r); } catch { setResults(null); }
    try { const a = await apiRequest("GET", `/api/admin/exams/${id}/assignments`); setAssignments(Array.isArray(a) ? a : []); } catch { setAssignments([]); }
  };

  const handleKelebek = async () => {
    if (!selectedExam) return;
    setKelebekLoading(true);
    try {
      const params = new URLSearchParams();
      if (kelebekFilters.classId) params.set("classId", kelebekFilters.classId);
      if (kelebekFilters.minNet) params.set("minNet", kelebekFilters.minNet);
      if (kelebekFilters.maxNet) params.set("maxNet", kelebekFilters.maxNet);
      if (kelebekFilters.minCapacity) params.set("minCapacity", kelebekFilters.minCapacity);
      if (kelebekFilters.maxCapacity) params.set("maxCapacity", kelebekFilters.maxCapacity);

      const res: any = await apiRequest("POST", `/api/admin/exams/${selectedExam}/assign-kelebek?${params.toString()}`);
      alert("Kelebek dağıtımı başarıyla tamamlandı!");
      // Reload assignments
      const a = await apiRequest("GET", `/api/admin/exams/${selectedExam}/assignments`);
      setAssignments(Array.isArray(a) ? a : []);
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setKelebekLoading(false);
    }
  };

  const exportToCSV = () => {
    if (assignments.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Öğrenci,E-posta,Derslik,Sıra No\n";
    assignments.forEach(a => {
      const fullName = `${a.studentName || ''} ${a.studentLastName || ''}`.trim() || a.studentId;
      const email = a.studentEmail || "-";
      const classroom = a.classroomName || a.classroomId;
      const seat = a.seatNumber;
      csvContent += `"${fullName}","${email}","${classroom}",${seat}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kelebek-seating-${selectedExam}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const typeLabel: Record<string, string> = { TYT: "TYT", AYT_SAY: "AYT Sayısal", AYT_EA: "AYT EA", AYT_SOZ: "AYT Sözel" };

  const [search, setSearch] = useState("");

  const filteredExams = exams.filter(e => 
    (e.name && e.name.toLowerCase().includes(search.toLowerCase())) || 
    (e.type && (typeLabel[e.type] || e.type).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="page-header"><h2>Sınav Yönetimi</h2><p>Sınavları oluşturun, listeleyin ve sonuçlarını görüntüleyin</p></div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><IconPlus /> Yeni Sınav</button>
          <div className="toolbar-spacer" />
          <input 
            className="form-input" 
            style={{ width: "250px" }} 
            placeholder="Sınav adı veya türü ara..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <button className="btn btn-ghost btn-sm" onClick={loadExams}><IconRefresh /></button>
        </div>

        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sınav Adı</th><th>Tür</th><th>Tarih</th><th>Herkese Açık</th><th>İşlem</th></tr></thead>
              <tbody>
                {filteredExams.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><p>Eşleşen sınav bulunamadı</p></div></td></tr> :
                  filteredExams.map((e) => (
                    <tr key={e.id}>
                      <td style={{fontWeight:600, color:"var(--text-main)"}}>{e.name}</td>
                      <td><span className="badge info">{typeLabel[e.type] || e.type}</span></td>
                      <td>{e.date ? new Date(e.date).toLocaleDateString("tr-TR") : "-"}</td>
                      <td>{e.isPublic ? <span className="badge success">Evet</span> : <span className="badge neutral">Hayır</span>}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => loadResults(e.id)}>Sonuçlar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setEditingExam(e);
                            setEditForm({
                              id: e.id,
                              name: e.name,
                              type: e.type,
                              date: e.date ? e.date.substring(0, 10) : "",
                              answerKeyString: e.answerKeyString || "",
                              isPublic: e.isPublic || false
                            });
                          }}>Düzenle</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(e.id)}>Sil</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results / Kelebek modal */}
        {selectedExam && results && (
          <div className="modal-overlay" onClick={() => { setSelectedExam(null); setResults(null); setAssignments([]); }}>
            <div className="modal" style={{ maxWidth: "800px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Sınav Detay ve Dağıtımı</h3>
                <button className="modal-close" onClick={() => { setSelectedExam(null); setResults(null); setAssignments([]); }}><IconClose /></button>
              </div>

              <div className="tabs mb-4" style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", marginBottom: "16px" }}>
                <button
                  className={`btn ${modalTab === "results" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setModalTab("results")}
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                >
                  Sınav Sonuçları
                </button>
                <button
                  className={`btn ${modalTab === "kelebek" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setModalTab("kelebek")}
                  style={{ padding: "6px 12px", fontSize: "13px" }}
                >
                  Kelebek Dağıtımı ({assignments.length})
                </button>
              </div>

              {modalTab === "results" ? (
                <>
                  {results.stats && (
                    <div className="flex gap-3 mb-4" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                      <div className="stat-card" style={{flex:1, padding: "12px"}}><div className="stat-content"><div className="stat-label" style={{fontSize: "12px", color: "var(--text-muted)"}}>Ortalama Net</div><div className="stat-value" style={{fontSize: "20px", fontWeight: 700}}>{Number(results.stats.avgNet || 0).toFixed(1)}</div></div></div>
                      <div className="stat-card" style={{flex:1, padding: "12px"}}><div className="stat-content"><div className="stat-label" style={{fontSize: "12px", color: "var(--text-muted)"}}>Katılım</div><div className="stat-value" style={{fontSize: "20px", fontWeight: 700}}>{results.stats.total || 0}</div></div></div>
                    </div>
                  )}
                  <div className="table-wrapper" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    <table>
                      <thead><tr><th>Öğrenci</th><th>Net</th><th>Tarih</th></tr></thead>
                      <tbody>
                        {(results.results || []).map((r: any) => (
                          <tr key={r.id}>
                            <td>{r.studentEmail || r.studentId}</td>
                            <td style={{fontWeight:700}}>{r.netScore?.toFixed(1)}</td>
                            <td>{r.processedAt ? new Date(r.processedAt).toLocaleDateString("tr-TR") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="card mb-4" style={{ background: "var(--bg-main)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
                    <div style={{ fontWeight: 600, marginBottom: "12px", fontSize: "14px", color: "var(--text-main)" }}>Adaptif Dağıtım Filtreleri</div>
                    <div className="form-row mb-3" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Sınıf Filtresi</label>
                        <select
                          className="form-select"
                          value={kelebekFilters.classId}
                          onChange={(e) => setKelebekFilters({ ...kelebekFilters, classId: e.target.value })}
                          style={{ width: "100%" }}
                        >
                          <option value="">Tüm Sınıflar</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Min Net</label>
                        <input
                          type="number"
                          className="form-input"
                          value={kelebekFilters.minNet}
                          onChange={(e) => setKelebekFilters({ ...kelebekFilters, minNet: e.target.value })}
                          placeholder="Örn: 20"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Max Net</label>
                        <input
                          type="number"
                          className="form-input"
                          value={kelebekFilters.maxNet}
                          onChange={(e) => setKelebekFilters({ ...kelebekFilters, maxNet: e.target.value })}
                          placeholder="Örn: 80"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>

                    <div className="form-row mb-3" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Min Derslik Kapasitesi</label>
                        <input
                          type="number"
                          className="form-input"
                          value={kelebekFilters.minCapacity}
                          onChange={(e) => setKelebekFilters({ ...kelebekFilters, minCapacity: e.target.value })}
                          placeholder="Örn: 15"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Max Derslik Kapasitesi</label>
                        <input
                          type="number"
                          className="form-input"
                          value={kelebekFilters.maxCapacity}
                          onChange={(e) => setKelebekFilters({ ...kelebekFilters, maxCapacity: e.target.value })}
                          placeholder="Örn: 40"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleKelebek}
                      disabled={kelebekLoading}
                      style={{ background: "#8b5cf6", width: "100%" }}
                    >
                      {kelebekLoading ? "Dağıtılıyor..." : "🦋 Kelebek Dağıtımı Çalıştır"}
                    </button>
                  </div>

                  <div className="toolbar" style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <select
                        className="form-select"
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        style={{ width: "100%", height: "36px" }}
                      >
                        <option value="">Tüm Derslikler</option>
                        {Array.from(new Set(assignments.map(a => a.classroomId))).map(roomId => {
                          const room = assignments.find(a => a.classroomId === roomId);
                          return (
                            <option key={roomId} value={roomId}>
                              {room?.classroomName || roomId}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {assignments.length > 0 && (
                      <button className="btn btn-ghost" onClick={exportToCSV} style={{ height: "36px", whiteSpace: "nowrap" }}>
                        📥 CSV Dışa Aktar
                      </button>
                    )}
                  </div>

                  <div className="table-wrapper" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table>
                      <thead>
                        <tr><th>Öğrenci</th><th>E-posta</th><th>Derslik</th><th>Sıra No</th></tr>
                      </thead>
                      <tbody>
                        {assignments.length === 0 ? (
                          <tr><td colSpan={4}><div className="empty-state"><p>Henüz Kelebek dağıtımı yapılmamış</p></div></td></tr>
                        ) : (
                          assignments
                            .filter(a => !selectedRoomId || a.classroomId === selectedRoomId)
                            .map((a, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{`${a.studentName || ''} ${a.studentLastName || ''}`.trim() || a.studentId}</td>
                                <td>{a.studentEmail || "-"}</td>
                                <td>{a.classroomName || a.classroomId}</td>
                                <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{a.seatNumber}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Yeni Sınav Oluştur</h3><button className="modal-close" onClick={() => setShowCreate(false)}><IconClose /></button></div>
              <div className="form-group"><label className="form-label">Sınav Adı</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: 3D TYT Deneme 5" /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Tür</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="TYT">TYT</option><option value="AYT_SAY">AYT Sayısal</option>
                    <option value="AYT_EA">AYT EA</option><option value="AYT_SOZ">AYT Sözel</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Tarih</label><input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Cevap Anahtarı (Opsiyonel)</label><input className="form-input" value={form.answerKeyString} onChange={(e) => setForm({ ...form, answerKeyString: e.target.value })} placeholder="ABCDEABCDE..." /></div>
              <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button><button className="btn btn-primary" onClick={handleCreate} disabled={!form.name}>Oluştur</button></div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingExam && (
          <div className="modal-overlay" onClick={() => setEditingExam(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Sınavı Düzenle</h3><button className="modal-close" onClick={() => setEditingExam(null)}><IconClose /></button></div>
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label className="form-label">Sınav Adı</label>
                  <input className="form-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Örn: 3D TYT Deneme 5" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tür</label>
                    <select className="form-select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                      <option value="TYT">TYT</option>
                      <option value="AYT_SAY">AYT Sayısal</option>
                      <option value="AYT_EA">AYT EA</option>
                      <option value="AYT_SOZ">AYT Sözel</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tarih</label>
                    <input className="form-input" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cevap Anahtarı (Opsiyonel)</label>
                  <input className="form-input" value={editForm.answerKeyString} onChange={(e) => setEditForm({ ...editForm, answerKeyString: e.target.value })} placeholder="ABCDEABCDE..." />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", marginBottom: "12px" }}>
                  <input type="checkbox" id="edit-exam-isPublic" checked={editForm.isPublic} onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })} />
                  <label htmlFor="edit-exam-isPublic" style={{ fontSize: "13px", userSelect: "none", cursor: "pointer", color: "var(--text-main)" }}>Herkese Açık</label>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingExam(null)}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !editForm.name}>Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
