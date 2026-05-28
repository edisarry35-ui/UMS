import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TESDALogoSplash.css";

export default function TESDALogoSplash() {
  const navigate = useNavigate();
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const textTimer = setTimeout(() => {
      setShowText(true);
    }, 1500);

    const navigationTimer = setTimeout(() => {
      navigate("/landing");
    }, 5000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <div className="tesda-splash-container">
      <div className="tesda-splash-content">
        <div className="splash-background">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>

        <div className="logo-wrapper">
          <div className="logo-sparkles">
            <span className="sparkle sparkle-1"></span>
            <span className="sparkle sparkle-2"></span>
            <span className="sparkle sparkle-3"></span>
          </div>
          <svg viewBox="0 0 320 320" className="brand-logo" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5ba5ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#00286d" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0049b7" />
                <stop offset="100%" stopColor="#0075ff" />
              </linearGradient>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c20000" />
                <stop offset="100%" stopColor="#ff2a35" />
              </linearGradient>
              <path id="topTextPath" d="M96 156 A64 64 0 0 1 224 156" fill="none" />
              <path id="bottomTextPath" d="M224 168 A64 64 0 0 1 96 168" fill="none" />
            </defs>

            <circle cx="160" cy="160" r="108" fill="url(#logoGlow)" opacity="0.85" />
            <g className="outer-gear">
              <circle cx="160" cy="160" r="108" fill="#0b1a39" />
              {[...Array(12)].map((_, i) => {
                const angle = (i * 360) / 12;
                return (
                  <rect
                    key={i}
                    x="154"
                    y="18"
                    width="12"
                    height="30"
                    rx="4"
                    fill="#1672ff"
                    transform={`rotate(${angle} 160 160)`}
                  />
                );
              })}
              <circle cx="160" cy="160" r="92" fill="none" stroke="url(#blueGradient)" strokeWidth="12" />
              <circle cx="160" cy="160" r="24" fill="#0075ff" opacity="0.9" />
              <circle cx="160" cy="160" r="14" fill="#ffffff" opacity="0.9" />
            </g>

            <g className="badge-group">
              <circle cx="160" cy="160" r="70" fill="#ffffff" stroke="#00286d" strokeWidth="12" />
              <path d="M160 100 L122 160 L160 220 L198 160 Z" fill="url(#redGradient)" />
              <path
                d="M132 120 L160 176 L188 120"
                fill="none"
                stroke="#fff"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M116 112 L160 70 L204 112"
                fill="none"
                stroke="#fff"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M160 82 L148 118 L160 118 L172 118 Z"
                fill="#00286d"
              />
            </g>

            <g className="badge-text-group">
              <text fontFamily="Arial, sans-serif" fontSize="14" fill="#ffffff" fontWeight="800" stroke="#00286d" strokeWidth="0.8">
                <textPath href="#topTextPath" startOffset="50%" textAnchor="middle">ACLC</textPath>
              </text>
              <text fontFamily="Arial, sans-serif" fontSize="12" fill="#ffffff" fontWeight="700" stroke="#00286d" strokeWidth="0.6">
                <textPath href="#bottomTextPath" startOffset="50%" textAnchor="middle">ORMOC CITY</textPath>
              </text>
            </g>

            <g className="book-group">
              <path
                d="M98 220 C118 210 142 206 160 208 C178 206 202 210 222 220 C226 222 226 228 222 230 C202 240 178 246 160 246 C142 246 118 240 98 230 C94 228 94 222 98 220 Z"
                fill="#eef4ff"
              />
              <path
                d="M160 208 C190 210 218 217 222 220 C228 224 224 236 218 238 C198 248 172 252 160 252"
                fill="#d8e8ff"
              />
              <path
                d="M160 208 C130 210 102 217 98 220 C92 224 96 236 102 238 C122 248 148 252 160 252"
                fill="#d8e8ff"
              />
              <path
                d="M98 220 C118 214 142 210 160 212 C178 210 202 214 222 220"
                fill="none"
                stroke="#00286d"
                strokeWidth="4"
              />
            </g>

            <path
              className="tesda-banner"
              d="M88 260 C120 242 200 242 232 260 L228 269 C196 252 124 252 92 269 Z"
              fill="#00286d"
              stroke="#ffffff"
              strokeWidth="4"
            />
            <text className="banner-text" textAnchor="middle" x="160" y="266" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="900">
              TESDA
            </text>
            <path d="M100 268 L220 268" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
          </svg>
        </div>

        <div className={`splash-text ${showText ? "visible" : ""}`}>
          <h1>UMS</h1>
          <p>UAQTEA MANAGEMENT SYSTEM</p>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
}
