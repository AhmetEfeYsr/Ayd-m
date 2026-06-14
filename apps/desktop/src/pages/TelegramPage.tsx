import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconTelegram } from "../components/Icons";

export default function TelegramPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [examResults, setExamResults] = useState<any[]>([]);

  const [form, setForm] = useState({
    telegramGroupId: "",
    className: "",
    examName: "",
    averageNetScore: 0,
    participationCount: 0,
    summaryReport: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest("GET", "/api/exams"),
      apiRequest("GET", "/api/admin/classes"),
      apiRequest("GET", "/api/students")
    ])
    .then(([exs, cls, stds]: any[]) => {
      if (Array.isArray(exs)) setExams(exs);
      if (Array.isArray(cls)) setClasses(cls);
      if (Array.isArray(stds)) setStudents(stds);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  // When Exam is selected, fetch results
  const handleExamChange = async (examId: string) => {
    setSelectedExamId(examId);
    if (!examId) {
      setExamResults([]);
      setForm((prev) => ({ ...prev, examName: "", averageNetScore: 0, participationCount: 0 }));
      return;
    }
    const selectedExam = exams.find((e) => e.id === examId);
    const examName = selectedExam ? selectedExam.name : "";

    try {
      const res: any = await apiRequest("GET", `/api/exams/${examId}/results`);
      const results = res?.results || [];
      setExamResults(results);
      
      // Update form examName
      setForm((prev) => {
        const next = { ...prev, examName };
        if (selectedClassId) {
          return calculateClassStats(selectedClassId, results, next);
        }
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // When Class is selected, autofill Group ID, Name, and calculate stats
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    if (!classId) {
      setForm((prev) => ({ ...prev, className: "", telegramGroupId: "", averageNetScore: 0, participationCount: 0 }));
      return;
    }
    const selectedClass = classes.find((c) => c.id === classId);
    const className = selectedClass ? selectedClass.name : "";
    const telegramGroupId = selectedClass ? (selectedClass.telegramGroupId || "") : "";

    setForm((prev) => {
      const next = { ...prev, className, telegramGroupId };
      return calculateClassStats(classId, examResults, next);
    });
  };

  const calculateClassStats = (classId: string, results: any[], currentForm: typeof form) => {
    const classStudentIds = students.filter((s) => s.classId === classId).map((s) => s.id);
    const classResults = results.filter((r) => classStudentIds.includes(r.studentId));

    const participationCount = classResults.length;
    const averageNetScore = participationCount > 0
      ? Number((classResults.reduce((sum, r) => sum + (r.netScore || 0), 0) / participationCount).toFixed(2))
      : 0;

    return {
      ...currentForm,
      participationCount,
      averageNetScore
    };
  };

  const handleSend = async () => {
    setSending(true); setResult(null);
    try {
      await apiRequest("POST", "/api/telegram/report", {
        ...form, averageNetScore: Number(form.averageNetScore), participationCount: Number(form.participationCount),
      });
      setResult("Telegram raporu başarıyla gönderildi!");
    } catch (e: any) { setResult("Hata: " + (e?.message || e)); }
    setSending(false);
  };

  if (loading) return <div className="page-body">Yükleniyor...</div>;

  return (
    <>
      <div className="page-header"><h2>Telegram Rapor</h2><p>Sınıf gruplarına sınav raporu gönderin</p></div>
      <div className="page-body">
        <div className="card">
          <div className="card-title"><IconTelegram /> Rapor Gönder</div>
          
          <div className="form-row" style={{ marginBottom: "16px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Sınav Seçin</label>
              <select className="form-select" value={selectedExamId} onChange={(e) => handleExamChange(e.target.value)}>
                <option value="">Sınav Seçin</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Sınıf Seçin</label>
              <select className="form-select" value={selectedClassId} onChange={(e) => handleClassChange(e.target.value)}>
                <option value="">Sınıf Seçin</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group"><label className="form-label">Telegram Grup ID</label><input className="form-input" value={form.telegramGroupId} onChange={(e) => setForm({...form, telegramGroupId: e.target.value})} placeholder="-100123456789" /></div>
            <div className="form-group"><label className="form-label">Sınıf Adı</label><input className="form-input" value={form.className} onChange={(e) => setForm({...form, className: e.target.value})} placeholder="12-A" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Sınav Adı</label><input className="form-input" value={form.examName} onChange={(e) => setForm({...form, examName: e.target.value})} placeholder="3D TYT Deneme 5" /></div>
            <div className="form-group"><label className="form-label">Ortalama Net</label><input className="form-input" type="number" step="0.1" value={form.averageNetScore} onChange={(e) => setForm({...form, averageNetScore: Number(e.target.value)})} /></div>
          </div>
          <div className="form-group"><label className="form-label">Katılım Sayısı</label><input className="form-input" type="number" value={form.participationCount} onChange={(e) => setForm({...form, participationCount: Number(e.target.value)})} /></div>
          <div className="form-group"><label className="form-label">Özet Rapor (Opsiyonel)</label><textarea className="form-textarea" value={form.summaryReport} onChange={(e) => setForm({...form, summaryReport: e.target.value})} placeholder="Ek notlar..." /></div>
          {result && <div className={`action-bar mb-4`}>{result}</div>}
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !form.telegramGroupId || !form.className}>
            {sending ? <><div className="spinner" /> Gönderiliyor...</> : <><IconTelegram /> Raporu Gönder</>}
          </button>
        </div>
      </div>
    </>
  );
}
