import Link from "next/link";
import { ProjectListClient } from "@/components/ProjectListClient";

export default function Home() {
  return (
    <main className="p-6">
      <div className="flex justify-end items-center mb-6">
        <Link
          href="/projects/new"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + 新規プロジェクト
        </Link>
      </div>

      <ProjectListClient />
    </main>
  );
}
