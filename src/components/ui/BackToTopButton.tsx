"use client";

import { useEffect, useState } from "react";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="ページトップへ戻る"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      ↑ 上へ
    </button>
  );
}
