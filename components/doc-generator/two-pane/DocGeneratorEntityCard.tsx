import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DocGeneratorEntityCardProps = {
  title: string
  children: ReactNode
}

export function DocGeneratorEntityCard({ title, children }: DocGeneratorEntityCardProps) {
  return (
    <Card className="col-span-2 shadow-sm border-slate-200">
      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 grid grid-cols-2 gap-4 text-sm">{children}</CardContent>
    </Card>
  )
}
