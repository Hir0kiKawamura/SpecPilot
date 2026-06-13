// src/app/projects/new/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  isRequirementsResponse,
  type RequirementsResponse,
} from "@/lib/ai-validation";
import { GenerationLoading } from "@/components/ui/GenerationLoading";
import { getClientErrorMessage } from "@/lib/api-error";
import { getProjectRepository } from "@/lib/project-repository";
import type { Project } from "@/lib/project-types";

type FormValues = {
  title: string;
  description: string;
};

export default function NewProjectPage() {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormValues>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. 要件生成APIを呼び出し
      const res = await fetch("/api/ai/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(
          await getClientErrorMessage(
            res,
            "要件整理に失敗しました。時間をおいてもう一度お試しください。",
          ),
        );
      }

      const requirements = (await res.json()) as unknown;

      if (!isRequirementsResponse(requirements)) {
        throw new Error(
          "AIの要件整理結果が想定形式ではありませんでした。入力内容を調整して再実行してください。",
        );
      }

      // 2. プロジェクトIDを生成
      const projectId = crypto.randomUUID();

      // 3. IndexedDBに保存
      const repository = getProjectRepository();
      const project: Project = {
        id: projectId,
        title: data.title,
        description: data.description,
        requirements: requirements satisfies RequirementsResponse,
        tests: null,
        createdAt: new Date().toISOString(),
      };
      await repository.put(project);

      // 4. リダイレクト
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "要件整理または保存に失敗しました。入力内容を確認してもう一度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">要件入力</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {loading && (
          <GenerationLoading
            title="AIで要件を整理しています"
            messages={[
              "入力内容を読み取っています...",
              "要件を構造化しています...",
              "受入基準を整理しています...",
              "プロジェクトを保存しています...",
            ]}
          />
        )}

        {errorMessage && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium">
            プロジェクト名
          </label>
          <input
            id="title"
            disabled={loading}
            {...register("title", {
              required: "プロジェクト名を入力してください",
            })}
            placeholder="例: 予約管理アプリ"
            className="border p-2 w-full disabled:bg-gray-100"
            aria-invalid={errors.title ? "true" : "false"}
          />
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium">
            やりたいこと
          </label>
          <textarea
            id="description"
            disabled={loading}
            {...register("description", {
              required: "やりたいことを入力してください",
            })}
            placeholder="例: ユーザーが空き時間を確認して予約できるようにしたい"
            className="border p-2 w-full h-32 disabled:bg-gray-100"
            aria-invalid={errors.description ? "true" : "false"}
          />
          {errors.description && (
            <p className="text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <button
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "生成しています..." : "AIで要件整理"}
        </button>
      </form>
    </div>
  );
}
