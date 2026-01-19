import type { ReactNode } from 'react'

type TwoPaneListHeaderProps = {
  title: string
  count: number
  action?: ReactNode
}

export function TwoPaneListHeader({ title, count, action }: TwoPaneListHeaderProps) {
  return (
    <div className="p-3 bg-slate-50/50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 truncate">
          {title} ({count})
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}

