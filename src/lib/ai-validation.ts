export type RequirementStatus = "draft" | "ready" | "changed";

export type Requirement = {
  id?: string;
  feature: string;
  description: string;
  acceptanceCriteria: string[];
  status?: RequirementStatus;
};

export type RequirementsResponse = {
  requirements: Requirement[];
};

export type TestCaseType = "normal" | "edge" | "error";

export type GeneratedTestCase = {
  title: string;
  precondition: string;
  steps: string | string[];
  expected: string;
  type: TestCaseType;
};

export type TestGroup = {
  feature: string;
  cases: GeneratedTestCase[];
};

export type TestsResponse = {
  tests: TestGroup[];
};

export const extractModelText = (response: unknown): string => {
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    if (record.response && typeof record.response === "object") {
      const nested = record.response as Record<string, unknown>;
      if (typeof nested.text === "string") {
        return nested.text;
      }
    }

    if (typeof record.output_text === "string") {
      return record.output_text;
    }

    if (typeof record.body === "string") {
      return record.body;
    }

    return JSON.stringify(response);
  }

  return String(response);
};

export const parseModelJson = (text: string): unknown => {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fencedMatch?.[1] ?? trimmed);
};

const requirementStatuses = new Set<RequirementStatus>([
  "draft",
  "ready",
  "changed",
]);

export const isRequirementsResponse = (
  value: unknown,
): value is RequirementsResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    Array.isArray(record.requirements) &&
    record.requirements.length > 0 &&
    record.requirements.every((requirement) => {
      if (!requirement || typeof requirement !== "object") {
        return false;
      }

      const item = requirement as Record<string, unknown>;

      return (
        typeof item.feature === "string" &&
        item.feature.trim().length > 0 &&
        typeof item.description === "string" &&
        item.description.trim().length > 0 &&
        (typeof item.id === "undefined" || typeof item.id === "string") &&
        (typeof item.status === "undefined" ||
          (typeof item.status === "string" &&
            requirementStatuses.has(item.status as RequirementStatus))) &&
        Array.isArray(item.acceptanceCriteria) &&
        item.acceptanceCriteria.length > 0 &&
        item.acceptanceCriteria.every(
          (criterion) =>
            typeof criterion === "string" && criterion.trim().length > 0,
        )
      );
    })
  );
};

const testCaseTypes = new Set<TestCaseType>(["normal", "edge", "error"]);

export const isTestsResponse = (value: unknown): value is TestsResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    Array.isArray(record.tests) &&
    record.tests.length > 0 &&
    record.tests.every((group) => {
      if (!group || typeof group !== "object") {
        return false;
      }

      const testGroup = group as Record<string, unknown>;

      return (
        typeof testGroup.feature === "string" &&
        testGroup.feature.trim().length > 0 &&
        Array.isArray(testGroup.cases) &&
        testGroup.cases.length > 0 &&
        testGroup.cases.every((testCase) => {
          if (!testCase || typeof testCase !== "object") {
            return false;
          }

          const item = testCase as Record<string, unknown>;
          const hasValidSteps =
            typeof item.steps === "string" ||
            (Array.isArray(item.steps) &&
              item.steps.every((step) => typeof step === "string"));

          return (
            typeof item.title === "string" &&
            item.title.trim().length > 0 &&
            typeof item.precondition === "string" &&
            typeof item.expected === "string" &&
            item.expected.trim().length > 0 &&
            hasValidSteps &&
            typeof item.type === "string" &&
            testCaseTypes.has(item.type as TestCaseType)
          );
        })
      );
    })
  );
};
