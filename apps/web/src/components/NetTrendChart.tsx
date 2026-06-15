"use client";

import React from "react";

export default function NetTrendChart({ data }: { data: { name: string; score: number }[] }) {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(120, ...data.map((d) => d.score));
  const minScore = 0;
  
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (index: number) => paddingX + (index * (width - 2 * paddingX)) / Math.max(1, data.length - 1);
  const getY = (score: number) => height - paddingY - ((score - minScore) / (maxScore - minScore)) * (height - 2 * paddingY);

  const points = data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(" ");

  return (
    <div className="stat-card" style={{ width: "100%", overflowX: "auto" }}>
      <h3 className="section-title">Net Trendi</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 400 }}>
        {/* Grid Lines */}
        {[0, 40, 80, 120].map((line) => (
          <g key={line}>
            <text x={0} y={getY(line)} fill="var(--text-secondary)" fontSize="10" dy="4">
              {line}
            </text>
            <line
              x1={paddingX}
              y1={getY(line)}
              x2={width - paddingX}
              y2={getY(line)}
              stroke="var(--border-color)"
              strokeDasharray="4 4"
            />
          </g>
        ))}

        {/* Line */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />

        {/* Points & Labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.score)} r="4" fill="#10b981" />
            <text x={getX(i)} y={height - 2} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
              {d.name.length > 8 ? d.name.substring(0, 8) + ".." : d.name}
            </text>
            <text x={getX(i)} y={getY(d.score) - 10} fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">
              {d.score.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
