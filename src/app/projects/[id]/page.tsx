// src/app/projects/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TestCaseTable } from "@/components/ui/TestCaseTable";
import type { TestCase } from "@/components/ui/TestCaseTable";

type RawTestCase = {
  id?: string;
  title?: string;
  description?: string;
  steps?: string | string[];
  precondition?: string;
  expected?: string;
  type?: string;
  [key: string]: unknown;
};

type TestGroup = {
  cases: RawTestCase[];
};

type TestData = {
  tests: TestGroup[];
};

type Project = {
  id: string;
  title: string;
  description: string;
  requirements: {
    requirements: Array<{
      feature: string;
      description: string;
      acceptanceCriteria: string[];
    }>;
  };
  tests?: TestData | null;
  createdAt: string;
};

// Stored project structure in localStorage
type VersionEntry = {
  major: number;
  minor: number;
  label: string;
  data: TestData;
  requirements?: Project['requirements'];
  savedAt: string;
};

type DraftEntry = {
  major: number;
  minor: number;
  data: TestData;
  updatedAt?: string;
};

type StoredProject = {
  id?: string;
  title?: string;
  description?: string;
  requirements?: Project['requirements'];
  tests?: TestData | null;
  createdAt?: string;
  versions?: VersionEntry[];
  draft?: DraftEntry;
};

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;

  const initialProjectState = (() => {
    if (typeof window === "undefined") {
      return {
        project: null,
        tests: null,
        error: null,
      };
    }

    const projects = JSON.parse(localStorage.getItem("projects") || "{}");
    const proj = projects[projectId];

    // prefer draft if exists
    const testsFromDraft = proj?.draft?.data || proj?.tests || null

    return {
      project: proj || null,
      tests: testsFromDraft || null,
      error: proj ? null : "プロジェクトが見つかりません",
    };
  })();

  const [project] = useState<Project | null>(initialProjectState.project);
  const [tests, setTests] = useState<TestData | null>(initialProjectState.tests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialProjectState.error);

  // 2. テスト生成
  const generateTests = useCallback(async (proj: Project) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proj.requirements),
      });

      if (!res.ok) throw new Error("Failed to generate tests");

      const testsData = (await res.json()) as TestData;
      setTests(testsData);

      // localStorageに保存および初回バージョン(v1)として登録
      const projects = JSON.parse(localStorage.getItem("projects") || "{}") as Record<string, StoredProject>;
      // initialize versioning: first completed generation => v1
      const projEntry: StoredProject = projects[projectId] || {};
      const versionObj: VersionEntry = {
        major: 1,
        minor: 0,
        label: "v1",
        data: testsData,
        requirements: proj.requirements,
        savedAt: new Date().toISOString(),
      };
      projEntry.versions = [versionObj];
      projEntry.tests = versionObj.data;
      delete projEntry.draft;
      projects[projectId] = projEntry;
      localStorage.setItem("projects", JSON.stringify(projects));
    } catch (err) {
      setError("テスト生成に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // helper to get projects
  const readProjects = (): Record<string, StoredProject> =>
    JSON.parse(localStorage.getItem("projects") || "{}") as Record<string, StoredProject>;

  const writeProjects = (p: Record<string, StoredProject>) =>
    localStorage.setItem("projects", JSON.stringify(p));

  // handle autosave drafts (debounced updates from TestCaseTable)
  const handleTestChange = (newCases: TestCase[]) => {
    // store as draft with minor increment
    const projects = readProjects();
    const projEntry: StoredProject = projects[projectId] || {};
    const versions = projEntry.versions || [];
    const latestMajor = versions.length ? Math.max(...versions.map((v) => v.major)) : 0;
    const draft: DraftEntry = projEntry.draft || { major: latestMajor, minor: 0, data: { tests: [] } };
    draft.minor = (draft.minor || 0) + 1;
    draft.data = { tests: [{ cases: newCases }] } as TestData;
    draft.updatedAt = new Date().toISOString();
    projEntry.draft = draft;
    projects[projectId] = projEntry;
    writeProjects(projects);
    // update local state
    setTests(draft.data as TestData);
  };

  // explicit save (user pressed Save) -> increment major version
  const handleTestSave = (newCases: TestCase[]) => {
    const projects = readProjects();
    const projEntry: StoredProject = projects[projectId] || {};
    const versions = projEntry.versions || [];
    const latestMajor = versions.length ? Math.max(...versions.map((v) => v.major)) : 0;
    const newMajor = latestMajor + 1;
    const versionObj: VersionEntry = {
      major: newMajor,
      minor: 0,
      label: `v${newMajor}`,
      data: { tests: [{ cases: newCases }] } as TestData,
      savedAt: new Date().toISOString(),
    };
    projEntry.versions = [...versions, versionObj];
    // keep only latest 5 majors
    projEntry.versions = projEntry.versions
      .sort((a, b) => b.major - a.major)
      .slice(0, 5)
      .sort((a, b) => a.major - b.major);
    projEntry.tests = versionObj.data;
    delete projEntry.draft;
    projects[projectId] = projEntry;
    writeProjects(projects);
    setTests(versionObj.data as TestData);
    alert(`保存しました: ${versionObj.label}`);
  };

  // 1. プロジェクトデータを読み込み
  useEffect(() => {
    if (!project || tests) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      generateTests(project);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [project, tests, generateTests]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500 mb-4">{error}</div>
        <Link href="/" className="text-blue-500 underline">
          ← トップに戻る
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="p-6">読み込み中...</div>;
  }

  const testCases: TestCase[] =
    tests?.tests
      ?.flatMap((f: TestGroup) => f.cases || [])
      .map((c: RawTestCase, i: number) => {
        const { steps, ...rest } = c;
        return {
          ...rest,
          id: String(i),
          steps: typeof steps === "string" ? [steps] : steps || [],
        } as TestCase;
      }) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/" className="text-blue-500 underline text-sm mb-4 block">
          ← トップに戻る
        </Link>

        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-gray-600">{project.description}</p>
      </div>

      {/* 要件セクション */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">要件定義</h2>
        <div className="space-y-4">
          {project.requirements.requirements.map((req, idx) => (
            <div key={idx} className="border p-4 rounded bg-blue-50">
              <h3 className="font-bold text-lg">{req.feature}</h3>
              <p className="text-sm text-gray-600 mb-2">{req.description}</p>
              <div className="text-sm">
                <strong>受入基準:</strong>
                <ul className="list-disc list-inside ml-2">
                  {req.acceptanceCriteria.map((ac, i) => (
                    <li key={i}>{ac}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* テストケースセクション */}
      <section>
        <h2 className="text-xl font-bold mb-4">テストケース</h2>

        {loading && <div className="text-blue-500">テスト生成中...</div>}

        {error && <div className="text-red-500">{error}</div>}

        {testCases.length > 0 && (
          <div className="overflow-x-auto">
            <TestCaseTable initialData={testCases} onChange={handleTestChange} onSave={handleTestSave} />
          </div>
        )}

        {testCases.length === 0 && !loading && (
          <div className="text-gray-500">テストケースがありません</div>
        )}
      </section>
    </div>
  );
}