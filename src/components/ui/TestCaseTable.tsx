"use client"

import { useEffect, useState, useRef } from "react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import type { TestCaseType } from "@/lib/ai-validation"

export type TestCase = {
  id: string
  title: string
  precondition: string
  steps: string[]
  expected: string
  type: TestCaseType
}

type Props = {
  initialData: TestCase[]
  onChange?: (data: TestCase[]) => Promise<void> | void
  onSave?: (data: TestCase[]) => Promise<void> | void
}

type SaveStatus =
  | "idle"
  | "draft-saving"
  | "draft-saved"
  | "saving"
  | "saved"
  | "error"

export function TestCaseTable({ initialData, onChange, onSave }: Props) {
  const [data, setData] = useState<TestCase[]>(initialData)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const didMountRef = useRef(false)

  const adjustTextareas = () => {
    const root = containerRef.current
    if (!root) return
    const areas = Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))
    areas.forEach((t) => {
      t.style.height = "auto"
      t.style.height = `${t.scrollHeight}px`
    })
  }

  useEffect(() => {
    const id = setTimeout(adjustTextareas, 50)
    return () => clearTimeout(id)
  }, [data])

  // =========================
  // debounce autosave
  // =========================
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    let active = true

    const timer = setTimeout(() => {
      const saveDraft = async () => {
        try {
          setSaveStatus("draft-saving")
          await onChange?.(data)
          if (active) {
            setSaveStatus("draft-saved")
          }
        } catch (err) {
          console.error(err)
          if (active) {
            setSaveStatus("error")
          }
        }
      }

      void saveDraft()
    }, 500)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [data, onChange])

  // =========================
  // update helper
  // =========================
  const update = (
    index: number,
    key: keyof TestCase,
    value: string | string[]
  ) => {
    const copy = [...data]
    copy[index] = { ...copy[index], [key]: value }
    setData(copy)
  }

  // =========================
  // add row
  // =========================
  const addRow = () => {
    setData([
      ...data,
      {
        id: crypto.randomUUID(),
        title: "",
        precondition: "",
        steps: [],
        expected: "",
        type: "normal",
      },
    ])
  }

  // =========================
  // delete row
  // =========================
  const deleteRow = (index: number) => {
    setData(data.filter((_, i) => i !== index))
    setDeleteIndex(null)
  }

  // =========================
  // save data
  // =========================
  const save = async () => {
    try {
      setSaveStatus("saving")
      await onSave?.(data)
      setSaveStatus("saved")
    } catch (err) {
      console.error(err)
      setSaveStatus("error")
    }
  }

  // =========================
  // CSV export
  // =========================
  const exportCSV = () => {
    const header = [
      "title",
      "precondition",
      "steps",
      "expected",
      "type",
    ]

    const rows = data.map((r) => [
      r.title,
      r.precondition,
      r.steps.join(" | "),
      r.expected,
      r.type,
    ])

    const csv =
      [header, ...rows]
        .map((row) =>
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "testcases.csv"
    a.click()

    URL.revokeObjectURL(url)
  }

  // =========================
  // UI
  // =========================
  return (
    <div ref={containerRef} className="space-y-3 border rounded-lg p-4 bg-white shadow-sm">
      {deleteIndex !== null && (
        <ConfirmDialog
          title="テストケースを削除しますか？"
          description={`「${data[deleteIndex]?.title || `ケース ${deleteIndex + 1}`}」を削除します。`}
          confirmLabel="削除"
          destructive
          onCancel={() => setDeleteIndex(null)}
          onConfirm={() => deleteRow(deleteIndex)}
        />
      )}
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-gray-700">
            {data.length}件のテストケース
          </div>

          <div className="text-sm text-gray-500" aria-live="polite">
            {saveStatus === "idle" && "編集すると自動保存されます"}
            {saveStatus === "draft-saving" && "下書き保存中..."}
            {saveStatus === "draft-saved" && "下書き保存済み"}
            {saveStatus === "saving" && "正式保存中..."}
            {saveStatus === "saved" && "正式保存済み"}
            {saveStatus === "error" && (
              <span className="text-red-600">保存に失敗しました</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button onClick={addRow} className="w-full rounded bg-blue-500 px-3 py-1 text-white sm:w-auto">
            行を追加
          </button>

          <button onClick={exportCSV} className="w-full rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600 sm:w-auto">
            CSV出力
          </button>

          <button onClick={save} className="w-full rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700 sm:w-auto">
            バージョン保存
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Precondition</th>
              <th className="p-2">Steps</th>
              <th className="p-2">Expected</th>
              <th className="p-2">Type</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr key={row.id} className="border-t">
                <td className="p-1 align-top">
                  <textarea
                    className="w-full border px-2 py-1 whitespace-normal break-words resize-y"
                    value={row.title}
                    rows={2}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = "auto"
                      t.style.height = `${t.scrollHeight}px`
                    }}
                    onChange={(e) => update(i, "title", e.target.value)}
                  />
                </td>

                <td className="p-1 align-top">
                  <textarea
                    className="w-full border px-2 py-1 whitespace-normal break-words resize-y"
                    value={row.precondition}
                    rows={2}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = "auto"
                      t.style.height = `${t.scrollHeight}px`
                    }}
                    onChange={(e) => update(i, "precondition", e.target.value)}
                  />
                </td>

                <td className="p-1 align-top">
                  <textarea
                    className="w-full border px-2 py-1 whitespace-pre-wrap break-words resize-y"
                    value={row.steps.join("\n")}
                    rows={Math.max(2, row.steps.length)}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = "auto"
                      t.style.height = `${t.scrollHeight}px`
                    }}
                    onChange={(e) =>
                      update(i, "steps", e.target.value.split("\n"))
                    }
                  />
                </td>

                <td className="p-1 align-top">
                  <textarea
                    className="w-full border px-2 py-1 whitespace-normal break-words resize-y"
                    value={row.expected}
                    rows={2}
                    onInput={(e) => {
                      const t = e.currentTarget
                      t.style.height = "auto"
                      t.style.height = `${t.scrollHeight}px`
                    }}
                    onChange={(e) => update(i, "expected", e.target.value)}
                  />
                </td>

                <td className="p-1">
                  <select
                    className="w-full border px-2 py-1"
                    value={row.type}
                    onChange={(e) =>
                      update(i, "type", e.target.value as TestCaseType)
                    }
                  >
                    <option value="normal">normal</option>
                    <option value="edge">edge</option>
                    <option value="error">error</option>
                  </select>
                </td>

                <td className="p-1 text-center">
                  <button
                    onClick={() => setDeleteIndex(i)}
                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
                    aria-label={`削除: ${row.title || `ケース ${i + 1}`}`}
                    title="削除"
                  >
                    <span className="text-sm font-semibold">削除</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
