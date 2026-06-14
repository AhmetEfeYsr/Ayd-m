import { useState } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconAI } from "../components/Icons";

export default function AIPage() {
  const [tab, setTab] = useState<"tutor" | "plan">("tutor");
  const [prompt, setPrompt] = useState("");
  const [tutorResult, setTutorResult] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ targetNet: 100, weakTopics: "" });
  const [planResult, setPlanResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTutor = async () => {
    if (!prompt) return;
    setLoading(true); setTutorResult(null);
    try { const r = await apiRequest("POST", "/api/ai/tutor", { prompt }); setTutorResult(r); }
    catch (e: any) { setTutorResult({ error: e?.message || e }); }
    setLoading(false);
  };

  const handlePlan = async () => {
    setLoading(true); setPlanResult(null);
    try {
      const r = await apiRequest("POST", "/api/ai/study-plan", {
        targetNet: Number(planForm.targetNet),
        weakTopics: planForm.weakTopics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setPlanResult(r);
    } catch (e: any) { setPlanResult({ error: e?.message || e }); }
    setLoading(false);
  };

  return (
    <>
      <div className="page-header"><h2>Yapay Zeka</h2><p>AI Tutor ve çalışma planı oluşturma</p></div>
      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === "tutor" ? "active" : ""}`} onClick={() => setTab("tutor")}>AI Tutor</button>
          <button className={`tab ${tab === "plan" ? "active" : ""}`} onClick={() => setTab("plan")}>Çalışma Planı</button>
        </div>

        {tab === "tutor" && (
          <div className="card">
            <div className="card-title"><IconAI /> AI Tutor — Öğrenci Asistanı</div>
            <div className="form-group">
              <label className="form-label">Soru / İstek</label>
              <textarea className="form-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Öğrencinin sorusunu yazın... Örn: Türev konusunu anlamadım, nereden başlamalıyım?" />
            </div>
            <button className="btn btn-primary" onClick={handleTutor} disabled={loading || !prompt}>
              {loading ? <><div className="spinner" /> Analiz ediliyor...</> : "Analiz Et"}
            </button>
            {tutorResult && (
              <div className="card mt-4">
                {tutorResult.error ? <p style={{color:"var(--danger)"}}>{tutorResult.error}</p> : (
                  <div>
                    <div className="flex gap-3 mb-4">
                      <div className="stat-card" style={{flex:1}}><div className="stat-content"><div className="stat-label">Niyet</div><div style={{fontWeight:700, fontSize:16}}>{tutorResult.intent}</div></div></div>
                      <div className="stat-card" style={{flex:1}}><div className="stat-content"><div className="stat-label">Güven</div><div style={{fontWeight:700, fontSize:16}}>{(tutorResult.confidence * 100).toFixed(0)}%</div></div></div>
                    </div>
                    <div className="form-group"><label className="form-label">Önerilen Aksiyon</label><p style={{color:"var(--text-main)"}}>{tutorResult.suggested_action}</p></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="card">
            <div className="card-title"><IconAI /> Sprint Çalışma Planı</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Hedef Net</label><input className="form-input" type="number" value={planForm.targetNet} onChange={(e) => setPlanForm({...planForm, targetNet: Number(e.target.value)})} /></div>
              <div className="form-group"><label className="form-label">Zayıf Konular (virgülle)</label><input className="form-input" value={planForm.weakTopics} onChange={(e) => setPlanForm({...planForm, weakTopics: e.target.value})} placeholder="Türev, İntegral, Olasılık" /></div>
            </div>
            <button className="btn btn-primary" onClick={handlePlan} disabled={loading}>
              {loading ? <><div className="spinner" /> Plan oluşturuluyor...</> : "Plan Oluştur"}
            </button>
            {planResult && (
              <div className="card mt-4">
                {planResult.error ? <p style={{color:"var(--danger)"}}>{planResult.error}</p> : (
                  <div>
                    <div className="flex gap-3 mb-4">
                      <div className="stat-card" style={{flex:1}}><div className="stat-content"><div className="stat-label">Toplam Gün</div><div className="stat-value">{planResult.total_days}</div></div></div>
                      <div className="stat-card" style={{flex:1}}><div className="stat-content"><div className="stat-label">Günlük Saat</div><div className="stat-value">{planResult.daily_hours}</div></div></div>
                    </div>
                    {planResult.phases?.map((p: any, i: number) => (
                      <div key={i} className="card mb-4">
                        <div style={{fontWeight:700, marginBottom:8}}>{p.name} — {p.days} gün</div>
                        <div className="flex gap-2" style={{flexWrap:"wrap"}}>{p.focus_topics?.map((t: string, j: number) => <span key={j} className="badge info">{t}</span>)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
