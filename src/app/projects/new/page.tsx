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

    const res = await fetch("/api/ai/requirements", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const json = await res.json();

    // 仮：localStorageに保存
    localStorage.setItem("spec", JSON.stringify(json));

    setLoading(false);

    router.push("/projects/1");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">要件入力</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input {...register("title")} placeholder="プロジェクト名" className="border p-2 w-full" />

        <textarea {...register("description")} placeholder="やりたいこと" className="border p-2 w-full h-32" />

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          {loading ? "生成中..." : "AIで要件整理"}
        </button>
      </form>
    </div>
  );
}