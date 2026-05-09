import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DocGeneratorSummaryCardProps = {
  subtotal: number
  tax: number
  total: number
  extraContent?: ReactNode
}

export function DocGeneratorSummaryCard({
  subtotal,
  tax,
  total,
  extraContent,
}: DocGeneratorSummaryCardProps) {
  return (
    <Card className="shadow-sm border-slate-200 h-fit">
      <CardHeader className="pb-2 pt-3 bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>AED {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Tax</span>
          <span>AED {tax.toFixed(2)}</span>
        </div>
        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-baseline">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-xl font-bold text-slate-900">AED {total.toFixed(2)}</span>
        </div>
        {extraContent}
      </CardContent>
    </Card>
  )
}
