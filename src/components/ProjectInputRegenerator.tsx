"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ProjectInputRegeneratorProps = {
  initialTitle: string;
  initialDescription: string;
  loading: boolean;
  errorMessage: string | null;
  onRegenerate: (input: {
    title: string;
    description: string;
  }) => Promise<void> | void;
};

export function ProjectInputRegenerator({
  initialTitle,
  initialDescription,
  loading,
  errorMessage,
  onRegenerate,
}: ProjectInputRegeneratorProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="mb-6 rounded border bg-white p-4 shadow-sm">
      {confirmOpen && (
        <ConfirmDialog
          title="要件とテストケースを再生成しますか？"
          description="最初の入力を変更すると、要件定義と現在のテストケースを再生成します。保存済みバージョンは残りますが、現在の下書きは置き換えられます。"
          confirmLabel="再生成する"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            void onRegenerate({
              title: title.trim(),
              description: description.trim(),
            });
          }}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">最初の入力</p>
          <p className="mt-1 text-sm text-gray-600">
            プロジェクト名や説明を変更して、要件定義とテストケースを再生成できます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {expanded ? "閉じる" : "入力を編集して再生成"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {errorMessage && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="regenerate-title" className="text-sm font-medium">
              プロジェクト名
            </label>
            <input
              id="regenerate-title"
              value={title}
              disabled={loading}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded border px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="regenerate-description"
              className="text-sm font-medium"
            >
              やりたいこと
            </label>
            <textarea
              id="regenerate-description"
              value={description}
              disabled={loading}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 w-full rounded border px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <button
          type="button"
          disabled={loading || !canSubmit}
            onClick={() => setConfirmOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "再生成中..." : "要件とテストを再生成"}
          </button>
        </div>
      )}
    </div>
  );
}
