'use client'

// Simplified chart stub for MVP - recharts integration has type compatibility issues
// This can be fully restored later with proper type definitions

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
    icon?: React.ComponentType
  }
>

export function ChartContainer({
  className,
  children,
  ...props
}: {
  className?: string
  config: ChartConfig
  children: React.ReactNode
  [key: string]: any
}) {
  return <div className={cn('w-full', className)} {...props}>{children}</div>
}

export function ChartTooltip(props: any) {
  return null
}

export function ChartTooltipContent(props: any) {
  return null
}

export function ChartStyle(props: any) {
  return null
}

export function ChartLegend(props: any) {
  return null
}

export function ChartLegendContent(props: any) {
  return null
}
