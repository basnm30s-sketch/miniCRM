'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TileProps {
  icon: LucideIcon
  title: string
  metric: string | number
  metricLabel: string
  href: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'teal' | 'gray' | 'slate'
  loading?: boolean
}

const colorClasses = {
  blue: {
    icon: 'text-blue-600',
    bg: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
  },
  green: {
    icon: 'text-green-600',
    bg: 'bg-green-50',
    hover: 'hover:bg-green-100',
  },
  purple: {
    icon: 'text-purple-600',
    bg: 'bg-purple-50',
    hover: 'hover:bg-purple-100',
  },
  orange: {
    icon: 'text-orange-600',
    bg: 'bg-orange-50',
    hover: 'hover:bg-orange-100',
  },
  indigo: {
    icon: 'text-indigo-600',
    bg: 'bg-indigo-50',
    hover: 'hover:bg-indigo-100',
  },
  teal: {
    icon: 'text-teal-600',
    bg: 'bg-teal-50',
    hover: 'hover:bg-teal-100',
  },
  gray: {
    icon: 'text-gray-600',
    bg: 'bg-gray-50',
    hover: 'hover:bg-gray-100',
  },
  slate: {
    icon: 'text-slate-600',
    bg: 'bg-slate-50',
    hover: 'hover:bg-slate-100',
  },
}

export function Tile({ icon: Icon, title, metric, metricLabel, href, color = 'blue', loading = false }: TileProps) {
  const colors = colorClasses[color]

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col p-6 bg-white rounded-lg shadow-sm border border-slate-200',
        'transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
        colors.hover
      )}
    >
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', colors.bg)}>
        <Icon className={cn('w-6 h-6', colors.icon)} />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      
      <div className="mt-auto">
        {loading ? (
          <div className="h-8 w-20 bg-slate-200 animate-pulse rounded" />
        ) : (
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {typeof metric === 'number' && metric >= 1000
              ? `$${(metric / 1000).toFixed(1)}k`
              : typeof metric === 'number'
              ? metric.toLocaleString()
              : metric}
          </div>
        )}
        <p className="text-sm text-slate-500">{metricLabel}</p>
      </div>
    </Link>
  )
}

