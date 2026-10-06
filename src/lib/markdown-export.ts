import type { Requirement } from "@/lib/ai-validation";
import type { TestData } from "@/lib/project-types";

export type MarkdownExportBundle = {
  requirements: string;
  testSpec: string;
};

const normalizeText = (value: string | null | undefined): string =>
  value?.trim() || "未入力";

const formatList = (items: string[]): string =>
  items.length > 0
    ? items.map((item, index) => `${index + 1}. ${normalizeText(item)}`).join("\n")
    : "- なし";

export const buildRequirementsMarkdown = (
  title: string,
  description: string,
  requirements: Requirement[],
): string => {
  const lines = [
    `# ${title}`,
    "",
    description.trim() || "要件定義書",
    "",
    "## 要件一覧",
    "",
  ];

  if (requirements.length === 0) {
    lines.push("要件がまだ定義されていません。");
    return `${lines.join("\n")}\n`;
  }

  requirements.forEach((requirement, index) => {
    lines.push(
      `## ${requirement.id || `REQ-${String(index + 1).padStart(3, "0")}`}: ${normalizeText(requirement.feature)}`,
      "",
      `- 説明: ${normalizeText(requirement.description)}`,
      "- 受入基準:",
      formatList(requirement.acceptanceCriteria),
      "",
    );
  });

  return `${lines.join("\n")}\n`;
};

export const buildTestSpecMarkdown = (
  title: string,
  description: string,
  tests: TestData | null,
): string => {
  const lines = [
    `# ${title} テスト仕様書`,
    "",
    description.trim() || "テスト仕様書",
    "",
    "## テストケース一覧",
    "",
  ];

  const cases = tests?.tests.flatMap((group) => group.cases) ?? [];

  if (cases.length === 0) {
    lines.push("テストケースがまだ生成されていません。");
    return `${lines.join("\n")}\n`;
  }

  cases.forEach((testCase, index) => {
    lines.push(
      `## ${index + 1}. ${normalizeText(testCase.title)}`,
      "",
      `- 種別: ${normalizeText(testCase.type)}`,
      `- 前提条件: ${normalizeText(testCase.precondition)}`,
      "- 手順:",
      formatList(testCase.steps),
      `- 期待値: ${normalizeText(testCase.expected)}`,
      "",
    );
  });

  return `${lines.join("\n")}\n`;
};

export const buildMarkdownExportBundle = (
  title: string,
  description: string,
  requirements: Requirement[],
  tests: TestData | null,
): MarkdownExportBundle => ({
  requirements: buildRequirementsMarkdown(title, description, requirements),
  testSpec: buildTestSpecMarkdown(title, description, tests),
});
