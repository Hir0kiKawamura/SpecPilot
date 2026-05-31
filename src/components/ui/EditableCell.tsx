"use client"

import { useState } from "react"

type Props = {
  value: string
  onChange: (val: string) => void
}

export const EditableCell = ({ value, onChange }: Props) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  return editing ? (
    <input
      className="border px-2 py-1 w-full"
      value={val}
      autoFocus
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false)
        onChange(val)
      }}
    />
  ) : (
    <div
      className="cursor-pointer"
      onClick={() => setEditing(true)}
    >
      {value || "-"} </div>
  )
}
