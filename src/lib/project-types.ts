import type { RequirementsResponse, TestCaseType } from "@/lib/ai-validation";

export type StoredTestCase = {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  type: TestCaseType;
};

export type TestGroup = {
  cases: StoredTestCase[];
};

export type TestData = {
  tests: TestGroup[];
};

export type ProjectVersion = {
  major: number;
  minor: number;
  label: string;
  data: TestData;
  requirements?: RequirementsResponse;
  savedAt: string;
};

export type ProjectDraft = {
  major: number;
  minor: number;
  data: TestData;
  updatedAt?: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  requirements: RequirementsResponse;
  tests?: TestData | null;
  createdAt: string;
  versions?: ProjectVersion[];
  draft?: ProjectDraft;
};

export type ProjectSummary = Pick<
  Project,
  "id" | "title" | "description" | "createdAt"
> & {
  requirementsCount: number;
  testCasesCount: number;
  hasDraft: boolean;
  hasSavedVersion: boolean;
  currentVersionLabel: string;
};
