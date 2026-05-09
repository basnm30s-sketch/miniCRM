import type { ReactNode } from 'react'

type DocGeneratorTwoPaneLayoutProps = {
  pageTitle: string
  pageSubtitle: string
  useTwoPane: boolean
  topRightAction?: ReactNode
  listPane: ReactNode
  detailPane?: ReactNode
  listOnlyContent?: ReactNode
}

export function DocGeneratorTwoPaneLayout({
  pageTitle,
  pageSubtitle,
  useTwoPane,
  topRightAction,
  listPane,
  detailPane,
  listOnlyContent,
}: DocGeneratorTwoPaneLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-500">{pageSubtitle}</p>
        </div>
        {!useTwoPane && topRightAction}
      </div>

      {useTwoPane ? (
        <div className="flex flex-1 overflow-hidden">
          {listPane}
          {detailPane}
        </div>
      ) : (
        listOnlyContent
      )}
    </div>
  )
}
