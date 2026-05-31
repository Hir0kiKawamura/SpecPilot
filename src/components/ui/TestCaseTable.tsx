"use client"

import { useEffect, useState, useRef } from "react"

export type TestCase = {
  id: string
  title: string
  precondition: string
  steps: string[]
  expected: string
  type: "normal" | "edge" | "error" | string
}

type Props = {
  initialData: TestCase[]
  onChange?: (data: TestCase[]) => void
  onSave?: (data: TestCase[]) => void
}

export function TestCaseTable({ initialData, onChange, onSave }: Props) {
  const [data, setData] = useState<TestCase[]>(initialData)
  const containerRef = useRef<HTMLDivElement | null>(null)

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
    const timer = setTimeout(() => {
      onChange?.(data)
      localStorage.setItem("testcases", JSON.stringify(data))
    }, 500)

    return () => clearTimeout(timer)
  }, [data, onChange])

  // =========================
  // update helper
  // =========================
  const update = (
    index: number,
    key: keyof TestCase,
    value: string | boolean | string[] | number
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
  }

  // =========================
  // save data
  // =========================
  const save = () => {
    // call optional onSave handler (project-level save/versioning)
    onSave?.(data)
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
      {/* toolbar */}
      <div className="flex gap-2 items-center">
        <button onClick={addRow} className="px-3 py-1 bg-blue-500 text-white rounded">
          + Add
        </button>

        <button onClick={exportCSV} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
          Export CSV
        </button>

        <button onClick={save} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
          💾 Save
        </button>

        <div className="text-sm text-gray-500 self-center">
          {data.length} cases
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
                    onChange={(e) => update(i, "type", e.target.value)}
                  >
                    <option value="normal">normal</option>
                    <option value="edge">edge</option>
                    <option value="error">error</option>
                  </select>
                </td>

                <td className="p-1 text-center">
                  <button
                    onClick={() => deleteRow(i)}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
                    aria-label={`削除: ${row.title || `ケース ${i + 1}`}`}
                    title="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 6h18" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 11v6M14 11v6" />
                    </svg>
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