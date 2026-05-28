import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TESDALogoSplash.css";

export default function TESDALogoSplash() {
  const navigate = useNavigate();
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Show subtitle text after 1.5 seconds
    const textTimer = setTimeout(() => {
      setShowText(true);
    }, 1500);

    // Navigate to main landing page after 5 seconds
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
        {/* Animated background circles */}
        <div className="splash-background">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>

        {/* Logo with animations */}
        <div className="logo-wrapper">
          <svg
            viewBox="0 0 220 220"
            className="tesda-logo"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer gear ring with teeth */}
            <g className="outer-gear">
              <circle cx="110" cy="110" r="95" fill="none" stroke="#0026b3" strokeWidth="10" />
              {[...Array(17)].map((_, i) => {
                const angle = (i * 360) / 17;
                return (
                  <rect
                    key={i}
                    x="104"
                    y="15"
                    width="12"
                    height="20"
                    fill="#0026b3"
                    transform={`rotate(${angle} 110 110)`}
                    rx="2"
                  />
                );
              })}
            </g>

            {/* Center human/training symbol */}
            <g className="inner-shapes" transform="translate(0 0)">
              <circle cx="110" cy="80" r="18" fill="#0026b3" />
              <path
                d="M110 100 L110 160"
                stroke="#0026b3"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M110 120 L80 150"
                stroke="#0026b3"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M110 120 L140 150"
                stroke="#0026b3"
                strokeWidth="18"
                strokeLinecap="round"
              />
            </g>

            {/* Inner ring */}
            <circle cx="110" cy="110" r="70" fill="none" stroke="#0026b3" strokeWidth="8" />
          </svg>
        </div>

        {/* Text */}
        <div className={`splash-text ${showText ? "visible" : ""}`}>
          <h1>TESDA</h1>
          <p>Technical Education and Skills Development Authority</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-container">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
}
