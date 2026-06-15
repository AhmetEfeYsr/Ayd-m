"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface UserButtonProps {
  placement?: "up" | "down";
}

export default function UserButton({ placement = "down" }: UserButtonProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || user.email[0].toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push("/sign-in");
  };

  return (
    <div className="user-button-container" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(99, 102, 241, 0.4)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 0 15px rgba(99, 102, 241, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 0 10px rgba(99, 102, 241, 0.4)";
        }}
      >
        {initials}
      </button>

      {isOpen && (
        <div
          className="user-dropdown-menu"
          style={{
            position: "absolute",
            ...(placement === "up" 
              ? { bottom: "calc(100% + 12px)" }
              : { top: "calc(100% + 12px)" }),
            right: 0,
            width: 220,
            background: "var(--panel-bg, rgba(24, 24, 27, 0.85))",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: 12,
            padding: 16,
            boxShadow: "var(--glass-shadow, 0 10px 30px rgba(0, 0, 0, 0.5))",
            backdropFilter: "blur(16px)",
            zIndex: 100,
            animation: "fadeUp 0.2s ease-out forwards",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #fff)" }}>
              {user.firstName || user.lastName 
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                : "Kullanıcı"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary, #a1a1aa)", wordBreak: "break-all" }}>
              {user.email}
            </span>
            <div style={{ marginTop: 4 }}>
              <span 
                className="role-badge"
                style={{
                  fontSize: 10,
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#818cf8",
                  padding: "2px 8px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {user.role}
              </span>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))" }} />

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s ease, transform 0.1s ease",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
          >
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
