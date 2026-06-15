"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";

interface BrandLogoProps {
  width?: number;
  height?: number;
}

export default function BrandLogo({ width = 32, height = 32 }: BrandLogoProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const circleColor = isDark ? "url(#gradDark)" : "url(#gradLight)";
  const textColor = isDark ? "#ffffff" : "#0f172a";
  const pathColor = isDark ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,1)";

  return (
    <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradDark" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="gradLight" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity={isDark ? "0.3" : "0.15"} />
        </filter>
      </defs>
      
      <circle cx="50" cy="50" r="46" fill={circleColor} filter="url(#shadow)" />
      
      <path 
        d="M35 30H65C67.7614 30 70 32.2386 70 35V65C70 67.7614 67.7614 70 65 70H35C32.2386 70 30 67.7614 30 65V35C30 32.2386 32.2386 30 35 30Z" 
        fill="white" 
        fillOpacity="0.2" 
      />
      <path 
        d="M42 52L48 58L62 42" 
        stroke={pathColor} 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      <circle cx="42" cy="38" r="3" fill={pathColor} />
      <circle cx="50" cy="38" r="3" fill={pathColor} />
      <circle cx="58" cy="38" r="3" fill={pathColor} fillOpacity="0.5" />
    </svg>
  );
}
