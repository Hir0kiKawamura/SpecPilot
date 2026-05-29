// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">SpecPilot</h1>

      <Link
        href="/projects/new"
        className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
      >
        新規プロジェクト作成
      </Link>
    </main>
  );
}