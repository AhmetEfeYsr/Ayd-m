"use client";
import { useState } from "react";

export interface FilterCriteria {
  examType: string;        // '', 'TYT', 'AYT_SAY', 'AYT_EA', 'AYT_SOZ'
  minNet: string;          // e.g. '80'
  maxNet: string;          // e.g. '100'
  classId: string;         // specific class filter
  attendanceStatus: string;// '', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
  minCapacity: string;     // classroom min capacity
  maxCapacity: string;     // classroom max capacity
  dateFrom: string;        // ISO date string
  dateTo: string;          // ISO date string
  customQuery: string;     // free text search
}

export const EMPTY_FILTER: FilterCriteria = {
  examType: "",
  minNet: "",
  maxNet: "",
  classId: "",
  attendanceStatus: "",
  minCapacity: "",
  maxCapacity: "",
  dateFrom: "",
  dateTo: "",
  customQuery: "",
};

interface FilterPanelProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  onApply: () => void;
  onReset: () => void;
  showExamType?: boolean;
  showNetRange?: boolean;
  showClassFilter?: boolean;
  showAttendance?: boolean;
  showCapacity?: boolean;
  showDateRange?: boolean;
  showSearch?: boolean;
  classes?: { id: string; name: string }[];
  extraActions?: React.ReactNode;
}

export default function FilterPanel({
  filters,
  onChange,
  onApply,
  onReset,
  showExamType = false,
  showNetRange = false,
  showClassFilter = false,
  showAttendance = false,
  showCapacity = false,
  showDateRange = false,
  showSearch = false,
  classes = [],
  extraActions,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof FilterCriteria, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className="stat-card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            🔍 Adaptif Filtreler
          </h2>
          {activeCount > 0 && (
            <span className="topic-badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
              {activeCount} aktif
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {extraActions}
          <button
            className="admin-btn-sm"
            onClick={() => setExpanded(!expanded)}
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {expanded ? "▲ Gizle" : "▼ Filtrele"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div className="admin-form-row" style={{ flexWrap: "wrap", gap: 12 }}>
            {showExamType && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Sınav Türü
                </label>
                <select
                  className="admin-input"
                  value={filters.examType}
                  onChange={(e) => update("examType", e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  <option value="">Tümü</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT_SAY">AYT Sayısal</option>
                  <option value="AYT_EA">AYT EA</option>
                  <option value="AYT_SOZ">AYT Sözel</option>
                </select>
              </div>
            )}

            {showNetRange && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Min Net
                  </label>
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Örn: 80"
                    value={filters.minNet}
                    onChange={(e) => update("minNet", e.target.value)}
                    style={{ width: 100 }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Max Net
                  </label>
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Örn: 120"
                    value={filters.maxNet}
                    onChange={(e) => update("maxNet", e.target.value)}
                    style={{ width: 100 }}
                  />
                </div>
              </>
            )}

            {showCapacity && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Min Kapasite
                  </label>
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Örn: 6"
                    value={filters.minCapacity}
                    onChange={(e) => update("minCapacity", e.target.value)}
                    style={{ width: 100 }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Max Kapasite
                  </label>
                  <input
                    className="admin-input"
                    type="number"
                    placeholder="Örn: 30"
                    value={filters.maxCapacity}
                    onChange={(e) => update("maxCapacity", e.target.value)}
                    style={{ width: 100 }}
                  />
                </div>
              </>
            )}

            {showClassFilter && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Sınıf
                </label>
                <select
                  className="admin-input"
                  value={filters.classId}
                  onChange={(e) => update("classId", e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  <option value="">Tümü</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {showAttendance && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Yoklama Durumu
                </label>
                <select
                  className="admin-input"
                  value={filters.attendanceStatus}
                  onChange={(e) => update("attendanceStatus", e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  <option value="">Tümü</option>
                  <option value="PRESENT">Katıldı</option>
                  <option value="ABSENT">Gelmedi</option>
                  <option value="LATE">Geç Geldi</option>
                  <option value="EXCUSED">Mazeretli</option>
                </select>
              </div>
            )}

            {showDateRange && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Başlangıç Tarihi
                  </label>
                  <input
                    className="admin-input"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => update("dateFrom", e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Bitiş Tarihi
                  </label>
                  <input
                    className="admin-input"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => update("dateTo", e.target.value)}
                  />
                </div>
              </>
            )}

            {showSearch && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Arama
                </label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Ad, e-posta, ID..."
                  value={filters.customQuery}
                  onChange={(e) => update("customQuery", e.target.value)}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="admin-btn-primary" onClick={onApply}>
              Uygula
            </button>
            <button
              className="admin-btn-sm"
              onClick={onReset}
              style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}
            >
              Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
