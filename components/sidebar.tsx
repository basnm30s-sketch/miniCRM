'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { getAdminSettings } from '@/lib/storage'
import type { AdminSettings } from '@/lib/types'
import {
  Home,
  FileText,
  CreditCard,
  Users,
  Briefcase,
  Car,
  Users2,
  BarChart3,
  Settings,
  FileEdit,
  ChevronDown,
  ChevronRight,
  Database,
  Wallet,
  TrendingUp,
  DollarSign,
  Tag,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const docGeneratorItems = [
  {
    label: 'Quotations',
    href: '/quotations',
    icon: FileText,
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: CreditCard,
  },
]

const masterNavigationItems = [
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
]

const financesNavigationItems = [
  {
    label: 'Expense Categories',
    href: '/finances/expense-categories',
    icon: Tag,
  },
]

const allOtherNavigationItems = [
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    href: '/admin',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [mastersOpen, setMastersOpen] = useState(() => {
    return masterNavigationItems.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    ) || financesNavigationItems.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
  })
  const [financesOpen, setFinancesOpen] = useState(() => {
    return financesNavigationItems.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
  })
  const [docGeneratorOpen, setDocGeneratorOpen] = useState(() => {
    return docGeneratorItems.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAdminSettings()
        if (settings) {
          // Ensure backward compatibility - default to true if not set
          const settingsWithDefaults: AdminSettings = {
            ...settings,
            showReports: settings.showReports !== undefined 
              ? (typeof settings.showReports === 'boolean' 
                  ? settings.showReports 
                  : Boolean(settings.showReports))
              : true,
          }
          setAdminSettings(settingsWithDefaults)
        }
      } catch (error) {
        console.error('Error loading settings in sidebar:', error)
      }
    }
    loadSettings()
  }, [pathname]) // Reload when pathname changes (e.g., navigating back from admin)

  // Also reload settings when window gains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const settings = await getAdminSettings()
        if (settings) {
          const settingsWithDefaults: AdminSettings = {
            ...settings,
            showReports: settings.showReports !== undefined 
              ? (typeof settings.showReports === 'boolean' 
                  ? settings.showReports 
                  : Boolean(settings.showReports))
              : true,
          }
          setAdminSettings(settingsWithDefaults)
        }
      } catch (error) {
        console.error('Error loading settings in sidebar on focus:', error)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Filter navigation items based on settings
  const otherNavigationItems = allOtherNavigationItems.filter((item) => {
    if (item.href === '/reports') {
      // Show Reports only if showReports is explicitly true
      // If settings haven't loaded yet (adminSettings is null), show by default
      if (adminSettings === null) return true
      return adminSettings.showReports === true
    }
    return true // Always show Settings
  })

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isAnyMasterActive = masterNavigationItems.some((item) => isActive(item.href)) || 
    financesNavigationItems.some((item) => isActive(item.href))
  const isAnyFinancesActive = financesNavigationItems.some((item) => isActive(item.href))
  const isAnyDocGeneratorActive = docGeneratorItems.some((item) => isActive(item.href))
  const isHomeActive = pathname === '/'

  return (
    <aside className="w-64 bg-[#001f3f] text-white min-h-screen fixed left-0 top-0 flex flex-col border-r border-blue-800 z-50">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/95 flex items-center justify-center overflow-hidden">
            <Image
              src="/almsar-logo.png"
              alt="Almsar Alzaki logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
            />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Almsar Alzaki</div>
            <div className="text-xs text-blue-200">Car Rental Management</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Home */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
            isHomeActive
              ? 'bg-blue-600 text-white'
              : 'text-blue-100 hover:bg-blue-900/50'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        {/* Vehicle Finances - Standalone */}
        <Link
          href="/vehicle-finances"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
            isActive('/vehicle-finances')
              ? 'bg-blue-600 text-white'
              : 'text-blue-100 hover:bg-blue-900/50'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Vehicle Finances</span>
        </Link>

        {/* Doc Generator Section - Collapsible */}
        <Collapsible open={docGeneratorOpen} onOpenChange={setDocGeneratorOpen}>
          <CollapsibleTrigger
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
              isAnyDocGeneratorActive
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'text-blue-100 hover:bg-blue-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileEdit className="w-5 h-5" />
              <span>Doc Generator</span>
            </div>
            {docGeneratorOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-4">
            {docGeneratorItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Masters Section - Collapsible */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen}>
          <CollapsibleTrigger
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
              isAnyMasterActive
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'text-blue-100 hover:bg-blue-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5" />
              <span>Masters</span>
            </div>
            {mastersOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 pl-4">
            {masterNavigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            {/* Finances Submenu - Nested under Masters */}
            <Collapsible open={financesOpen} onOpenChange={setFinancesOpen}>
              <CollapsibleTrigger
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                  isAnyFinancesActive
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'text-blue-100 hover:bg-blue-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4" />
                  <span>Finances</span>
                </div>
                {financesOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1 pl-4">
                {financesNavigationItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-blue-100 hover:bg-blue-900/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>

        {/* Payslips - Standalone */}
        <Link
          href="/payslips"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
            isActive('/payslips')
              ? 'bg-blue-600 text-white'
              : 'text-blue-100 hover:bg-blue-900/50'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>Payslips</span>
        </Link>

        {/* Other Navigation Items */}
        {otherNavigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100 hover:bg-blue-900/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer - User Profile */}
      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
            <Users2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-white">Almsar Alzaki</div>
            <div className="text-xs text-blue-200">almsar.uae@gmail.com</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
