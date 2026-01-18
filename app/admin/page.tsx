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
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'seal' | 'signature' | null>(null)

  // Load settings and check branding files
  useEffect(() => {
    async function loadData() {
      try {
        // Load admin settings from database
        const stored = await getAdminSettings()
        if (stored) {
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
            showVehicleDashboard: (stored as any).showVehicleFinances === false || (stored as any).showVehicleFinances === 0
              ? false
              : ((stored as any).showVehicleFinances === true || (stored as any).showVehicleFinances === 1 ? true : false),
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
        <p>Failed to load settings</p>
      </div>
    )
  }

  // Generate branding image URLs
  const logoUrl = getBrandingUrl('logo', branding.extensions.logo)
  const sealUrl = getBrandingUrl('seal', branding.extensions.seal)
  const signatureUrl = getBrandingUrl('signature', branding.extensions.signature)

  return (
    <div className="space-y-6 p-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-gray-500">Manage company profile and branding for quotes</p>
      </div>

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>
            Basic information about your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="ALMSAR ALZAKI TRANSPORT AND MAINTENANCE"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Street address, City, Country"
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="vatNumber">TRN:</Label>
            <Input
              id="vatNumber"
              value={settings.vatNumber}
              onChange={(e) => handleInputChange('vatNumber', e.target.value)}
              placeholder="e.g., AE123456789"
            />
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={settings.currency}
              readOnly
              disabled
              className="bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">Currency is fixed to AED</p>
          </div>

          <div>
            <Label htmlFor="quoteNumberPattern">Quote Number Pattern</Label>
            <Input
              id="quoteNumberPattern"
              value={settings.quoteNumberPattern}
              onChange={(e) => handleInputChange('quoteNumberPattern', e.target.value)}
              placeholder="AAT-YYYYMMDD-NNNN"
            />
            <p className="text-sm text-gray-500 mt-1">
              Use YYYY (year), MM (month), DD (day), NNNN (number)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Default Terms & Conditions</CardTitle>
          <CardDescription>These terms will be used as the default when creating a new quote.</CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={settings.defaultTerms || ''}
            onChange={(html) => handleInputChange('defaultTerms' as keyof typeof settings, html)}
            placeholder="Default terms and conditions (will be copied into new quotes)."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Branding Images */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Upload logo, seal and signature images (stored as files, auto-used in documents)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div>
            <Label htmlFor="logo">Logo (for header)</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logo')}
              disabled={uploading === 'logo'}
              className="mb-2"
            />
            {uploading === 'logo' && <p className="text-sm text-primary">Uploading...</p>}
            {branding.logo && logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{ maxHeight: '80px', maxWidth: '200px' }}
                  className="border rounded p-2"
                />
                <p className="text-sm text-action-excel mt-1">✓ Logo uploaded</p>
              </div>
            )}
            {!branding.logo && (
              <p className="text-sm text-gray-500 mt-1">No logo uploaded yet</p>
            )}
            <p className="text-sm text-gray-500 mt-1">Max size: 2MB. Recommended: PNG or JPG</p>
          </div>

          {/* Seal */}
          <div>
            <Label htmlFor="seal">Seal (for header)</Label>
            <Input
              id="seal"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'seal')}
              disabled={uploading === 'seal'}
              className="mb-2"
            />
            {uploading === 'seal' && <p className="text-sm text-primary">Uploading...</p>}
            {branding.seal && sealUrl && (
              <div className="mt-2">
                <img
                  src={sealUrl}
                  alt="Seal preview"
                  style={{ maxHeight: '100px', maxWidth: '100px' }}
                  className="border rounded p-2"
                />
                <p className="text-sm text-action-excel mt-1">✓ Seal uploaded</p>
              </div>
            )}
            {!branding.seal && (
              <p className="text-sm text-gray-500 mt-1">No seal uploaded yet</p>
            )}
            <p className="text-sm text-gray-500 mt-1">Max size: 2MB. Recommended: PNG with transparency</p>
          </div>

          {/* Signature */}
          <div>
            <Label htmlFor="signature">Signature (for footer)</Label>
            <Input
              id="signature"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'signature')}
              disabled={uploading === 'signature'}
              className="mb-2"
            />
            {uploading === 'signature' && <p className="text-sm text-blue-600">Uploading...</p>}
            {branding.signature && signatureUrl && (
              <div className="mt-2">
                <img
                  src={signatureUrl}
                  alt="Signature preview"
                  style={{ maxHeight: '60px', maxWidth: '150px' }}
                  className="border rounded p-2"
                />
                <p className="text-sm text-green-600 mt-1">✓ Signature uploaded</p>
              </div>
            )}
            {!branding.signature && (
              <p className="text-sm text-gray-500 mt-1">No signature uploaded yet</p>
            )}
            <p className="text-sm text-gray-500 mt-1">Max size: 2MB. Recommended: PNG with transparency</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Control which sections are displayed on the home screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sidebar & Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Sidebar & Navigation</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showReports">Show Reports Menu</Label>
                <p className="text-sm text-gray-500">
                  Display the Reports menu item in the sidebar
                </p>
              </div>
              <Switch
                id="showReports"
                checked={settings.showReports === true}
                onCheckedChange={(checked) => handleInputChange('showReports', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showVehicleDashboard">Show Vehicle Dashboard</Label>
                <p className="text-sm text-gray-500">
                  Display the Vehicle Dashboard menu item in the sidebar
                </p>
              </div>
              <Switch
                id="showVehicleDashboard"
                checked={settings.showVehicleDashboard === true}
                onCheckedChange={(checked) => handleInputChange('showVehicleDashboard', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showQuotationsTwoPane">Quotations Two-Pane View</Label>
                <p className="text-sm text-gray-500">
                  Display quotations in two-pane layout (list + detail). Disable for table-only view.
                </p>
              </div>
              <Switch
                id="showQuotationsTwoPane"
                checked={settings.showQuotationsTwoPane === true}
                onCheckedChange={(checked) => handleInputChange('showQuotationsTwoPane', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showPurchaseOrdersTwoPane">Purchase Orders Two-Pane View</Label>
                <p className="text-sm text-gray-500">
                  Display purchase orders in two-pane layout (list + detail). Disable for table-only view.
                </p>
              </div>
              <Switch
                id="showPurchaseOrdersTwoPane"
                checked={settings.showPurchaseOrdersTwoPane === true}
                onCheckedChange={(checked) => handleInputChange('showPurchaseOrdersTwoPane', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showInvoicesTwoPane">Invoices Two-Pane View</Label>
                <p className="text-sm text-gray-500">
                  Display invoices in two-pane layout (list + detail). Disable for table-only view.
                </p>
              </div>
              <Switch
                id="showInvoicesTwoPane"
                checked={settings.showInvoicesTwoPane === true}
                onCheckedChange={(checked) => handleInputChange('showInvoicesTwoPane', checked)}
              />
            </div>
          </div>

          {/* Top Section */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Section</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showQuickActions">Show Quick Actions</Label>
                <p className="text-sm text-gray-500">
                  Display the quick actions section on the home screen
                </p>
              </div>
              <Switch
                id="showQuickActions"
                checked={settings.showQuickActions === true}
                onCheckedChange={(checked) => handleInputChange('showQuickActions', checked)}
              />
            </div>
          </div>

          {/* Overview Cards */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Overview Cards (Top Row)</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showQuotationsInvoicesCard">Show Quotations & Invoices Card</Label>
                <p className="text-sm text-gray-500">
                  Display the Quotations & Invoices overview card
                </p>
              </div>
              <Switch
                id="showQuotationsInvoicesCard"
                checked={settings.showQuotationsInvoicesCard === true}
                onCheckedChange={(checked) => handleInputChange('showQuotationsInvoicesCard', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showEmployeeSalariesCard">Show Employee Salaries Card</Label>
                <p className="text-sm text-gray-500">
                  Display the Employee Salaries overview card
                </p>
              </div>
              <Switch
                id="showEmployeeSalariesCard"
                checked={settings.showEmployeeSalariesCard === true}
                onCheckedChange={(checked) => handleInputChange('showEmployeeSalariesCard', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showVehicleRevenueExpensesCard">Show Vehicle Revenue & Expenses Card</Label>
                <p className="text-sm text-gray-500">
                  Display the Vehicle Revenue & Expenses overview card
                </p>
              </div>
              <Switch
                id="showVehicleRevenueExpensesCard"
                checked={settings.showVehicleRevenueExpensesCard === true}
                onCheckedChange={(checked) => handleInputChange('showVehicleRevenueExpensesCard', checked)}
              />
            </div>
          </div>

          {/* KPIs */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Performance Indicators (Middle Row)</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showActivityThisMonth">Show Activity This Month</Label>
                <p className="text-sm text-gray-500">
                  Display the Activity This Month metrics section
                </p>
              </div>
              <Switch
                id="showActivityThisMonth"
                checked={settings.showActivityThisMonth === true}
                onCheckedChange={(checked) => handleInputChange('showActivityThisMonth', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showFinancialHealth">Show Financial Health</Label>
                <p className="text-sm text-gray-500">
                  Display the Financial Health metrics section
                </p>
              </div>
              <Switch
                id="showFinancialHealth"
                checked={settings.showFinancialHealth === true}
                onCheckedChange={(checked) => handleInputChange('showFinancialHealth', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showBusinessOverview">Show Business Overview</Label>
                <p className="text-sm text-gray-500">
                  Display the Business Overview metrics section
                </p>
              </div>
              <Switch
                id="showBusinessOverview"
                checked={settings.showBusinessOverview === true}
                onCheckedChange={(checked) => handleInputChange('showBusinessOverview', checked)}
              />
            </div>
          </div>

          {/* Analytics & Reports */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Analytics & Reports (Bottom Section)</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showRevenueTrend">Show Revenue Trend Chart</Label>
                <p className="text-sm text-gray-500">
                  Display the revenue trend chart
                </p>
              </div>
              <Switch
                id="showRevenueTrend"
                checked={settings.showRevenueTrend === true}
                onCheckedChange={(checked) => handleInputChange('showRevenueTrend', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showTopCustomers">Show Top Customers by Value</Label>
                <p className="text-sm text-gray-500">
                  Display the Top Customers by Value card
                </p>
              </div>
              <Switch
                id="showTopCustomers"
                checked={settings.showTopCustomers === true}
                onCheckedChange={(checked) => handleInputChange('showTopCustomers', checked)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="showActivitySummary">Show Activity Summary</Label>
                <p className="text-sm text-gray-500">
                  Display the Activity Summary card
                </p>
              </div>
              <Switch
                id="showActivitySummary"
                checked={settings.showActivitySummary === true}
                onCheckedChange={(checked) => handleInputChange('showActivitySummary', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Footer Settings</CardTitle>
          <CardDescription>
            Configure footer address and contact details for PDF documents (English and Arabic)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="footerAddressEnglish">Footer Address (English)</Label>
            <Textarea
              id="footerAddressEnglish"
              value={settings.footerAddressEnglish || ''}
              onChange={(e) => handleInputChange('footerAddressEnglish' as keyof typeof settings, e.target.value)}
              placeholder="Company address in English"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="footerAddressArabic">Footer Address (Arabic)</Label>
            <Textarea
              id="footerAddressArabic"
              value={settings.footerAddressArabic || ''}
              onChange={(e) => handleInputChange('footerAddressArabic' as keyof typeof settings, e.target.value)}
              placeholder="عنوان الشركة بالعربية"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="footerContactEnglish">Footer Contact Details (English)</Label>
            <Textarea
              id="footerContactEnglish"
              value={settings.footerContactEnglish || ''}
              onChange={(e) => handleInputChange('footerContactEnglish' as keyof typeof settings, e.target.value)}
              placeholder="Phone, Email, Website in English"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="footerContactArabic">Footer Contact Details (Arabic)</Label>
            <Textarea
              id="footerContactArabic"
              value={settings.footerContactArabic || ''}
              onChange={(e) => handleInputChange('footerContactArabic' as keyof typeof settings, e.target.value)}
              placeholder="الهاتف، البريد الإلكتروني، الموقع الإلكتروني بالعربية"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-2 z-10 shadow-sm mt-6">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
