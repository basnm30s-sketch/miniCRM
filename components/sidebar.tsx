'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Receipt,
  Users,
  Briefcase,
  Car,
  Users2,
  Banknote,
} from 'lucide-react'

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Quotations',
    href: '/quotations',
    icon: FileText,
  },
  {
    label: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ShoppingCart,
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: Receipt,
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    label: 'Vendors',
    href: '/vendors',
    icon: Briefcase,
  },
  {
    label: 'Vehicles',
    href: '/vehicles',
    icon: Car,
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users2,
  },
  {
    label: 'Payslips',
    href: '/payslips',
    icon: Banknote,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">
            CR
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Car Rental</div>
            <div className="text-xs text-slate-400">Single-user · On-prem</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm"
        >
          <div className="w-5 h-5 bg-slate-600 rounded-full" />
          <span>Admin</span>
        </Link>
      </div>
    </aside>
  )
}
