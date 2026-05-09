import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type DocGeneratorEmptyStateProps = {
  title: string
  description: string
  ctaHref: string
  ctaLabel: string
  icon?: ReactNode
}

export function DocGeneratorEmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
  icon,
}: DocGeneratorEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
      <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        {icon || <FileText className="w-8 h-8 text-slate-300" />}
      </div>
      <p className="text-lg font-medium text-slate-600">{title}</p>
      <p className="text-sm max-w-xs text-center mt-2">{description}</p>
      <Link href={ctaHref} className="mt-6">
        <Button variant="outline">{ctaLabel}</Button>
      </Link>
    </div>
  )
}
