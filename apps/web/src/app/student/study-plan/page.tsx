"use client";

import { useState } from "react";

export default function StudyPlanPage() {
  const [targetNet, setTargetNet] = useState(100);
  const [duration, setDuration] = useState<"1-week" | "1-month">("1-month");
  const [weakTopicsText, setWeakTopicsText] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const weakTopics = weakTopicsText
        ? weakTopicsText.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetNet, duration, weakTopics }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Plan oluşturulurken bir hata oluştu.");
      }

      const data = await res.json();
      setPlan(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const exportPlan = async (format: "png" | "pdf") => {
    if (!plan) return;

    // Create canvas dynamically
    const canvas = document.createElement("canvas");
    canvas.width = 800;

    // Calculate height dynamically
    let calculatedHeight = 240; // Header + margins
    plan.phases?.forEach((phase: any) => {
      const topicsCount = phase.focus_topics?.length || 0;
      const rows = Math.ceil(topicsCount / 2);
      calculatedHeight += 80 + rows * 36 + 24; // Card padding + rows height + margin
    });
    calculatedHeight += 80; // Footer margin

    canvas.height = calculatedHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, calculatedHeight);
    grad.addColorStop(0, "#0b0f19"); // Deep dark blue-black
    grad.addColorStop(0.5, "#09090b"); // Zinc black
    grad.addColorStop(1, "#171717"); // Dark gray
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, calculatedHeight);

    // Decorative background glows (glassmorphism/poster effect)
    ctx.fillStyle = "rgba(99, 102, 241, 0.08)"; // Indigo glow top left
    ctx.beginPath();
    ctx.arc(100, 150, 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(16, 185, 129, 0.05)"; // Emerald glow bottom right
    ctx.beginPath();
    ctx.arc(700, calculatedHeight - 200, 300, 0, Math.PI * 2);
    ctx.fill();

    // Outer border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 784, calculatedHeight - 16);

    // Helper to draw rounded rects
    const drawRoundRect = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    // Header Text
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#818cf8"; // light violet
    ctx.fillText("AYDIM AI KİŞİSEL ÇALIŞMA ASİSTANI", 50, 60);

    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("ÇALIŞMA PROGRAMI", 50, 100);

    // Stats Card
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, 50, 130, 700, 65, 10);
    ctx.fill();
    ctx.stroke();

    // Stats Texts
    ctx.font = "600 11px sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("HEDEF NET", 70, 155);
    ctx.fillText("GÜNLÜK ÇALIŞMA", 250, 155);
    ctx.fillText("TOPLAM PROGRAM SÜRESİ", 480, 155);

    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#10b981"; // Emerald
    ctx.fillText(`${targetNet} Net Hedefi`, 70, 178);
    ctx.fillStyle = "#3b82f6"; // Blue
    ctx.fillText(`${plan.daily_hours} Saat / Gün`, 250, 178);
    ctx.fillStyle = "#a78bfa"; // Purple
    ctx.fillText(`${plan.total_days} Gün`, 480, 178);

    // Draw Phases
    let currentY = 220;
    plan.phases?.forEach((phase: any, index: number) => {
      const topicsCount = phase.focus_topics?.length || 0;
      const rows = Math.ceil(topicsCount / 2);
      const boxHeight = 70 + rows * 36;

      // Card Box background
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      drawRoundRect(ctx, 50, currentY, 700, boxHeight, 12);
      ctx.fill();
      ctx.stroke();

      // Left Accent Line
      ctx.fillStyle = index % 2 === 0 ? "#6366f1" : "#10b981";
      ctx.beginPath();
      drawRoundRect(ctx, 50, currentY, 6, boxHeight, 3);
      ctx.fill();

      // Phase Title
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${index + 1}. Aşama: ${phase.name}`, 75, currentY + 30);

      ctx.font = "600 12px sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(`Süre: ${phase.days} Gün`, 650, currentY + 30);

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.moveTo(75, currentY + 45);
      ctx.lineTo(725, currentY + 45);
      ctx.stroke();

      // Draw topics as badges
      let tx = 75;
      let ty = currentY + 70;
      phase.focus_topics?.forEach((topic: string, tIdx: number) => {
        if (tIdx > 0 && tIdx % 2 === 0) {
          tx = 75;
          ty += 36;
        }

        // Draw topic badge box
        ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.15)";
        ctx.lineWidth = 1;

        const badgeWidth = 310;
        const badgeHeight = 26;
        drawRoundRect(ctx, tx, ty - 18, badgeWidth, badgeHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Topic bullet dot
        ctx.fillStyle = index % 2 === 0 ? "#818cf8" : "#34d399";
        ctx.beginPath();
        ctx.arc(tx + 12, ty - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Topic text
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        let displayTopic = topic;
        if (displayTopic.length > 38) {
          displayTopic = displayTopic.substring(0, 35) + "...";
        }
        ctx.fillText(displayTopic, tx + 24, ty - 1);

        tx += 340;
      });

      currentY += boxHeight + 20;
    });

    // Footer Watermark
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(
      "Bu çalışma planı aydim.com yapay zeka sistemi tarafından kişiye özel oluşturulmuştur.",
      50,
      calculatedHeight - 40
    );

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `calisma-plani-${targetNet}-net.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else {
      // PDF export
      const { jsPDF } = await import("jspdf");
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`calisma-plani-${targetNet}-net.pdf`);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="header-section">
        <div>
          <h1 className="header-title">AI Çalışma Planı</h1>
          <p className="header-subtitle">
            MiniMax M3 ile hedefine ve zayıf konularına özel sprint programı oluştur.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="target-streak-banner"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
          }}
        >
          <span className="streak-icon">⚠️</span>
          <div className="streak-text">
            <strong>İşlem Başarısız</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="stat-card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Plan Özellikleri</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              Hedef Net:
            </label>
            <input
              type="number"
              value={targetNet}
              onChange={(e) => setTargetNet(Number(e.target.value))}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              Program Süresi:
            </label>
            <select
              value={duration}
              onChange={(e: any) => setDuration(e.target.value)}
              className="admin-input"
              style={{ width: "100%", background: "rgba(0,0,0,0.3)" }}
            >
              <option value="1-week">1 Haftalık Hızlı Sprint</option>
              <option value="1-month">1 Aylık Tam Program</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              Zayıf Konular (virgülle ayırın):
            </label>
            <input
              type="text"
              placeholder="Örn: Limit, Türev, Elektrik"
              value={weakTopicsText}
              onChange={(e) => setWeakTopicsText(e.target.value)}
              className="admin-input"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            * Ayda 8 adet ücretsiz ders programı hazırlama hakkınız bulunmaktadır.
          </span>
          <button onClick={handleGenerate} disabled={loading} className="admin-btn-primary">
            {loading ? "Plan Üretiliyor..." : "Plan Oluştur"}
          </button>
        </div>
      </section>

      {plan && (
        <section style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>
              {plan.total_days} Günlük Plan ({plan.daily_hours} saat/gün)
            </h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => exportPlan("png")}
                className="admin-btn-sm"
                style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}
              >
                📥 PNG İndir
              </button>
              <button
                onClick={() => exportPlan("pdf")}
                className="admin-btn-sm"
                style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}
              >
                📄 PDF İndir
              </button>
            </div>
          </div>

          <div className="exam-list">
            {plan.phases?.map((phase: any, i: number) => (
              <div
                key={i}
                className="stat-card"
                style={{
                  marginBottom: 12,
                  borderLeft: `4px solid ${i % 2 === 0 ? "#6366f1" : "#10b981"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{phase.name}</h3>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {phase.days} Gün
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {phase.focus_topics?.map((t: string, j: number) => (
                    <span key={j} className="topic-badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
