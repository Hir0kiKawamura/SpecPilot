import type { Project, TestData } from "@/lib/project-types";

export const createSampleProject = (): Project => {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const testData: TestData = {
    tests: [
      {
        cases: [
          {
            id: crypto.randomUUID(),
            title: "有効な情報でユーザー登録できる",
            precondition: "登録画面を表示している",
            steps: [
              "有効なメールアドレスを入力する",
              "条件を満たすパスワードを入力する",
              "登録ボタンを押す",
            ],
            expected: "登録が完了し、認証メールが送信される",
            type: "normal",
          },
          {
            id: crypto.randomUUID(),
            title: "メールアドレス形式が不正な場合は登録できない",
            precondition: "登録画面を表示している",
            steps: [
              "不正な形式のメールアドレスを入力する",
              "条件を満たすパスワードを入力する",
              "登録ボタンを押す",
            ],
            expected: "メールアドレス形式のエラーが表示される",
            type: "error",
          },
          {
            id: crypto.randomUUID(),
            title: "登録済みメールアドレスでは登録できない",
            precondition: "同じメールアドレスのユーザーが既に存在する",
            steps: [
              "登録済みのメールアドレスを入力する",
              "条件を満たすパスワードを入力する",
              "登録ボタンを押す",
            ],
            expected: "登録済みであることを示すエラーが表示される",
            type: "edge",
          },
        ],
      },
    ],
  };

  return {
    id,
    title: "サンプル: ユーザー登録機能",
    description:
      "ユーザーがメールアドレスで登録し、認証メール経由でアカウントを有効化できる機能。",
    createdAt,
    requirements: {
      requirements: [
        {
          feature: "ユーザー登録",
          description:
            "ユーザーがメールアドレスとパスワードを入力してアカウントを作成できる。",
          acceptanceCriteria: [
            "有効なメールアドレスとパスワードを入力すると登録できる",
            "登録後に認証メールが送信される",
            "認証完了後にログイン可能な状態になる",
          ],
        },
        {
          feature: "入力チェック",
          description:
            "不正な入力値に対して、ユーザーが修正しやすいエラーを表示する。",
          acceptanceCriteria: [
            "メールアドレス形式が不正な場合はエラーを表示する",
            "短すぎるパスワードの場合はエラーを表示する",
            "既に登録済みのメールアドレスでは登録できない",
          ],
        },
      ],
    },
    tests: testData,
    versions: [
      {
        major: 1,
        minor: 0,
        label: "v1",
        data: testData,
        savedAt: createdAt,
      },
    ],
  };
};
