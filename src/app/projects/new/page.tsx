// src/app/projects/new/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormValues = {
  title: string;
  description: string;
};

export default function NewProjectPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      // 1. 要件生成APIを呼び出し
      const res = await fetch("/api/ai/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to generate requirements");
      }

      const requirements = await res.json();

      // 2. プロジェクトIDを生成
      const projectId = crypto.randomUUID();

      // 3. localStorageに保存
      const projects = JSON.parse(localStorage.getItem("projects") || "{}");
      projects[projectId] = {
        id: projectId,
        title: data.title,
        description: data.description,
        requirements,
        tests: null,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("projects", JSON.stringify(projects));

      // 4. リダイレクト
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">要件入力</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input
          {...register("title", { required: true })}
          placeholder="プロジェクト名"
          className="border p-2 w-full"
        />

        <textarea
          {...register("description", { required: true })}
          placeholder="やりたいこと"
          className="border p-2 w-full h-32"
        />

        <button
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "生成中..." : "AIで要件整理"}
        </button>
      </form>
    </div>
  );
}