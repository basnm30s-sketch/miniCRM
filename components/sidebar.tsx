'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  ShoppingCart,
  Menu,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

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
  {
    label: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ShoppingCart,
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

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
  onClose?: () => void
}

export function Sidebar({ isExpanded, onToggle, onClose }: SidebarProps) {
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

  // Reusable function to load settings with defaults
  const loadSettings = useCallback(async () => {
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
          showVehicleDashboard: settings.showVehicleDashboard !== undefined
            ? (typeof settings.showVehicleDashboard === 'boolean'
              ? settings.showVehicleDashboard
              : Boolean(settings.showVehicleDashboard))
            : true,
        }
        setAdminSettings(settingsWithDefaults)
      }
    } catch (error) {
      console.error('Error loading settings in sidebar:', error)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [pathname, loadSettings]) // Reload when pathname changes (e.g., navigating back from admin)

  // Also reload settings when window gains focus (user returns to tab)
  useEffect(() => {
    window.addEventListener('focus', loadSettings)
    return () => window.removeEventListener('focus', loadSettings)
  }, [loadSettings])

  // Listen for admin settings updates (when settings are saved from admin page)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettings()
    }
    
    window.addEventListener('adminSettingsUpdated', handleSettingsUpdate)
    return () => window.removeEventListener('adminSettingsUpdated', handleSettingsUpdate)
  }, [loadSettings])

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

  // Close sidebar on mobile when navigating
  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onClose) {
      onClose()
    }
  }

  // Render icon with tooltip wrapper
  const IconWithTooltip = ({ 
    icon: Icon, 
    label, 
    children 
  }: { 
    icon: React.ComponentType<{ className?: string }>, 
    label: string, 
    children: React.ReactNode 
  }) => {
    if (isExpanded) {
      return <>{children}</>
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-slate-900 text-white">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider>
      <aside
        className={`bg-[#001f3f] text-white min-h-screen fixed left-0 top-0 flex flex-col border-r border-blue-800 z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo / Brand / Hamburger */}
        <div className={`border-b border-blue-800 ${isExpanded ? 'p-6' : 'p-4'}`}>
          {isExpanded ? (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 text-white hover:bg-blue-900/50 -ml-2"
                aria-label="Collapse sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
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
                <div className="text-xs text-blue-200">Transport and Maintenance</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 text-white hover:bg-blue-900/50"
                aria-label="Expand sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
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
            </div>
          )}
        </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 space-y-1 overflow-y-auto ${isExpanded ? 'p-4' : 'p-2'}`}>
        {/* Home */}
        <IconWithTooltip icon={Home} label="Home">
          <Link
            href="/"
            onClick={handleLinkClick}
            className={`flex items-center rounded-lg transition-colors text-sm ${
              isExpanded 
                ? `gap-3 px-4 py-3 ${isHomeActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                : `justify-center p-3 ${isHomeActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
            }`}
          >
            <Home className="w-5 h-5" />
            {isExpanded && <span>Home</span>}
          </Link>
        </IconWithTooltip>

        {/* Vehicle Finances Section */}
        {(!adminSettings || adminSettings.showVehicleDashboard === true) && (
          <IconWithTooltip icon={BarChart3} label="Vehicle Dashboard">
            <Link
              href="/vehicle-dashboard"
              onClick={handleLinkClick}
              className={`flex items-center rounded-lg transition-colors text-sm ${
                isExpanded
                  ? `gap-3 px-4 py-3 ${isActive('/vehicle-dashboard') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                  : `justify-center p-3 ${isActive('/vehicle-dashboard') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              {isExpanded && <span>Vehicle Dashboard</span>}
            </Link>
          </IconWithTooltip>
        )}
        <IconWithTooltip icon={Car} label="Vehicle Finances">
          <Link
            href="/vehicle-finances"
            onClick={handleLinkClick}
            className={`flex items-center rounded-lg transition-colors text-sm ${
              isExpanded
                ? `gap-3 px-4 py-3 ${isActive('/vehicle-finances') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                : `justify-center p-3 ${isActive('/vehicle-finances') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
            }`}
          >
            <Car className="w-5 h-5" />
            {isExpanded && <span>Vehicle Finances</span>}
          </Link>
        </IconWithTooltip>

        {/* Doc Generator Section - Collapsible */}
        {isExpanded ? (
          <Collapsible open={docGeneratorOpen} onOpenChange={setDocGeneratorOpen}>
            <CollapsibleTrigger
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${isAnyDocGeneratorActive
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
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${active
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
        ) : (
          // Collapsed: Show only main icon, clicking expands sidebar
          <IconWithTooltip icon={FileEdit} label="Doc Generator">
            <button
              onClick={onToggle}
              className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors text-sm ${
                isAnyDocGeneratorActive
                  ? 'bg-blue-700 text-white hover:bg-blue-600'
                  : 'text-blue-100 hover:bg-blue-900/50'
              }`}
            >
              <FileEdit className="w-5 h-5" />
            </button>
          </IconWithTooltip>
        )}

        {/* Masters Section - Collapsible */}
        {isExpanded ? (
          <Collapsible open={mastersOpen} onOpenChange={setMastersOpen}>
            <CollapsibleTrigger
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${isAnyMasterActive
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
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${active
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
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${isAnyFinancesActive
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
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${active
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
        ) : (
          // Collapsed: Show only main icon, clicking expands sidebar
          <IconWithTooltip icon={Database} label="Masters">
            <button
              onClick={onToggle}
              className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors text-sm ${
                isAnyMasterActive
                  ? 'bg-blue-700 text-white hover:bg-blue-600'
                  : 'text-blue-100 hover:bg-blue-900/50'
              }`}
            >
              <Database className="w-5 h-5" />
            </button>
          </IconWithTooltip>
        )}

        {/* Payslips - Standalone */}
        <IconWithTooltip icon={Wallet} label="Payslips">
          <Link
            href="/payslips"
            onClick={handleLinkClick}
            className={`flex items-center rounded-lg transition-colors text-sm ${
              isExpanded
                ? `gap-3 px-4 py-3 ${isActive('/payslips') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                : `justify-center p-3 ${isActive('/payslips') ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
            }`}
          >
            <Wallet className="w-5 h-5" />
            {isExpanded && <span>Payslips</span>}
          </Link>
        </IconWithTooltip>

        {/* Other Navigation Items */}
        {otherNavigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <IconWithTooltip key={item.href} icon={Icon} label={item.label}>
              <Link
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center rounded-lg transition-colors text-sm ${
                  isExpanded
                    ? `gap-3 px-4 py-3 ${active ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                    : `justify-center p-3 ${active ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-900/50'}`
                }`}
              >
                <Icon className="w-5 h-5" />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            </IconWithTooltip>
          )
        })}
      </nav>

      {/* Footer - User Profile */}
      <div className={`border-t border-blue-800 ${isExpanded ? 'p-4' : 'p-2'}`}>
        {isExpanded ? (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <Users2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-white">Almsar Alzaki</div>
              <div className="text-xs text-blue-200">almsar.uae@gmail.com</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <Users2 className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>
    </aside>
    </TooltipProvider>
  )
}
