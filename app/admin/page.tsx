'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { toast } from '@/hooks/use-toast'
import { getAdminSettings, saveAdminSettings, initializeAdminSettings } from '@/lib/storage'
import { checkBrandingFiles, uploadBrandingFile, getBrandingUrl } from '@/lib/api-client'
import { AdminSettings } from '@/lib/types'

// Branding files state (separate from admin settings - stored as files, not in database)
interface BrandingState {
  logo: boolean
  seal: boolean
  signature: boolean
  extensions: { logo: string | null; seal: string | null; signature: string | null }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [branding, setBranding] = useState<BrandingState>({
    logo: false, seal: false, signature: false,
    extensions: { logo: null, seal: null, signature: null }
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'seal' | 'signature' | null>(null)

  // Load settings and check branding files
  useEffect(() => {
    async function loadData() {
      try {
        setLoadError(null)
        // Load admin settings from database
        const stored = await getAdminSettings()
        if (stored) {
          // Backward compatibility: newer API returns `showVehicleDashboard`,
          // older/legacy payloads may still include `showVehicleFinances`.
          const rawShowVehicleDashboard =
            (stored as any).showVehicleDashboard ?? (stored as any).showVehicleFinances

          const settingsWithBooleans: AdminSettings = {
            ...stored,
            showRevenueTrend: (stored as any).showRevenueTrend === false || (stored as any).showRevenueTrend === 0
              ? false
              : ((stored as any).showRevenueTrend === true || (stored as any).showRevenueTrend === 1 ? true : false),
            showQuickActions: (stored as any).showQuickActions === false || (stored as any).showQuickActions === 0
              ? false
              : ((stored as any).showQuickActions === true || (stored as any).showQuickActions === 1 ? true : false),
            showReports: (stored as any).showReports === false || (stored as any).showReports === 0
              ? false
              : ((stored as any).showReports === true || (stored as any).showReports === 1 ? true : false),
            showVehicleDashboard: rawShowVehicleDashboard === false || rawShowVehicleDashboard === 0
              ? false
              : (rawShowVehicleDashboard === true || rawShowVehicleDashboard === 1 ? true : false),
            showQuotationsInvoicesCard: (stored as any).showQuotationsInvoicesCard === false || (stored as any).showQuotationsInvoicesCard === 0
              ? false
              : ((stored as any).showQuotationsInvoicesCard === true || (stored as any).showQuotationsInvoicesCard === 1 ? true : true),
            showEmployeeSalariesCard: (stored as any).showEmployeeSalariesCard === false || (stored as any).showEmployeeSalariesCard === 0
              ? false
              : ((stored as any).showEmployeeSalariesCard === true || (stored as any).showEmployeeSalariesCard === 1 ? true : false),
            showVehicleRevenueExpensesCard: (stored as any).showVehicleRevenueExpensesCard === false || (stored as any).showVehicleRevenueExpensesCard === 0
              ? false
              : ((stored as any).showVehicleRevenueExpensesCard === true || (stored as any).showVehicleRevenueExpensesCard === 1 ? true : false),
            showActivityThisMonth: (stored as any).showActivityThisMonth === false || (stored as any).showActivityThisMonth === 0
              ? false
              : ((stored as any).showActivityThisMonth === true || (stored as any).showActivityThisMonth === 1 ? true : false),
            showFinancialHealth: (stored as any).showFinancialHealth === false || (stored as any).showFinancialHealth === 0
              ? false
              : ((stored as any).showFinancialHealth === true || (stored as any).showFinancialHealth === 1 ? true : true),
            showBusinessOverview: (stored as any).showBusinessOverview === false || (stored as any).showBusinessOverview === 0
              ? false
              : ((stored as any).showBusinessOverview === true || (stored as any).showBusinessOverview === 1 ? true : true),
            showTopCustomers: (stored as any).showTopCustomers === false || (stored as any).showTopCustomers === 0
              ? false
              : ((stored as any).showTopCustomers === true || (stored as any).showTopCustomers === 1 ? true : false),
            showActivitySummary: (stored as any).showActivitySummary === false || (stored as any).showActivitySummary === 0
              ? false
              : ((stored as any).showActivitySummary === true || (stored as any).showActivitySummary === 1 ? true : false),
            showQuotationsTwoPane: (stored as any).showQuotationsTwoPane === false || (stored as any).showQuotationsTwoPane === 0
              ? false
              : ((stored as any).showQuotationsTwoPane === true || (stored as any).showQuotationsTwoPane === 1 
                ? true 
                : ((stored as any).showQuotationsTwoPane === null || (stored as any).showQuotationsTwoPane === undefined) 
                  ? true 
                  : false),
            showPurchaseOrdersTwoPane: (stored as any).showPurchaseOrdersTwoPane === false || (stored as any).showPurchaseOrdersTwoPane === 0
              ? false
              : ((stored as any).showPurchaseOrdersTwoPane === true || (stored as any).showPurchaseOrdersTwoPane === 1 
                ? true 
                : ((stored as any).showPurchaseOrdersTwoPane === null || (stored as any).showPurchaseOrdersTwoPane === undefined) 
                  ? true 
                  : false),
            showInvoicesTwoPane: (stored as any).showInvoicesTwoPane === false || (stored as any).showInvoicesTwoPane === 0
              ? false
              : ((stored as any).showInvoicesTwoPane === true || (stored as any).showInvoicesTwoPane === 1 
                ? true 
                : ((stored as any).showInvoicesTwoPane === null || (stored as any).showInvoicesTwoPane === undefined) 
                  ? true 
                  : false),
          }
          setSettings(settingsWithBooleans)
        } else {
          const initialized = await initializeAdminSettings()
          setSettings(initialized)
        }

        // Check which branding files exist (separate from database)
        const brandingStatus = await checkBrandingFiles()
        console.log('Branding files status:', brandingStatus)
        setBranding(brandingStatus)
      } catch (err) {
        console.error('Failed to load data:', err)
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle branding image upload
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    brandingType: 'logo' | 'seal' | 'signature'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Validation', description: 'Please select an image file', variant: 'destructive' })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Validation', description: 'File size must be less than 2MB', variant: 'destructive' })
      return
    }

    setUploading(brandingType)
    try {
      // Upload file to fixed location
      await uploadBrandingFile(file, brandingType)

      // Refresh branding status
      const brandingStatus = await checkBrandingFiles()
      setBranding(brandingStatus)

      toast({
        title: 'Upload',
        description: `${brandingType.charAt(0).toUpperCase() + brandingType.slice(1)} uploaded successfully`
      })
    } catch (err: any) {
      console.error('Failed to upload image:', err)
      toast({ title: 'Error', description: err.message || 'Failed to upload image', variant: 'destructive' })
    } finally {
      setUploading(null)
      // Clear the input so the same file can be uploaded again
      e.target.value = ''
    }
  }

  const handleInputChange = (field: keyof AdminSettings, value: string | boolean) => {
    if (settings) {
      setSettings({
        ...settings,
        [field]: value,
      })
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      // Save settings (without branding paths - those are file-based now)
      const settingsToSave: AdminSettings = {
        ...settings,
        showRevenueTrend: settings.showRevenueTrend === true ? true : false,
        showQuickActions: settings.showQuickActions === true ? true : false,
        showReports: settings.showReports === true ? true : false,
        showVehicleDashboard: settings.showVehicleDashboard === true ? true : false,
        showQuotationsInvoicesCard: settings.showQuotationsInvoicesCard === true ? true : false,
        showEmployeeSalariesCard: settings.showEmployeeSalariesCard === true ? true : false,
        showVehicleRevenueExpensesCard: settings.showVehicleRevenueExpensesCard === true ? true : false,
        showActivityThisMonth: settings.showActivityThisMonth === true ? true : false,
        showFinancialHealth: settings.showFinancialHealth === true ? true : false,
        showBusinessOverview: settings.showBusinessOverview === true ? true : false,
        showTopCustomers: settings.showTopCustomers === true ? true : false,
        showActivitySummary: settings.showActivitySummary === true ? true : false,
        showQuotationsTwoPane: settings.showQuotationsTwoPane === true ? true : false,
        showPurchaseOrdersTwoPane: settings.showPurchaseOrdersTwoPane === true ? true : false,
        showInvoicesTwoPane: settings.showInvoicesTwoPane === true ? true : false,
        updatedAt: new Date().toISOString(),
      }

      await saveAdminSettings(settingsToSave)
      toast({ title: 'Saved', description: 'Settings saved successfully' })
      
      // Dispatch event to notify sidebar and other components to reload settings
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adminSettingsUpdated'))
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-8">
        <div className="space-y-3">
          <p>Failed to load settings</p>
          {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
          <Button
            onClick={() => {
              setLoading(true)
              // Re-run the same load logic by reloading the page-level data
              // (simple and reliable in packaged builds)
              window.location.reload()
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Generate branding image URLs
  const logoUrl = getBrandingUrl('logo', branding.extensions.logo)
  const sealUrl = getBrandingUrl('seal', branding.extensions.seal)
  const signatureUrl = getBrandingUrl('signature', branding.extensions.signature)

  const jumpLinks = [
    { href: '#company', label: 'Company' },
    { href: '#branding', label: 'Branding' },
    { href: '#terms', label: 'Default Terms' },
    { href: '#configuration', label: 'Home Configuration' },
    { href: '#pdfFooter', label: 'PDF Footer' },
  ] as const

  const ToggleRow = ({
    id,
    label,
    description,
    checked,
    onCheckedChange,
  }: {
    id: string
    label: string
    description: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
  }) => {
    return (
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-0.5">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    )
  }

  const BrandingUploadTile = ({
    id,
    title,
    helpText,
    uploaded,
    uploadingThis,
    previewUrl,
    onFileChange,
  }: {
    id: 'logo' | 'seal' | 'signature'
    title: string
    helpText: string
    uploaded: boolean
    uploadingThis: boolean
    previewUrl: string | null
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  }) => {
    const handleChooseFile = () => {
      const input = document.getElementById(id) as HTMLInputElement | null
      input?.click()
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor={id} className="text-sm font-semibold text-gray-900">
              {title}
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleChooseFile}
            disabled={uploadingThis}
          >
            {uploadingThis ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
          </Button>
          <Input
            id={id}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={uploadingThis}
            className="sr-only"
          />
        </div>

        <div className="mt-3 flex h-24 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2">
          {uploaded && previewUrl ? (
            <img
              src={previewUrl}
              alt={`${title} preview`}
              className="max-h-20 max-w-full object-contain"
            />
          ) : (
            <p className="text-xs text-gray-500">No image uploaded</p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {uploaded ? (
            <p className="text-xs text-action-excel">✓ Uploaded</p>
          ) : (
            <p className="text-xs text-gray-500">Not uploaded</p>
          )}
        </div>

        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24">
      <div className="-mx-6 mb-6 sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        {/* Desktop sticky “Jump to” */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Jump to</p>
            <div className="mt-3 space-y-1">
              {jumpLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="block rounded px-2 py-1 text-sm text-gray-700 hover:bg-slate-50 hover:text-gray-900"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="space-y-6">
          {/* Mobile jump links */}
          <div className="lg:hidden rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-900">Jump to</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {jumpLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-gray-700 hover:bg-slate-50"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Company + Branding */}
          <div className="grid items-stretch gap-6 xl:grid-cols-2">
            <section id="company" className="scroll-mt-24 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>Basic information about your company</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={settings.companyName ?? ''}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        placeholder="ALMSAR ALZAKI TRANSPORT AND MAINTENANCE"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={settings.address ?? ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street address, City, Country"
                        rows={5}
                      />
                    </div>

                    <div>
                      <Label htmlFor="vatNumber">TRN:</Label>
                      <Input
                        id="vatNumber"
                        value={settings.vatNumber ?? ''}
                        onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                        placeholder="e.g., AE123456789"
                      />
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={settings.currency ?? ''}
                        readOnly
                        disabled
                        className="bg-gray-100"
                      />
                      <p className="mt-1 text-sm text-gray-500">Currency is fixed to AED</p>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="quoteNumberPattern">Doc Number Pattern</Label>
                      <Input
                        id="quoteNumberPattern"
                        value={settings.quoteNumberPattern ?? ''}
                        onChange={(e) => handleInputChange('quoteNumberPattern', e.target.value)}
                        placeholder="AAT-YYYYMMDD-NNNN"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Use YYYY (year), MM (month), DD (day), NNNN (number)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="branding" className="scroll-mt-24 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>
                    Upload logo, seal and signature images (stored as files, auto-used in documents)
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <BrandingUploadTile
                      id="logo"
                      title="Logo (for header)"
                      helpText="Max size: 2MB. Recommended: PNG or JPG"
                      uploaded={branding.logo}
                      uploadingThis={uploading === 'logo'}
                      previewUrl={logoUrl}
                      onFileChange={(e) => handleImageUpload(e, 'logo')}
                    />
                    <BrandingUploadTile
                      id="seal"
                      title="Seal (for header)"
                      helpText="Max size: 2MB. Recommended: PNG with transparency"
                      uploaded={branding.seal}
                      uploadingThis={uploading === 'seal'}
                      previewUrl={sealUrl}
                      onFileChange={(e) => handleImageUpload(e, 'seal')}
                    />
                    <BrandingUploadTile
                      id="signature"
                      title="Signature (for footer)"
                      helpText="Max size: 2MB. Recommended: PNG with transparency"
                      uploaded={branding.signature}
                      uploadingThis={uploading === 'signature'}
                      previewUrl={signatureUrl}
                      onFileChange={(e) => handleImageUpload(e, 'signature')}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Default Terms & Conditions */}
          <section id="terms" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>Default Terms & Conditions</CardTitle>
                <CardDescription>
                  Save different defaults per document type. These will be copied into new documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Quotations (default)</Label>
                    <RichTextEditor
                      value={settings.defaultTerms || ''}
                      onChange={(html) => handleInputChange('defaultTerms' as keyof typeof settings, html)}
                      placeholder="Default terms and conditions for quotations."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Invoices</Label>
                    <RichTextEditor
                      value={(settings.defaultInvoiceTerms ?? settings.defaultTerms ?? '') as string}
                      onChange={(html) => handleInputChange('defaultInvoiceTerms' as keyof typeof settings, html)}
                      placeholder="Default terms and conditions for invoices."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Purchase Orders</Label>
                    <RichTextEditor
                      value={(settings.defaultPurchaseOrderTerms ?? settings.defaultTerms ?? '') as string}
                      onChange={(html) => handleInputChange('defaultPurchaseOrderTerms' as keyof typeof settings, html)}
                      placeholder="Default terms and conditions for purchase orders."
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Configuration */}
          <section id="configuration" className="scroll-mt-24">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Home Configuration</h2>
              <p className="text-sm text-gray-500">Control which sections are displayed on the home screen</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sidebar & Navigation</CardTitle>
                  <CardDescription>What shows up in the sidebar navigation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showReports"
                    label="Show Reports Menu"
                    description="Display the Reports menu item in the sidebar"
                    checked={settings.showReports === true}
                    onCheckedChange={(checked) => handleInputChange('showReports', checked)}
                  />
                  <ToggleRow
                    id="showVehicleDashboard"
                    label="Show Vehicle Dashboard"
                    description="Display the Vehicle Dashboard menu item in the sidebar"
                    checked={settings.showVehicleDashboard === true}
                    onCheckedChange={(checked) => handleInputChange('showVehicleDashboard', checked)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Document list views</CardTitle>
                  <CardDescription>Choose two-pane vs table-only views.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showQuotationsTwoPane"
                    label="Quotations Two-Pane View"
                    description="Display quotations in two-pane layout (list + detail). Disable for table-only view."
                    checked={settings.showQuotationsTwoPane === true}
                    onCheckedChange={(checked) => handleInputChange('showQuotationsTwoPane', checked)}
                  />
                  <ToggleRow
                    id="showPurchaseOrdersTwoPane"
                    label="Purchase Orders Two-Pane View"
                    description="Display purchase orders in two-pane layout (list + detail). Disable for table-only view."
                    checked={settings.showPurchaseOrdersTwoPane === true}
                    onCheckedChange={(checked) => handleInputChange('showPurchaseOrdersTwoPane', checked)}
                  />
                  <ToggleRow
                    id="showInvoicesTwoPane"
                    label="Invoices Two-Pane View"
                    description="Display invoices in two-pane layout (list + detail). Disable for table-only view."
                    checked={settings.showInvoicesTwoPane === true}
                    onCheckedChange={(checked) => handleInputChange('showInvoicesTwoPane', checked)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top section</CardTitle>
                  <CardDescription>Controls what appears at the top of Home.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showQuickActions"
                    label="Show Quick Actions"
                    description="Display the quick actions section on the home screen"
                    checked={settings.showQuickActions === true}
                    onCheckedChange={(checked) => handleInputChange('showQuickActions', checked)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overview cards</CardTitle>
                  <CardDescription>Top row cards on the Home dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showQuotationsInvoicesCard"
                    label="Show Quotations & Invoices Card"
                    description="Display the Quotations & Invoices overview card"
                    checked={settings.showQuotationsInvoicesCard === true}
                    onCheckedChange={(checked) => handleInputChange('showQuotationsInvoicesCard', checked)}
                  />
                  <ToggleRow
                    id="showEmployeeSalariesCard"
                    label="Show Employee Salaries Card"
                    description="Display the Employee Salaries overview card"
                    checked={settings.showEmployeeSalariesCard === true}
                    onCheckedChange={(checked) => handleInputChange('showEmployeeSalariesCard', checked)}
                  />
                  <ToggleRow
                    id="showVehicleRevenueExpensesCard"
                    label="Show Vehicle Revenue & Expenses Card"
                    description="Display the Vehicle Revenue & Expenses overview card"
                    checked={settings.showVehicleRevenueExpensesCard === true}
                    onCheckedChange={(checked) => handleInputChange('showVehicleRevenueExpensesCard', checked)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">KPIs</CardTitle>
                  <CardDescription>Middle row KPI sections.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showActivityThisMonth"
                    label="Show Activity This Month"
                    description="Display the Activity This Month metrics section"
                    checked={settings.showActivityThisMonth === true}
                    onCheckedChange={(checked) => handleInputChange('showActivityThisMonth', checked)}
                  />
                  <ToggleRow
                    id="showFinancialHealth"
                    label="Show Financial Health"
                    description="Display the Financial Health metrics section"
                    checked={settings.showFinancialHealth === true}
                    onCheckedChange={(checked) => handleInputChange('showFinancialHealth', checked)}
                  />
                  <ToggleRow
                    id="showBusinessOverview"
                    label="Show Business Overview"
                    description="Display the Business Overview metrics section"
                    checked={settings.showBusinessOverview === true}
                    onCheckedChange={(checked) => handleInputChange('showBusinessOverview', checked)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analytics & Reports</CardTitle>
                  <CardDescription>Bottom section analytics cards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow
                    id="showRevenueTrend"
                    label="Show Revenue Trend Chart"
                    description="Display the revenue trend chart"
                    checked={settings.showRevenueTrend === true}
                    onCheckedChange={(checked) => handleInputChange('showRevenueTrend', checked)}
                  />
                  <ToggleRow
                    id="showTopCustomers"
                    label="Show Top Customers by Value"
                    description="Display the Top Customers by Value card"
                    checked={settings.showTopCustomers === true}
                    onCheckedChange={(checked) => handleInputChange('showTopCustomers', checked)}
                  />
                  <ToggleRow
                    id="showActivitySummary"
                    label="Show Activity Summary"
                    description="Display the Activity Summary card"
                    checked={settings.showActivitySummary === true}
                    onCheckedChange={(checked) => handleInputChange('showActivitySummary', checked)}
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Footer Settings */}
          <section id="pdfFooter" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>PDF Footer Settings</CardTitle>
                <CardDescription>
                  Configure footer address and contact details for PDF documents (English and Arabic)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">English</h4>
                    <div>
                      <Label htmlFor="footerAddressEnglish">Footer Address (English)</Label>
                      <Textarea
                        id="footerAddressEnglish"
                        value={settings.footerAddressEnglish || ''}
                        onChange={(e) =>
                          handleInputChange('footerAddressEnglish' as keyof typeof settings, e.target.value)
                        }
                        placeholder="Company address in English"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="footerContactEnglish">Footer Contact Details (English)</Label>
                      <Textarea
                        id="footerContactEnglish"
                        value={settings.footerContactEnglish || ''}
                        onChange={(e) =>
                          handleInputChange('footerContactEnglish' as keyof typeof settings, e.target.value)
                        }
                        placeholder="Phone, Email, Website in English"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">Arabic</h4>
                    <div>
                      <Label htmlFor="footerAddressArabic">Footer Address (Arabic)</Label>
                      <Textarea
                        id="footerAddressArabic"
                        value={settings.footerAddressArabic || ''}
                        onChange={(e) =>
                          handleInputChange('footerAddressArabic' as keyof typeof settings, e.target.value)
                        }
                        placeholder="عنوان الشركة بالعربية"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="footerContactArabic">Footer Contact Details (Arabic)</Label>
                      <Textarea
                        id="footerContactArabic"
                        value={settings.footerContactArabic || ''}
                        onChange={(e) =>
                          handleInputChange('footerContactArabic' as keyof typeof settings, e.target.value)
                        }
                        placeholder="الهاتف، البريد الإلكتروني، الموقع الإلكتروني بالعربية"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 z-10 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-white p-4 shadow-sm">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
