"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Requirement, RequirementsResponse } from "@/lib/ai-validation";
import type {
  Project,
  ProjectVersion,
  StoredTestCase,
  TestData,
} from "@/lib/project-types";

type VersionManagerProps = {
  project: Project;
  currentTests: TestData | null;
  selectedVersionKey?: string;
  onSelectedVersionKeyChange?: (versionKey: string) => void;
  onEditCurrent: () => void;
  onRestore: (version: ProjectVersion) => Promise<void> | void;
};

type CompareStatus = "same" | "changed" | "current-only" | "past-only";

type RequirementPair = {
  key: string;
  current?: Requirement;
  past?: Requirement;
  currentIndex?: number;
  pastIndex?: number;
  status: CompareStatus;
};

type TestCasePair = {
  key: string;
  current?: StoredTestCase;
  past?: StoredTestCase;
  currentIndex?: number;
  pastIndex?: number;
  status: CompareStatus;
};

const flattenCases = (data: TestData | null): StoredTestCase[] =>
  data?.tests.flatMap((group) => group.cases) ?? [];

const getVersionKey = (version: ProjectVersion): string =>
  `${version.major}-${version.minor}-${version.savedAt}`;

const getRequirementKey = (requirement: Requirement, index: number): string =>
  requirement.id ?? `index-${index}`;

const getTestCaseKey = (testCase: StoredTestCase, index: number): string =>
  testCase.id || `index-${index}`;

const normalizeRequirement = (requirement: Requirement) => ({
  id: requirement.id ?? "",
  feature: requirement.feature.trim(),
  description: requirement.description.trim(),
  acceptanceCriteria: requirement.acceptanceCriteria.map((criterion) =>
    criterion.trim(),
  ),
  status: requirement.status ?? "",
});

const normalizeTestCase = (testCase: StoredTestCase) => ({
  title: testCase.title.trim(),
  precondition: testCase.precondition.trim(),
  steps: testCase.steps.map((step) => step.trim()),
  expected: testCase.expected.trim(),
  type: testCase.type,
});

const isSameRequirement = (current: Requirement, past: Requirement): boolean =>
  JSON.stringify(normalizeRequirement(current)) ===
  JSON.stringify(normalizeRequirement(past));

const isSameTestCase = (
  current: StoredTestCase,
  past: StoredTestCase,
): boolean =>
  JSON.stringify(normalizeTestCase(current)) ===
  JSON.stringify(normalizeTestCase(past));

const buildRequirementPairs = (
  currentRequirements: RequirementsResponse,
  pastRequirements?: RequirementsResponse,
): RequirementPair[] => {
  if (!pastRequirements) {
    return currentRequirements.requirements.map((current, currentIndex) => ({
      key: getRequirementKey(current, currentIndex),
      current,
      currentIndex,
      status: "current-only",
    }));
  }

  const currentMap = new Map(
    currentRequirements.requirements.map((requirement, index) => [
      getRequirementKey(requirement, index),
      { requirement, index },
    ]),
  );
  const pastMap = new Map(
    pastRequirements.requirements.map((requirement, index) => [
      getRequirementKey(requirement, index),
      { requirement, index },
    ]),
  );
  const keys = Array.from(new Set([...currentMap.keys(), ...pastMap.keys()]));

  return keys.map((key) => {
    const current = currentMap.get(key);
    const past = pastMap.get(key);

    if (current && past) {
      return {
        key,
        current: current.requirement,
        past: past.requirement,
        currentIndex: current.index,
        pastIndex: past.index,
        status: isSameRequirement(current.requirement, past.requirement)
          ? "same"
          : "changed",
      };
    }

    if (current) {
      return {
        key,
        current: current.requirement,
        currentIndex: current.index,
        status: "current-only",
      };
    }

    return {
      key,
      past: past?.requirement,
      pastIndex: past?.index,
      status: "past-only",
    };
  });
};

