import type { ComponentPropsWithoutRef } from 'react'

type SvgProps = ComponentPropsWithoutRef<'svg'>

/**
 * Minimal Dirham indicator icon: a Lucide-style stroked "D".
 * Use the same sizing/className pattern as lucide-react icons.
 */
export function DirhamIcon({ className, ...props }: SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M9 5v14h4.5a6.5 7 0 0 0 0-14H9z" />
    </svg>
  )
}


