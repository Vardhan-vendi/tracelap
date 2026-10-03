import React, { useState, useEffect } from "react";

interface OpeningSplashProps {
  onComplete?: () => void;
}

export const OpeningSplash: React.FC<OpeningSplashProps> = ({ onComplete }) => {
  // logoOpacity controls the logo's smooth fade-in
  const [logoOpacity, setLogoOpacity] = useState(false);
  // isExiting controls the fade-out of the entire overlay after 8-9 seconds
  const [isExiting, setIsExiting] = useState(false);
  // isDone unmounts the splash component completely
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // 1. Immediately trigger logo opacity fade-in
    const fadeInTimer = setTimeout(() => {
      setLogoOpacity(true);
    }, 60);

    // 2. Start fade-out exit at 8.0 seconds (effect lasts 8 to 10 seconds)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 5000);

    // 3. Complete and unmount after fade-out transition finishes at ~9.5 seconds
    const doneTimer = setTimeout(() => {
      setIsDone(true);
      onComplete?.();
    }, 7500);

    // Optional user dismiss via click or Escape key
    const handleDismiss = () => {
      setIsDone(true);
      onComplete?.();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onComplete]);

  if (isDone) return null;

  return (
    <div
      onClick={() => {
        setIsDone(true);
        onComplete?.();
      }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 select-none cursor-pointer transition-opacity duration-1000 ease-in-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Soft ambient halo behind the logo */}
      <div
        className={`absolute w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none transition-opacity duration-1000 ${
          logoOpacity && !isExiting ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Just Logo Only — Smooth Opacity Transition Effect */}
      <div className="relative flex items-center justify-center">
        <img
          src="/logo.png"
          alt="TraceLap Logo"
          className={`h-20 sm:h-24 md:h-28 w-auto object-contain drop-shadow-[0_0_35px_rgba(56,189,248,0.3)] transition-all duration-[2000ms] ease-out ${
            logoOpacity && !isExiting
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
        />
      </div>
    </div>
  );
};
