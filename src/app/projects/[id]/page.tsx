// src/app/projects/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function ProjectDetail() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("spec");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setData(JSON.parse(saved));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">要件結果</h1>

      <pre className="bg-gray-100 p-4 text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}