const buildTestCasePairs = (
  currentTests: TestData | null,
  pastTests: TestData | null,
): TestCasePair[] => {
  const currentCases = flattenCases(currentTests);
  const pastCases = flattenCases(pastTests);
  const currentMap = new Map(
    currentCases.map((testCase, index) => [
      getTestCaseKey(testCase, index),
      { testCase, index },
    ]),
  );
  const pastMap = new Map(
    pastCases.map((testCase, index) => [
      getTestCaseKey(testCase, index),
      { testCase, index },
    ]),
  );
  const keys = Array.from(new Set([...currentMap.keys(), ...pastMap.keys()]));

  return keys.map((key) => {
    const current = currentMap.get(key);
    const past = pastMap.get(key);

    if (current && past) {
      return {
        key,
        current: current.testCase,
        past: past.testCase,
        currentIndex: current.index,
        pastIndex: past.index,
        status: isSameTestCase(current.testCase, past.testCase)
          ? "same"
          : "changed",
      };
    }

    if (current) {
      return {
        key,
        current: current.testCase,
        currentIndex: current.index,
        status: "current-only",
      };
    }

    return {
      key,
      past: past?.testCase,
      pastIndex: past?.index,
      status: "past-only",
    };
  });
};

const getCurrentCardClass = (status: CompareStatus): string =>
  status === "current-only"
    ? "h-full rounded border border-blue-200 bg-blue-50 p-3"
    : "h-full rounded border bg-white p-3";

const getPastCardClass = (status: CompareStatus): string =>
  status === "changed" || status === "past-only"
    ? "h-full rounded border border-amber-300 bg-amber-50 p-3"
    : "h-full rounded border bg-white p-3";

function EmptyCompareCard({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-24 items-center rounded border border-dashed bg-gray-50 p-3 text-sm text-gray-500">
      {message}
    </div>
  );
}

