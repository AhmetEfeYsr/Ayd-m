"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title="Temayı Değiştir"
      style={{
        background: "transparent",
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        transition: "background 0.2s, color 0.2s"
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "rgba(128, 128, 128, 0.1)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {theme === "dark" ? "🌙 Karanlık" : "☀️ Açık"}
    </button>
  );
}
