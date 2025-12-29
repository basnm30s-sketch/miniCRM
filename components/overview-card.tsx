'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewCardProps {
  icon: LucideIcon
  title: string
  description: string
  metrics: Array<{ label: string; value: string | number; color?: string }>
  href?: string
  borderColor: 'blue' | 'green' | 'purple'
  iconBgColor: string
  iconColor: string
  showWatermark?: boolean
  quoteMetrics?: Array<{ label: string; value: string | number; color?: string }>
  invoiceMetrics?: Array<{ label: string; value: string | number; color?: string }>
  quoteHref?: string
  invoiceHref?: string
}

const borderGradients = {
  blue: 'from-blue-100/40 via-sky-100/40 to-indigo-100/40',
  green: 'from-emerald-100/40 via-teal-100/40 to-cyan-100/40',
  purple: 'from-violet-100/40 via-purple-100/40 to-fuchsia-100/40',
}

const accentColors = {
  blue: {
    text: 'text-blue-700',
    light: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  green: {
    text: 'text-emerald-700',
    light: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  purple: {
    text: 'text-purple-700',
    light: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
}

export function OverviewCard({
  icon: Icon,
  title,
  description,
  metrics,
  href,
  borderColor,
  iconBgColor,
  iconColor,
  showWatermark = false,
  quoteMetrics,
  invoiceMetrics,
  quoteHref,
  invoiceHref,
}: OverviewCardProps) {
  const accent = accentColors[borderColor]
  
  const content = (
    <div className={cn('relative rounded-xl p-[1.5px] bg-gradient-to-br h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02]', borderGradients[borderColor])}>
      <div className="relative bg-white rounded-xl p-6 h-full flex flex-col">
        {/* Under Construction Watermark */}
        {showWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden rounded-xl">
            <div 
              className="text-4xl font-bold text-slate-200 opacity-20 select-none whitespace-nowrap"
              style={{
                transform: 'rotate(-30deg)',
                transformOrigin: 'center center',
              }}>
              UNDER CONSTRUCTION
            </div>
          </div>
        )}
        
        {/* Header Section */}
        <div className="relative z-10 mb-5">
          <div className="flex items-start justify-between mb-5">
            {/* Icon */}
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', iconBgColor, 'ring-1 ring-slate-100')}>
              <Icon className={cn('w-7 h-7', iconColor)} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-slate-900 mb-1.5 leading-tight">{title}</h3>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>

        {/* Metrics Section */}
        <div className="relative z-10 flex-1 flex flex-col">
          {quoteMetrics && invoiceMetrics ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Quote Metrics Column */}
              {quoteHref ? (
                <Link href={quoteHref} className="space-y-3.5 rounded-lg p-2 -m-2 transition-all duration-200 hover:bg-blue-50/50 cursor-pointer">
                  <div className={cn('text-xs font-semibold uppercase tracking-wider mb-3 pb-2 border-b', accent.text, accent.border)}>
                    Quotes
                  </div>
                  {quoteMetrics.map((metric, index) => (
                    <div key={index} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-medium">{metric.label}</span>
                      <span className={cn('text-base font-semibold text-slate-900')}>
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      </span>
                    </div>
                  ))}
                </Link>
              ) : (
                <div className="space-y-3.5">
                  <div className={cn('text-xs font-semibold uppercase tracking-wider mb-3 pb-2 border-b', accent.text, accent.border)}>
                    Quotes
                  </div>
                  {quoteMetrics.map((metric, index) => (
                    <div key={index} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-medium">{metric.label}</span>
                      <span className={cn('text-base font-semibold text-slate-900')}>
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* Invoice Metrics Column */}
              {invoiceHref ? (
                <Link href={invoiceHref} className="space-y-3.5 rounded-lg p-2 -m-2 transition-all duration-200 hover:bg-blue-50/50 cursor-pointer">
                  <div className={cn('text-xs font-semibold uppercase tracking-wider mb-3 pb-2 border-b', accent.text, accent.border)}>
                    Invoices
                  </div>
                  {invoiceMetrics.map((metric, index) => (
                    <div key={index} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-medium">{metric.label}</span>
                      <span className={cn('text-base font-semibold text-slate-900')}>
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      </span>
                    </div>
                  ))}
                </Link>
              ) : (
                <div className="space-y-3.5">
                  <div className={cn('text-xs font-semibold uppercase tracking-wider mb-3 pb-2 border-b', accent.text, accent.border)}>
                    Invoices
                  </div>
                  {invoiceMetrics.map((metric, index) => (
                    <div key={index} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-500 font-medium">{metric.label}</span>
                      <span className={cn('text-base font-semibold text-slate-900')}>
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {metrics.map((metric, index) => (
                <div key={index} className={cn('flex items-center justify-between py-2.5', 
                  index < metrics.length - 1 && 'border-b border-slate-100'
                )}>
                  <span className="text-sm text-slate-600 font-medium">{metric.label}</span>
                  <span className={cn('text-base font-semibold text-slate-900')}>
                    {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    )
  }

  return content
}

