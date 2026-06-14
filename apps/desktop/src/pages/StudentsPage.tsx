import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconRefresh, IconClose, IconPlus } from "../components/Icons";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [addForm, setAddForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    classId: "",
    identityNumber: "",
    phone: "",
    parentPhone: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    firstName: "",
    lastName: "",
    classId: "",
    identityNumber: "",
    phone: "",
    parentPhone: "",
  });

  const load = async () => {
    setLoading(true);
    try { const r = await apiRequest("GET", "/api/students"); setStudents(Array.isArray(r) ? r : []); } catch { setStudents([]); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    apiRequest("GET", "/api/admin/classes").then((r) => setClasses(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email) return alert("E-posta alanı zorunludur.");
    try {
      await apiRequest("POST", "/api/admin/students", addForm);
      alert("Öğrenci başarıyla eklendi.");
      setShowAddModal(false);
      setAddForm({
        email: "",
        firstName: "",
        lastName: "",
        classId: "",
        identityNumber: "",
        phone: "",
        parentPhone: "",
      });
      load();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("PUT", "/api/admin/students", editForm);
      alert("Öğrenci başarıyla güncellendi.");
      setShowEditModal(false);
      load();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Bu öğrenciyi silmek istediğinize emin misiniz? Giriş yetkisi de kaldırılacaktır.")) return;
    try {
      await apiRequest("DELETE", `/api/admin/students?id=${id}`);
      alert("Öğrenci silindi.");
      load();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    }
  };

  const loadResults = async (id: string) => {
    setSelectedId(id);
    try { const r = await apiRequest("GET", `/api/students/${id}/results`); setResults(Array.isArray(r) ? r : []); } catch { setResults([]); }
  };

  const [search, setSearch] = useState("");

  const filteredStudents = students.filter(s => 
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) || 
    (s.phone && s.phone.includes(search)) ||
    (s.parentPhone && s.parentPhone.includes(search))
  );

  return (
    <>
      <div className="page-header"><h2>Öğrenciler</h2><p>Öğrenci listesi ve bireysel sonuçlar</p></div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><IconPlus /> Yeni Öğrenci</button>
          <div className="toolbar-spacer" />
          <input 
            className="form-input" 
            style={{ width: "250px" }} 
            placeholder="E-posta veya telefon ara..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /></button>
        </div>
        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>E-posta</th><th>Ad Soyad</th><th>Telefon</th><th>Veli Tel.</th><th>İşlem</th></tr></thead>
              <tbody>
                {filteredStudents.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><p>Eşleşen öğrenci bulunamadı</p></div></td></tr> :
                  filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td style={{fontWeight:600, color:"var(--text-main)"}}>{s.email}</td>
                      <td>{`${s.firstName || ''} ${s.lastName || ''}`.trim() || "-"}</td>
                      <td>{s.phone || "-"}</td>
                      <td>{s.parentPhone || "-"}</td>
                      <td style={{ display: "flex", gap: "6px" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => loadResults(s.id)}>Sonuçlar</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditForm({
                              id: s.id,
                              firstName: s.firstName || "",
                              lastName: s.lastName || "",
                              classId: s.classId || "",
                              identityNumber: s.identityNumber || "",
                              phone: s.phone || "",
                              parentPhone: s.parentPhone || "",
                            });
                            setShowEditModal(true);
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteStudent(s.id)}
                          style={{ color: "var(--danger)" }}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Yeni Öğrenci Ekle</h3><button className="modal-close" onClick={() => setShowAddModal(false)}><IconClose /></button></div>
              <form onSubmit={handleAddStudent}>
                <div className="form-group">
                  <label className="form-label">E-posta (Zorunlu)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addForm.firstName}
                      onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Soyad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addForm.lastName}
                      onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sınıf</label>
                    <select
                      className="form-select"
                      value={addForm.classId}
                      onChange={(e) => setAddForm({ ...addForm, classId: e.target.value })}
                    >
                      <option value="">Sınıf Seçin</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">TC Kimlik No</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addForm.identityNumber}
                      onChange={(e) => setAddForm({ ...addForm, identityNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Veli Telefonu</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addForm.parentPhone}
                      onChange={(e) => setAddForm({ ...addForm, parentPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Öğrenci Düzenle</h3><button className="modal-close" onClick={() => setShowEditModal(false)}><IconClose /></button></div>
              <form onSubmit={handleEditStudent}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Soyad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sınıf</label>
                    <select
                      className="form-select"
                      value={editForm.classId}
                      onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    >
                      <option value="">Sınıf Yok</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">TC Kimlik No</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.identityNumber}
                      onChange={(e) => setEditForm({ ...editForm, identityNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Veli Telefonu</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.parentPhone}
                      onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {selectedId && (
          <div className="modal-overlay" onClick={() => setSelectedId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Öğrenci Sonuçları</h3><button className="modal-close" onClick={() => setSelectedId(null)}><IconClose /></button></div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Sınav</th><th>Tür</th><th>Net</th><th>Tarih</th></tr></thead>
                  <tbody>
                    {results.length === 0 ? <tr><td colSpan={4}><div className="empty-state"><p>Sonuç yok</p></div></td></tr> :
                      results.map((r: any) => (
                        <tr key={r.id}><td>{r.examName || "-"}</td><td><span className="badge info">{r.examType}</span></td><td style={{fontWeight:700}}>{r.netScore?.toFixed(1)}</td><td>{r.processedAt ? new Date(r.processedAt).toLocaleDateString("tr-TR") : "-"}</td></tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
