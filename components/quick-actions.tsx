'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  label: string
  href: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    hover: 'hover:bg-green-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-100',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    hover: 'hover:bg-pink-100',
  },
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          const colors = colorClasses[action.color]
          
          return (
            <Link
              key={index}
              href={action.href}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-lg transition-all',
                'hover:shadow-md hover:scale-105',
                colors.bg,
                colors.hover
              )}
            >
              <Icon className={cn('w-6 h-6 mb-2', colors.text)} />
              <span className={cn('text-sm font-medium text-center', colors.text)}>
                {action.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}



