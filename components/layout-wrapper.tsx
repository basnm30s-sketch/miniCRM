'use client'

import { Sidebar } from './sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  // Sidebar always visible like in inspiration design
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}
