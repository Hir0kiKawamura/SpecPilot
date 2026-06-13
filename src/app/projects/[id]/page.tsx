// src/app/projects/[id]/page.tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProjectInputRegenerator } from "@/components/ProjectInputRegenerator";
import { RequirementManager } from "@/components/RequirementManager";
import { VersionManager } from "@/components/VersionManager";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { GenerationLoading } from "@/components/ui/GenerationLoading";
import { TestCaseTable } from "@/components/ui/TestCaseTable";
import type { TestCase } from "@/components/ui/TestCaseTable";
import { getClientErrorMessage } from "@/lib/api-error";
import { getProjectRepository } from "@/lib/project-repository";
import type {
  GeneratedTestCase,
  Requirement,
  RequirementsResponse,
  TestsResponse,
} from "@/lib/ai-validation";
import { isRequirementsResponse } from "@/lib/ai-validation";
import type { Project, ProjectVersion, TestData } from "@/lib/project-types";

type GenerateMode = "initial" | "regenerate";
type ProjectView = "edit" | "compare";

type GenerationResult = {
  requirementsCount: number;
  testCasesCount: number;
  mode: GenerateMode;
};

const getProjectVersionKey = (version: ProjectVersion): string =>
  `${version.major}-${version.minor}-${version.savedAt}`;

const normalizeTestCase = (
  testCase: GeneratedTestCase,
  index: number,
): TestCase => ({
  id: crypto.randomUUID?.() ?? String(index),
  title: testCase.title,
  precondition: testCase.precondition,
  steps: Array.isArray(testCase.steps) ? testCase.steps : [testCase.steps],
  expected: testCase.expected,
  type: testCase.type,
});

const normalizeGeneratedTests = (tests: TestsResponse): TestData => ({
  tests: tests.tests.map((group) => ({
    cases: group.cases.map(normalizeTestCase),
  })),
});

const markRequirementsReady = (
  requirements: RequirementsResponse,
): RequirementsResponse => ({
  requirements: requirements.requirements.map((requirement, index) => ({
    ...requirement,
    id: requirement.id || `REQ-${String(index + 1).padStart(3, "0")}`,
    status: "ready",
  })),
});

const hasRequirementChanges = (requirements: Requirement[]) =>
  requirements.some(
    (requirement) =>
      requirement.status === "draft" || requirement.status === "changed",
  );

