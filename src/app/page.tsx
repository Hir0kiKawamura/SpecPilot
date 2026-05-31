// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("projects") || "{}";
    const projectsObj = JSON.parse(stored);
    const projectsList = Object.values(projectsObj) as Project[];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(projectsList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, []);

  const deleteProject = (id: string) => {
    if (confirm("このプロジェクトを削除しますか？")) {
      const projects = JSON.parse(localStorage.getItem("projects") || "{}");
      delete projects[id];
      localStorage.setItem("projects", JSON.stringify(projects));
      setProjects(projects => projects.filter(p => p.id !== id));
    }
  };

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

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">プロジェクトがありません</p>
          <Link
            href="/projects/new"
            className="inline-block bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600"
          >
            最初のプロジェクトを作成
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded p-4 bg-white hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-blue-600 hover:underline cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {project.title}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(project.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    開く
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}