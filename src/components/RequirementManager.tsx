"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
  Requirement,
  RequirementStatus,
  RequirementsResponse,
} from "@/lib/ai-validation";

type RequirementManagerProps = {
  requirements: RequirementsResponse;
  onChange: (requirements: RequirementsResponse) => Promise<void> | void;
};

const statusLabels: Record<RequirementStatus, string> = {
  draft: "下書き",
  ready: "確定",
  changed: "変更あり",
};

type ManagedRequirement = Requirement & {
  id: string;
  status: RequirementStatus;
};

const ensureRequirement = (
  requirement: Requirement,
  index: number,
): ManagedRequirement => ({
  ...requirement,
  id: requirement.id || `REQ-${String(index + 1).padStart(3, "0")}`,
  status: requirement.status || "ready",
});

export function RequirementManager({
  requirements,
  onChange,
}: RequirementManagerProps) {
  const [items, setItems] = useState<ManagedRequirement[]>(
    requirements.requirements.map(ensureRequirement),
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void onChange({ requirements: items });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [items, onChange]);

  const updateRequirement = (
    id: string,
    updater: (requirement: ManagedRequirement) => Requirement,
    markAsChanged = true,
  ) => {
    setItems((currentItems) =>
      currentItems.map((requirement, index) => {
        if (requirement.id !== id) {
          return requirement;
        }

        const updatedRequirement = ensureRequirement(
          updater(requirement),
          index,
        );

        return {
          ...updatedRequirement,
          status: markAsChanged
            ? updatedRequirement.status === "draft"
              ? "draft"
              : "changed"
            : updatedRequirement.status,
        };
      }),
    );
  };

  const addRequirement = () => {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: `REQ-${String(currentItems.length + 1).padStart(3, "0")}`,
        feature: "新しい要件",
        description: "",
        acceptanceCriteria: ["受入基準を入力してください"],
        status: "draft",
      },
    ]);
  };

  const updateAcceptanceCriterion = (
    requirementId: string,
    criterionIndex: number,
    value: string,
  ) => {
    updateRequirement(requirementId, (current) => ({
      ...current,
      acceptanceCriteria: current.acceptanceCriteria.map((criterion, index) =>
        index === criterionIndex ? value : criterion,
      ),
    }));
  };

  const addAcceptanceCriterion = (requirementId: string) => {
    updateRequirement(requirementId, (current) => ({
      ...current,
      acceptanceCriteria: [...current.acceptanceCriteria, ""],
    }));
  };

  const deleteAcceptanceCriterion = (
    requirementId: string,
    criterionIndex: number,
  ) => {
    updateRequirement(requirementId, (current) => {
      const nextCriteria = current.acceptanceCriteria.filter(
        (_, index) => index !== criterionIndex,
      );

      return {
        ...current,
        acceptanceCriteria: nextCriteria.length > 0 ? nextCriteria : [""],
      };
    });
  };

  const deleteRequirement = (id: string) => {
    setItems((currentItems) =>
      currentItems.filter((requirement) => requirement.id !== id),
    );
    setDeleteTargetId(null);
  };

  const deleteTarget = items.find(
    (requirement) => requirement.id === deleteTargetId,
  );

  return (
    <div className="space-y-4">
      {deleteTarget && (
        <ConfirmDialog
          title="要件を削除しますか？"
          description={`「${deleteTarget.feature}」を削除します。関連するテストケースは再生成が必要になる場合があります。`}
          confirmLabel="削除"
          destructive
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={() => deleteRequirement(deleteTarget.id)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">要件定義</h2>
          <p className="mt-1 text-sm text-gray-600">
            要件を追加・編集・削除し、ステータスを管理できます。
          </p>
        </div>
        <button
          type="button"
          onClick={addRequirement}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          要件を追加
        </button>
      </div>

      {items.map((requirement, requirementIndex) => (
        <div key={requirement.id} className="rounded border bg-blue-50 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                  {requirement.id}
                </span>
                <select
                  value={requirement.status}
                  onChange={(event) =>
                    updateRequirement(requirement.id, (current) => ({
                      ...current,
                      status: event.target.value as RequirementStatus,
                    }), false)
                  }
                  className="rounded border bg-white px-2 py-1 text-xs"
                  aria-label={`${requirement.feature}のステータス`}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={requirement.feature}
                onChange={(event) =>
                  updateRequirement(requirement.id, (current) => ({
                    ...current,
                    feature: event.target.value,
                  }))
                }
                className="w-full rounded border bg-white px-3 py-2 font-semibold"
                aria-label={`要件${requirementIndex + 1}の機能名`}
              />
            </div>
            <button
              type="button"
              onClick={() => setDeleteTargetId(requirement.id)}
              className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
            >
              削除
            </button>
          </div>

          <textarea
            value={requirement.description}
            onChange={(event) =>
              updateRequirement(requirement.id, (current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="mb-3 min-h-20 w-full rounded border bg-white px-3 py-2 text-sm"
            aria-label={`${requirement.feature}の説明`}
          />

          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium">受入基準</label>
            <button
              type="button"
              onClick={() => addAcceptanceCriterion(requirement.id)}
              className="rounded border border-blue-200 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              受入基準を追加
            </button>
          </div>

          <ol className="mt-2 space-y-3">
            {requirement.acceptanceCriteria.map((criterion, criterionIndex) => (
              <li
                key={criterionIndex}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <span className="mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded bg-white px-1 text-xs font-semibold text-blue-700">
                  {criterionIndex + 1}
                </span>
                <input
                  value={criterion}
                  onChange={(event) =>
                    updateAcceptanceCriterion(
                      requirement.id,
                      criterionIndex,
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded border bg-white px-3 py-2 text-sm"
                  aria-label={`${requirement.feature}の受入基準 ${criterionIndex + 1}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    deleteAcceptanceCriterion(
                      requirement.id,
                      criterionIndex,
                    )
                  }
                  className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 sm:w-auto"
                  aria-label={`${requirement.feature}の受入基準 ${criterionIndex + 1}を削除`}
                >
                  削除
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
