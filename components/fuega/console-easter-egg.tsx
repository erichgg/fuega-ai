"use client";

import { useEffect } from "react";

export function ConsoleEasterEgg() {
  useEffect(() => {
    const art = `
%c🔥 fuega.ai 🔥
%c
   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║   🔥  F U E G A . A I  🔥            ║
   ║                                       ║
   ║   You're inspecting the source?       ║
   ║   I like you already.                 ║
   ║                                       ║
   ║   Try the Konami Code on the page.    ║
   ║   ↑ ↑ ↓ ↓ ← → ← → B A              ║
   ║                                       ║
   ╚═══════════════════════════════════════╝
`;
    console.log(
      art,
      "font-size: 20px; color: #FF6B2C; font-weight: bold;",
      "color: #00D4AA; font-family: monospace; font-size: 12px;"
    );
  }, []);

  return null;
}
