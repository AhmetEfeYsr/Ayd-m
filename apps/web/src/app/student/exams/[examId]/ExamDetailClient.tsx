"use client";

import React, { useEffect, useState } from "react";
import * as Comlink from "comlink";
import { parseOMR } from "@/lib/omrParser";

interface Props {
  examName: string;
  examType: string;
  examDate: Date | null;
  answerKeyString: string | null;
  netScore: number | null;
  presignedUrl: string;
}

export default function ExamDetailClient({
  examName,
  examType,
  examDate,
  answerKeyString,
  netScore,
  presignedUrl
}: Props) {
  const [decryptedAnswer, setDecryptedAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let worker: Worker | null = null;

    async function decryptResults() {
      try {
        const privateKeyPem = sessionStorage.getItem("decryptedPrivateKey");
        if (!privateKeyPem) {
          setError("Anahtar kilidi açılmadı. Lütfen paneli yenileyin ve şifrenizi girerek kilidi açın.");
          setLoading(false);
          return;
        }

        // Fetch buffer directly from Cloudflare R2 via presigned URL (zero serverless bandwidth and execution costs!)
        const res = await fetch(presignedUrl);
        if (!res.ok) throw new Error("Sınav sonucu R2 dosya indirme hatası.");
        const buffer = await res.arrayBuffer();

        // Instantiate Web Worker
        worker = new Worker(
          new URL("../../../../workers/student-dashboard.worker.ts", import.meta.url),
          { type: "module" }
        );
        const calculator = Comlink.wrap<any>(worker);

        // Decrypt inside the Web Worker to avoid blocking UI thread
        const decryptedJson = await calculator.decryptOMRWithPrivateKey(
          privateKeyPem,
          Comlink.transfer(buffer, [buffer])
        );
        
        const parsed = JSON.parse(decryptedJson);
        setDecryptedAnswer(parsed.answerString || parsed.answerKeyString || "");
      } catch (err: any) {
        console.error("OMR decryption client error:", err);
        setError("Sınav sonucu şifresi çözülemedi. (Şifreniz yanlış olabilir veya veri bozuktur.)");
      } finally {
        setLoading(false);
      }
    }

    decryptResults();

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, [presignedUrl]);

  const subjectBreakdown = parseOMR(decryptedAnswer || "", answerKeyString || "", examType);

  return (
    <div className="dashboard-wrapper">
      <header className="header-section">
        <div>
          <h1 className="header-title">{examName}</h1>
          <p className="header-subtitle">
            {examType} • {examDate ? new Date(examDate).toLocaleDateString("tr-TR") : "Tarih belirtilmemiş"}
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Senin Netin</span>
          <div className="stat-value text-green">{netScore !== null ? netScore.toFixed(1) : "—"}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cevap Dizisi</span>
          <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", color: "var(--text-secondary)", minHeight: 24 }}>
            {loading ? "Şifre Çözülüyor (Web Worker)..." : (error ? error : decryptedAnswer || "Cevap yok")}
          </div>
        </div>
      </section>

      {answerKeyString && (
        <section style={{ marginTop: 24 }}>
          <h2 className="section-title">Cevap Anahtarı</h2>
          <div className="stat-card" style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>
            {answerKeyString}
          </div>
        </section>
      )}

      {!loading && !error && subjectBreakdown && (
        <section style={{ marginTop: 24 }}>
          <h2 className="section-title">Ders Bazlı Analiz</h2>
          <div className="admin-table-wrapper stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Doğru</th>
                  <th>Yanlış</th>
                  <th>Boş</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {subjectBreakdown.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: "#10b981" }}>{s.correct}</td>
                    <td style={{ color: "#ef4444" }}>{s.incorrect}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{s.blank}</td>
                    <td><strong>{s.net.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