export default function ProjectDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const initialView: ProjectView =
    searchParams.get("view") === "compare" ? "compare" : "edit";

  const [project, setProject] = useState<Project | null>(null);
  const [tests, setTests] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<GenerationResult | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(
    null,
  );
  const [requirementsViewKey, setRequirementsViewKey] = useState(0);
  const [activeView, setActiveView] = useState<ProjectView>(initialView);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [compareVersionsOpen, setCompareVersionsOpen] = useState(true);
  const [selectedCompareVersionKey, setSelectedCompareVersionKey] =
    useState("");
  const [topSaveStatus, setTopSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // 2. テスト生成
  const generateTests = useCallback(async (
    proj: Project,
    mode: GenerateMode = "initial",
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proj.requirements),
      });

      if (!res.ok) {
        throw new Error(
          await getClientErrorMessage(
            res,
            "テストケース生成に失敗しました。時間をおいてもう一度お試しください。",
          ),
        );
      }

      const generatedTests = (await res.json()) as TestsResponse;
      const testsData = normalizeGeneratedTests(generatedTests);
      const testCasesCount = testsData.tests.reduce(
        (count, group) => count + group.cases.length,
        0,
      );
      setTests(testsData);
      setGenerationResult({
        requirementsCount: proj.requirements.requirements.length,
        testCasesCount,
        mode,
      });

      // IndexedDBに保存および初回バージョン(v1)として登録
      const repository = getProjectRepository();
      const currentProject = await repository.get(projectId);

      if (!currentProject) {
        throw new Error("Project not found");
      }

      const versions = currentProject.versions || [];
      const hasSavedVersion = versions.length > 0;
      const shouldCreateInitialVersion = mode === "initial" && !hasSavedVersion;
      const readyRequirements = markRequirementsReady(
        currentProject.requirements,
      );
      const updatedProject: Project = shouldCreateInitialVersion
        ? {
            ...currentProject,
            requirements: readyRequirements,
            versions: [
              {
                major: 1,
                minor: 0,
                label: "v1",
                data: testsData,
                requirements: readyRequirements,
                savedAt: new Date().toISOString(),
              },
            ],
            tests: testsData,
            draft: undefined,
          }
        : {
            ...currentProject,
            requirements: readyRequirements,
            draft: {
              major: hasSavedVersion
                ? Math.max(...versions.map((version) => version.major))
                : 0,
              minor: (currentProject.draft?.minor || 0) + 1,
              data: testsData,
              updatedAt: new Date().toISOString(),
            },
          };

      await repository.put(updatedProject);
      setProject(updatedProject);
      setRequirementsViewKey((currentKey) => currentKey + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "テスト生成に失敗しました",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleRequirementsChange = useCallback(async (
    nextRequirements: RequirementsResponse,
  ) => {
    const repository = getProjectRepository();
    const currentProject = await repository.get(projectId);

    if (!currentProject) {
      setError("プロジェクトが見つかりません");
      return;
    }

    const updatedProject: Project = {
      ...currentProject,
      requirements: nextRequirements,
    };

    await repository.put(updatedProject);
    setProject(updatedProject);
    setGenerationResult(null);
  }, [projectId]);

  const regenerateRequirementsFromInput = useCallback(async (input: {
    title: string;
    description: string;
  }) => {
    setRequirementsLoading(true);
    setRequirementsError(null);

    try {
      const res = await fetch("/api/ai/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        throw new Error(
          await getClientErrorMessage(
            res,
            "要件定義の再生成に失敗しました。時間をおいてもう一度お試しください。",
          ),
        );
      }

      const generatedRequirements = (await res.json()) as unknown;

      if (!isRequirementsResponse(generatedRequirements)) {
        throw new Error(
          "AIの要件整理結果が想定形式ではありませんでした。入力内容を調整して再実行してください。",
        );
      }

      const repository = getProjectRepository();
      const currentProject = await repository.get(projectId);

      if (!currentProject) {
        setError("プロジェクトが見つかりません");
        return;
      }

      const nextRequirements = markRequirementsReady(generatedRequirements);
      const testsRes = await fetch("/api/ai/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRequirements),
      });

      if (!testsRes.ok) {
        throw new Error(
          await getClientErrorMessage(
            testsRes,
            "テストケース生成に失敗しました。時間をおいてもう一度お試しください。",
          ),
        );
      }

      const generatedTests = (await testsRes.json()) as TestsResponse;
      const testsData = normalizeGeneratedTests(generatedTests);
      const versions = currentProject.versions || [];
      const latestMajor = versions.length
        ? Math.max(...versions.map((version) => version.major))
        : 0;
      const updatedProject: Project = {
        ...currentProject,
        title: input.title,
        description: input.description,
        requirements: nextRequirements,
        draft: {
          major: latestMajor,
          minor: (currentProject.draft?.minor || 0) + 1,
          data: testsData,
          updatedAt: new Date().toISOString(),
        },
      };

      await repository.put(updatedProject);
      setProject(updatedProject);
      setTests(testsData);
      setRequirementsViewKey((currentKey) => currentKey + 1);
      setGenerationResult({
        requirementsCount: nextRequirements.requirements.length,
        testCasesCount: testsData.tests.reduce(
          (count, group) => count + group.cases.length,
          0,
        ),
        mode: "regenerate",
      });
    } catch (err) {
      console.error(err);
      setRequirementsError(
        err instanceof Error
          ? err.message
          : "要件定義の再生成に失敗しました。",
      );
    } finally {
      setRequirementsLoading(false);
    }
  }, [projectId]);

  // handle autosave drafts (debounced updates from TestCaseTable)
  const handleTestChange = useCallback(async (newCases: TestCase[]) => {
    // store as draft with minor increment
    const repository = getProjectRepository();
    const currentProject = await repository.get(projectId);

    if (!currentProject) {
      setError("プロジェクトが見つかりません");
      return;
    }

    const versions = currentProject.versions || [];
    const latestMajor = versions.length ? Math.max(...versions.map((v) => v.major)) : 0;
    const draft = currentProject.draft || { major: latestMajor, minor: 0, data: { tests: [] } };
    draft.minor = (draft.minor || 0) + 1;
    draft.data = { tests: [{ cases: newCases }] };
    draft.updatedAt = new Date().toISOString();

    const updatedProject: Project = {
      ...currentProject,
      draft,
    };

    await repository.put(updatedProject);
    setProject(updatedProject);
    // update local state
    setTests(draft.data);
    setGenerationResult(null);
  }, [projectId]);

  // explicit save (user pressed Save) -> increment major version
  const handleTestSave = useCallback(async (newCases: TestCase[]) => {
    const repository = getProjectRepository();
    const currentProject = await repository.get(projectId);

    if (!currentProject) {
      setError("プロジェクトが見つかりません");
      return;
    }

    const versions = currentProject.versions || [];
    const latestMajor = versions.length ? Math.max(...versions.map((v) => v.major)) : 0;
    const newMajor = latestMajor + 1;
    const versionObj: ProjectVersion = {
      major: newMajor,
      minor: 0,
      label: `v${newMajor}`,
      data: { tests: [{ cases: newCases }] },
      requirements: currentProject.requirements,
      savedAt: new Date().toISOString(),
    };

    // keep only latest 5 majors
    const nextVersions = [...versions, versionObj]
      .sort((a, b) => b.major - a.major)
      .slice(0, 5)
      .sort((a, b) => a.major - b.major);

    const updatedProject: Project = {
      ...currentProject,
      versions: nextVersions,
      tests: versionObj.data,
      draft: undefined,
    };

    await repository.put(updatedProject);
    setProject(updatedProject);
    setTests(versionObj.data);
    setGenerationResult(null);
  }, [projectId]);

  const handleTopVersionSave = useCallback(async (currentCases: TestCase[]) => {
    try {
      setTopSaveStatus("saving");
      await handleTestSave(currentCases);
      setTopSaveStatus("saved");
    } catch (err) {
      console.error(err);
      setTopSaveStatus("error");
    }
  }, [handleTestSave]);

  const handleVersionRestore = useCallback(async (version: ProjectVersion) => {
    const repository = getProjectRepository();
    const currentProject = await repository.get(projectId);

    if (!currentProject) {
      setError("プロジェクトが見つかりません");
      return;
    }

    const restoredProject: Project = {
      ...currentProject,
      requirements: version.requirements ?? currentProject.requirements,
      draft: {
        major: version.major,
        minor: 1,
        data: version.data,
        updatedAt: new Date().toISOString(),
      },
    };

    await repository.put(restoredProject);
    setProject(restoredProject);
    setTests(version.data);
    setRequirementsViewKey((currentKey) => currentKey + 1);
    setGenerationResult(null);
  }, [projectId]);

  // 1. プロジェクトデータを読み込み
  useEffect(() => {
    const loadProject = async () => {
      try {
        const repository = getProjectRepository();
        const currentProject = await repository.get(projectId);

        if (!currentProject) {
          setError("プロジェクトが見つかりません");
          return;
        }

        const testsFromDraft = currentProject.draft?.data || currentProject.tests || null;
        setProject(currentProject);
        setTests(testsFromDraft);
      } catch (err) {
        console.error(err);
        setError("プロジェクトの読み込みに失敗しました");
      } finally {
        setLoaded(true);
      }
    };

    void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (!loaded || !project || tests) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      generateTests(project);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loaded, project, tests, generateTests]);

  const comparableVersions = useMemo(
    () =>
      (project?.versions || [])
        .slice()
        .sort((a, b) => b.major - a.major || b.minor - a.minor),
    [project?.versions],
  );

  if (error && !project) {
    return (
      <div className="p-6">
        <div className="text-red-500 mb-4">{error}</div>
        <Link href="/" className="text-blue-500 underline">
          プロジェクト一覧へ戻る
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="p-6">読み込み中...</div>;
  }

  const testCases: TestCase[] =
    tests?.tests
      ?.flatMap((group) => group.cases)
      .map((testCase, index) => ({
        ...testCase,
        id: testCase.id || String(index),
      })) || [];
  const testCaseTableKey = testCases.map((testCase) => testCase.id).join("-");
  const latestSavedAt = project.versions?.length
    ? project.versions
        .map((version) => version.savedAt)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : null;
  const hasDraft = Boolean(project.draft);
  const needsTestRegeneration =
    testCases.length > 0 &&
    hasRequirementChanges(project.requirements.requirements);
  const currentCompareVersionKey =
    selectedCompareVersionKey ||
    (comparableVersions[0] ? getProjectVersionKey(comparableVersions[0]) : "");

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <nav aria-label="パンくずリスト" className="mb-4 text-sm text-gray-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="text-blue-600 hover:underline">
                プロジェクト一覧
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-700">{project.title}</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-gray-600">{project.description}</p>
      </div>

      <div className="mb-6 rounded border bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">要件</p>
            <p className="mt-1 font-semibold text-gray-900">
              {project.requirements.requirements.length}件 整理済み
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">テストケース</p>
            <p className="mt-1 font-semibold text-gray-900">
              {testCases.length > 0 ? `${testCases.length}件 生成済み` : "未生成"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">保存状態</p>
            <p className="mt-1 font-semibold text-gray-900">
              {hasDraft
                ? "下書き保存済み"
                : latestSavedAt
                  ? "正式保存済み"
                  : "未保存"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">最終保存</p>
            <p className="mt-1 font-semibold text-gray-900">
              {latestSavedAt
                ? new Date(latestSavedAt).toLocaleString("ja-JP")
                : "未保存"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600" aria-live="polite">
            {topSaveStatus === "idle" && "現在の要件とテストケースを正式バージョンとして保存できます。"}
            {topSaveStatus === "saving" && "バージョン保存中..."}
            {topSaveStatus === "saved" && "バージョン保存済み"}
            {topSaveStatus === "error" && (
              <span className="text-red-600">バージョン保存に失敗しました</span>
            )}
          </p>
          <button
            type="button"
            disabled={testCases.length === 0 || topSaveStatus === "saving"}
            onClick={() => void handleTopVersionSave(testCases)}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {topSaveStatus === "saving" ? "保存中..." : "バージョン保存"}
          </button>
        </div>
      </div>

      <div
        className={
          navigationOpen
            ? "grid gap-6 lg:grid-cols-[220px_1fr]"
            : "grid gap-6 lg:grid-cols-[72px_1fr]"
        }
      >
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav
            aria-label="プロジェクト表示"
            className="grid gap-2 rounded border bg-white p-2 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setNavigationOpen((isOpen) => !isOpen)}
              className="rounded px-3 py-2 text-left text-xs font-semibold text-gray-500 hover:bg-gray-100"
              aria-expanded={navigationOpen}
              aria-label={
                navigationOpen
                  ? "左メニューを閉じる"
                  : "左メニューを開く"
              }
            >
              {navigationOpen ? "メニューを閉じる" : "開く"}
            </button>

            <button
              type="button"
              onClick={() => setActiveView("edit")}
              className={
                activeView === "edit"
                  ? "rounded bg-blue-600 px-3 py-2 text-left text-sm font-semibold text-white"
                  : "rounded px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
              }
              aria-current={activeView === "edit" ? "page" : undefined}
            >
              {navigationOpen ? "編集" : "編"}
            </button>

            <div>
              <button
                type="button"
                onClick={() => {
                  setActiveView("compare");
                  setCompareVersionsOpen((isOpen) => !isOpen);
                }}
                className={
                  activeView === "compare"
                    ? "flex w-full items-center justify-between rounded bg-blue-600 px-3 py-2 text-left text-sm font-semibold text-white"
                    : "flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
                }
                aria-current={activeView === "compare" ? "page" : undefined}
                aria-expanded={compareVersionsOpen}
              >
                <span>{navigationOpen ? "比較" : "比"}</span>
                {navigationOpen && (
                  <span aria-hidden="true">
                    {compareVersionsOpen ? "-" : "+"}
                  </span>
                )}
              </button>

              {navigationOpen && compareVersionsOpen && (
                <div className="mt-2 grid gap-1 border-l border-gray-200 pl-3">
                  {comparableVersions.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-gray-500">
                      保存済みバージョンなし
                    </p>
                  ) : (
                    comparableVersions.map((version) => {
                      const versionKey = getProjectVersionKey(version);
                      const isSelected =
                        activeView === "compare" &&
                        versionKey === currentCompareVersionKey;

                      return (
                        <button
                          key={versionKey}
                          type="button"
                          onClick={() => {
                            setSelectedCompareVersionKey(versionKey);
                            setActiveView("compare");
                          }}
                          className={
                            isSelected
                              ? "rounded bg-blue-50 px-2 py-2 text-left text-xs font-semibold text-blue-700"
                              : "rounded px-2 py-2 text-left text-xs text-gray-600 hover:bg-gray-100"
                          }
                        >
                          <span className="block">{version.label}</span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">
                            {new Date(version.savedAt).toLocaleString(
                              "ja-JP",
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </nav>
        </aside>

        <main className="min-w-0">
          {activeView === "edit" ? (
            <>
              {generationResult && (
                <div className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {generationResult.mode === "regenerate"
                    ? "再生成が完了しました。"
                    : "生成が完了しました。"}
                  {generationResult.requirementsCount}件の要件から
                  {generationResult.testCasesCount}
                  件のテストケースを作成しました。
                </div>
              )}

              <ProjectInputRegenerator
                initialTitle={project.title}
                initialDescription={project.description}
                loading={requirementsLoading}
                errorMessage={requirementsError}
                onRegenerate={regenerateRequirementsFromInput}
              />

              {requirementsLoading && (
                <div className="mb-6">
                  <GenerationLoading
                    title="要件とテストケースを再生成しています"
                    messages={[
                      "入力内容を読み直しています...",
                      "要件を構造化しています...",
                      "受入基準を整理しています...",
                      "テストケースを生成しています...",
                      "下書きとして保存しています...",
                    ]}
                  />
                </div>
              )}

              <section className="mb-8">
                <RequirementManager
                  key={`${project.id}-${requirementsViewKey}`}
                  requirements={project.requirements}
                  onChange={handleRequirementsChange}
                />
              </section>

              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold">テストケース</h2>
                  <button
                    disabled={loading}
                    onClick={() => generateTests(project, "regenerate")}
                    className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? "生成中..." : "テストケースを再生成"}
                  </button>
                </div>

                {loading && (
                  <div className="mb-4">
                    <GenerationLoading
                      title="テストケースを生成しています"
                      messages={[
                        "受入基準を読み込んでいます...",
                        "正常系・異常系・エッジケースを洗い出しています...",
                        "テスト手順と期待値を組み立てています...",
                        "生成結果を保存しています...",
                      ]}
                    />
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <p>{error}</p>
                    <button
                      disabled={loading}
                      onClick={() =>
                        generateTests(project, tests ? "regenerate" : "initial")
                      }
                      className="mt-2 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      再試行
                    </button>
                  </div>
                )}

                {needsTestRegeneration && !loading && (
                  <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    要件が変更されています。現在のテストケースを最新の要件に合わせるには再生成してください。
                    <button
                      onClick={() => generateTests(project, "regenerate")}
                      className="mt-2 block rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                    >
                      テストケースを再生成
                    </button>
                  </div>
                )}

                {testCases.length > 0 && (
                  <div className="overflow-x-auto">
                    <TestCaseTable
                      key={testCaseTableKey}
                      initialData={testCases}
                      onChange={handleTestChange}
                      onSave={handleTestSave}
                    />
                  </div>
                )}

                {testCases.length === 0 && !loading && (
                  <div className="rounded border bg-white px-6 py-8 text-center shadow-sm">
                    <p className="text-lg font-semibold text-gray-900">
                      テストケースがありません
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      要件定義から正常系・異常系・エッジケースを作成できます。
                    </p>
                    <button
                      onClick={() => generateTests(project, "initial")}
                      className="mt-5 rounded bg-indigo-600 px-5 py-2 text-sm text-white hover:bg-indigo-700"
                    >
                      テストケースを生成
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <VersionManager
              project={project}
              currentTests={tests}
              selectedVersionKey={currentCompareVersionKey}
              onSelectedVersionKeyChange={setSelectedCompareVersionKey}
              onEditCurrent={() => setActiveView("edit")}
              onRestore={handleVersionRestore}
            />
          )}
        </main>
      </div>
      <BackToTopButton />
    </div>
  );
}
