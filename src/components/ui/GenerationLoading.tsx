"use client";

import { useEffect, useState } from "react";

type GenerationLoadingProps = {
  title: string;
  messages: string[];
};

export function GenerationLoading({ title, messages }: GenerationLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessageIndex((currentIndex) => (currentIndex + 1) % messages.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [messages.length]);

  return (
    <div
      className="rounded border border-blue-100 bg-blue-50 p-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-blue-950">{title}</p>
          <p className="mt-1 text-sm text-blue-700">
            {messages[messageIndex] ?? messages[0]}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div className="generation-loading-bar h-full rounded-full bg-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
