import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

type StatusBadge = {
  label: string
  className?: string
}

type DocGeneratorDetailHeaderProps = {
  number: string
  statusBadge?: StatusBadge
  secondaryMeta?: ReactNode
  actions: ReactNode
}

export function DocGeneratorDetailHeader({
  number,
  statusBadge,
  secondaryMeta,
  actions,
}: DocGeneratorDetailHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-start shadow-sm z-10">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">{number}</h2>
          {statusBadge ? (
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          ) : null}
        </div>
        {secondaryMeta ? <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">{secondaryMeta}</div> : null}
      </div>

      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}
