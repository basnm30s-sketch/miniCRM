'use client'

import Link from 'next/link'
import { LucideIcon, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewCardProps {
  icon: LucideIcon
  title: string
  description: string
  metrics: Array<{ label: string; value: string | number; color?: string }>
  href?: string
  borderColor: 'blue' | 'green' | 'red'
  iconBgColor: string
  iconColor: string
  showWatermark?: boolean
}

const borderColors = {
  blue: 'border-blue-500',
  green: 'border-green-500',
  red: 'border-red-500',
}

const textColors = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
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
}: OverviewCardProps) {
  const content = (
    <div className={cn('relative bg-white rounded-lg border-2 p-6 h-full transition-shadow hover:shadow-md', borderColors[borderColor])}>
      {/* Under Construction Watermark */}
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
          <div 
            className="text-4xl font-bold text-slate-300 opacity-30 select-none whitespace-nowrap"
            style={{
              transform: 'rotate(-30deg)',
              transformOrigin: 'center center',
            }}
          >
            UNDER CONSTRUCTION
          </div>
        </div>
      )}
      
      {/* Arrow icon in top right */}
      {href && (
        <div className="absolute top-4 right-4 z-20">
          <ArrowRight className={cn('w-5 h-5', textColors[borderColor])} />
        </div>
      )}

      {/* Icon */}
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4 relative z-10', iconBgColor)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">{title}</h3>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 relative z-10">{description}</p>

      {/* Metrics */}
      <div className="space-y-2 relative z-10">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-baseline gap-2">
            <span className={cn('text-sm font-medium', textColors[borderColor])}>{metric.label}:</span>
            <span className={cn('text-sm font-semibold', textColors[borderColor])}>
              {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
            </span>
          </div>
        ))}
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