function RequirementCard({
  requirement,
  index,
  className,
}: {
  requirement: Requirement;
  index: number;
  className: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-blue-700">
          {requirement.id ?? `REQ-${String(index + 1).padStart(3, "0")}`}
        </span>
        {requirement.status && (
          <span className="rounded bg-white px-2 py-1 text-xs text-gray-600">
            {requirement.status}
          </span>
        )}
      </div>
      <p className="mt-2 font-medium">{requirement.feature}</p>
      <p className="mt-1 text-sm text-gray-600">
        {requirement.description || "説明なし"}
      </p>
      <ol className="mt-2 space-y-1 text-sm">
        {requirement.acceptanceCriteria.map((criterion, criterionIndex) => (
          <li key={criterionIndex} className="flex gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-white px-1 text-xs font-semibold text-blue-700">
              {criterionIndex + 1}
            </span>
            <span>{criterion || "未入力"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TestCaseCard({
  testCase,
  index,
  className,
}: {
  testCase: StoredTestCase;
  index: number;
  className: string;
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-700">
          TEST-{String(index + 1).padStart(3, "0")}
        </span>
        <span className="rounded bg-white px-2 py-1 text-xs text-gray-600">
          {testCase.type}
        </span>
      </div>
      <p className="mt-2 font-medium">{testCase.title}</p>
      <p className="mt-1 text-sm text-gray-600">
        前提: {testCase.precondition || "なし"}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        期待値: {testCase.expected || "未入力"}
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
        {testCase.steps.map((step, stepIndex) => (
          <li key={stepIndex}>{step || "未入力"}</li>
        ))}
      </ol>
    </div>
  );
}

function RequirementComparison({
  currentRequirements,
  pastRequirements,
  pastLabel,
}: {
  currentRequirements: RequirementsResponse;
  pastRequirements?: RequirementsResponse;
  pastLabel: string;
}) {
  const pairs = buildRequirementPairs(currentRequirements, pastRequirements);

  return (
    <div>
      <h3 className="mb-3 font-semibold">要件</h3>
      <div className="mb-2 hidden gap-4 text-sm font-semibold text-gray-700 xl:grid xl:grid-cols-2">
        <div>現在の編集内容</div>
        <div>{pastLabel} の要件</div>
      </div>
      <div className="space-y-3">
        {!pastRequirements && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            このバージョンには要件スナップショットがありません。現在側のみ表示します。
          </div>
        )}
        {pairs.map((pair) => (
          <div key={pair.key} className="grid items-stretch gap-4 xl:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500 xl:hidden">
                現在の編集内容
              </p>
              {pair.current ? (
                <RequirementCard
                  requirement={pair.current}
                  index={pair.currentIndex ?? 0}
                  className={getCurrentCardClass(pair.status)}
                />
              ) : (
                <EmptyCompareCard message="現在の編集内容にはありません。" />
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500 xl:hidden">
                {pastLabel} の要件
              </p>
              {pair.past ? (
                <RequirementCard
                  requirement={pair.past}
                  index={pair.pastIndex ?? 0}
                  className={getPastCardClass(pair.status)}
                />
              ) : (
                <EmptyCompareCard message="過去バージョンにはありません。" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestCaseComparison({
  currentTests,
  pastTests,
  pastLabel,
}: {
  currentTests: TestData | null;
  pastTests: TestData | null;
  pastLabel: string;
}) {
  const pairs = buildTestCasePairs(currentTests, pastTests);

  return (
    <div>
      <h3 className="mb-3 font-semibold">テストケース</h3>
      <div className="mb-2 hidden gap-4 text-sm font-semibold text-gray-700 xl:grid xl:grid-cols-2">
        <div>現在の編集内容</div>
        <div>{pastLabel} のテストケース</div>
      </div>
      {pairs.length === 0 ? (
        <p className="rounded border bg-white p-3 text-sm text-gray-500">
          比較できるテストケースがありません。
        </p>
      ) : (
        <div className="space-y-3">
          {pairs.map((pair) => (
            <div key={pair.key} className="grid items-stretch gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-500 xl:hidden">
                  現在の編集内容
                </p>
                {pair.current ? (
                  <TestCaseCard
                    testCase={pair.current}
                    index={pair.currentIndex ?? 0}
                    className={getCurrentCardClass(pair.status)}
                  />
                ) : (
                  <EmptyCompareCard message="現在の編集内容にはありません。" />
                )}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-500 xl:hidden">
                  {pastLabel} のテストケース
                </p>
                {pair.past ? (
                  <TestCaseCard
                    testCase={pair.past}
                    index={pair.pastIndex ?? 0}
                    className={getPastCardClass(pair.status)}
                  />
                ) : (
                  <EmptyCompareCard message="過去バージョンにはありません。" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VersionManager({
  project,
  currentTests,
  selectedVersionKey,
  onSelectedVersionKeyChange,
  onEditCurrent,
  onRestore,
}: VersionManagerProps) {
  const versions = useMemo(
    () =>
      (project.versions || [])
        .slice()
        .sort((a, b) => b.major - a.major || b.minor - a.minor),
    [project.versions],
  );
  const [restoreTarget, setRestoreTarget] = useState<ProjectVersion | null>(
    null,
  );
  const selectedVersion =
    versions.find((version) => getVersionKey(version) === selectedVersionKey) ??
    versions[0] ??
    null;

  if (versions.length === 0) {
    return (
      <section className="rounded border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">比較</h2>
        <p className="mt-2 text-sm text-gray-600">
          まだ保存済みバージョンはありません。テストケースをバージョン保存すると、現在の編集内容と過去バージョンを比較できます。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border bg-white p-4 shadow-sm">
      {restoreTarget && (
        <ConfirmDialog
          title="バージョンを復元しますか？"
          description={`「${restoreTarget.label}」を現在の下書きとして復元します。保存済みバージョンは削除されません。`}
          confirmLabel="復元"
          onCancel={() => setRestoreTarget(null)}
          onConfirm={() => {
            void onRestore(restoreTarget);
            setRestoreTarget(null);
          }}
        />
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">比較</h2>
          <p className="mt-1 text-sm text-gray-600">
            左が現在の編集内容、右が選択した過去バージョンです。差分がある過去項目は黄色、現在側だけにある項目は青で表示します。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-72">
          <label htmlFor="version-compare" className="text-xs text-gray-500">
            比較対象
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="version-compare"
              value={selectedVersion ? getVersionKey(selectedVersion) : ""}
              onChange={(event) =>
                onSelectedVersionKeyChange?.(event.target.value)
              }
              className="min-h-10 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {versions.map((version) => (
                <option key={getVersionKey(version)} value={getVersionKey(version)}>
                  {version.label} /{" "}
                  {new Date(version.savedAt).toLocaleString("ja-JP")}
                </option>
              ))}
            </select>
            {selectedVersion && (
              <button
                type="button"
                onClick={() => setRestoreTarget(selectedVersion)}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                復元
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-start">
        <button
          type="button"
          onClick={onEditCurrent}
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          現在の編集内容を編集
        </button>
      </div>

      {selectedVersion && (
        <div className="space-y-6">
          <RequirementComparison
            currentRequirements={project.requirements}
            pastRequirements={selectedVersion.requirements}
            pastLabel={selectedVersion.label}
          />

          <TestCaseComparison
            currentTests={currentTests}
            pastTests={selectedVersion.data}
            pastLabel={selectedVersion.label}
          />
        </div>
      )}
    </section>
  );
}
