"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getProjectRepository } from "@/lib/project-repository";
import { createSampleProject } from "@/lib/sample-project";
import type { ProjectSummary } from "@/lib/project-types";

export function ProjectListClient() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const repository = getProjectRepository();
        const projectList = await repository.list();
        setProjects(projectList);
      } catch (err) {
        console.error(err);
        setError("プロジェクト一覧の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const deleteProject = async (project: ProjectSummary) => {
    try {
      const repository = getProjectRepository();
      await repository.delete(project.id);
      setProjects((currentProjects) =>
        currentProjects.filter((currentProject) => currentProject.id !== project.id),
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError("プロジェクトの削除に失敗しました");
    }
  };

  const createSample = async () => {
    try {
      const repository = getProjectRepository();
      const sampleProject = createSampleProject();
      await repository.put(sampleProject);
      router.push(`/projects/${sampleProject.id}`);
    } catch (err) {
      console.error(err);
      setError("サンプルプロジェクトの作成に失敗しました");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
      {deleteTarget && (
        <ConfirmDialog
          title="プロジェクトを削除しますか？"
          description={`「${deleteTarget.title}」を削除します。この操作は取り消せません。`}
          confirmLabel="削除"
          destructive
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteProject(deleteTarget)}
        />
      )}

      {projects.length === 0 ? (
        <div className="mx-auto max-w-xl rounded border bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">
            プロジェクトがありません
          </p>
          <p className="mt-2 text-sm text-gray-600">
            要件を入力してAIで整理するか、サンプルプロジェクトで動作を確認できます。
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/projects/new"
              className="inline-block rounded bg-blue-500 px-6 py-3 text-white hover:bg-blue-600"
            >
              新規プロジェクトを作成
            </Link>
            <button
              onClick={createSample}
              className="inline-block rounded bg-gray-700 px-6 py-3 text-white hover:bg-gray-800"
            >
              サンプルを見る
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded p-4 bg-white hover:shadow-lg transition"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2
                    className="text-lg font-bold text-blue-600 hover:underline cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {project.title}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {project.description}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(project.createdAt).toLocaleString("ja-JP")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                      現在 {project.currentVersionLabel}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
                      要件 {project.requirementsCount}件
                    </span>
                    <span className="rounded bg-green-50 px-2 py-1 text-green-700">
                      テスト {project.testCasesCount}件
                    </span>
                    {project.hasDraft && (
                      <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                        下書きあり
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 sm:ml-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    編集
                  </Link>
                  {project.hasSavedVersion ? (
                    <Link
                      href={`/projects/${project.id}?view=compare`}
                      className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-800"
                    >
                      最新と比較
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded bg-gray-200 px-3 py-1 text-sm text-gray-500"
                      title="保存済みバージョンがありません"
                    >
                      最新と比較
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(project)}
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
    </>
  );
}
