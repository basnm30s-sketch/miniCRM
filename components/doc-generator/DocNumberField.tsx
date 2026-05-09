'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DocNumberFieldProps = {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

// Doc-number input shared by quote, invoice and purchase order forms.
// Locked by default with a pencil affordance to unlock; once unlocked the
// onChange is plain free-text (no regex filter), so backspace and any
// character work as expected. The numbering generator on the server side
// gracefully ignores non-conforming values when computing the next max.
export function DocNumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: DocNumberFieldProps) {
  const [editable, setEditable] = useState(false)

  return (
    <div>
      <Label
        htmlFor={id}
        className="text-slate-700 flex items-center gap-2 text-xs"
      >
        {label}
        {!editable && (
          <button
            type="button"
            onClick={() => setEditable(true)}
            className="text-blue-600 hover:text-blue-800"
            title={`Edit ${label.toLowerCase()}`}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </Label>
      <Input
        id={id}
        value={value}
        disabled={!editable}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 h-8 ${editable ? 'bg-white' : 'bg-slate-50'}`}
      />
    </div>
  )
}
