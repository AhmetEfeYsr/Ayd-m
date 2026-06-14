import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconSms } from "../components/Icons";

export default function SMSPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [targetType, setTargetType] = useState("ALL"); // ALL, CLASS, STUDENT
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest("GET", "/api/admin/sms/templates"),
      apiRequest("GET", "/api/admin/classes"),
      apiRequest("GET", "/api/students")
    ])
    .then(([tmpl, cls, std]: any[]) => {
      if (Array.isArray(tmpl)) setTemplates(tmpl);
      if (Array.isArray(cls)) setClasses(cls);
      if (Array.isArray(std)) setStudents(std);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleStudentCheckboxChange = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    setSending(true); setResult(null);

    // Resolve recipientIds
    let recipientIds: string[] = [];
    if (targetType === "CLASS") {
      recipientIds = students.filter((s) => s.classId === selectedClassId).map((s) => s.id);
    } else if (targetType === "STUDENT") {
      recipientIds = selectedStudentIds;
    }

    try {
      const r: any = await apiRequest("POST", "/api/sms/send", {
        templateId: selectedTemplateId,
        recipientIds
      });
      setResult(`Başarılı! ${r?.sent || 0} SMS gönderildi.`);
    } catch (e: any) { setResult("Hata: " + (e?.message || e)); }
    setSending(false);
  };

  if (loading) return <div className="page-body">Yükleniyor...</div>;

  return (
    <>
      <div className="page-header"><h2>SMS Bildirim</h2><p>Veli bilgilendirme SMS'leri gönderin</p></div>
      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* Template Selection */}
          <div className="card">
            <div className="card-title"><IconSms /> SMS Şablonu</div>
            
            <div className="form-group">
              <label className="form-label">Hazır Şablon Seçin</label>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Şablon Seçin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            {selectedTemplateId && (
              <div className="path-display mb-4" style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
                {templates.find((t) => t.id === selectedTemplateId)?.content}
              </div>
            )}

            {result && <div className="action-bar mb-4">{result}</div>}
            
            <button className="btn btn-primary" onClick={handleSend} disabled={sending || !selectedTemplateId}>
              {sending ? <><div className="spinner" /> Gönderiliyor...</> : <><IconSms /> Toplu SMS Gönder</>}
            </button>
          </div>

          {/* Recipient Selection */}
          <div className="card">
            <div className="card-title">👥 Alıcı Seçimi</div>

            <div className="form-group">
              <label className="form-label">Gönderim Kapsamı</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="radio" name="target" checked={targetType === "ALL"} onChange={() => setTargetType("ALL")} />
                  Tüm Öğrenciler ({students.length})
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="radio" name="target" checked={targetType === "CLASS"} onChange={() => setTargetType("CLASS")} />
                  Sınıf Bazlı
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="radio" name="target" checked={targetType === "STUDENT"} onChange={() => setTargetType("STUDENT")} />
                  Öğrenci Seçerek
                </label>
              </div>
            </div>

            {targetType === "CLASS" && (
              <div className="form-group">
                <label className="form-label">Sınıf Seçin</label>
                <select
                  className="form-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Sınıf Seçin</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "STUDENT" && (
              <div className="form-group">
                <label className="form-label">Öğrencileri Seçin ({selectedStudentIds.length} seçildi)</label>
                <div className="table-wrapper" style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <table>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id}>
                          <td style={{ width: "40px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={() => handleStudentCheckboxChange(s.id)}
                            />
                          </td>
                          <td style={{ fontSize: 13 }}>{`${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email}</td>
                          <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.parentPhone || "Telefon Yok"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
