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
            showRevenueTrend: stored.showRevenueTrend === false || stored.showRevenueTrend === 0
              ? false
              : (stored.showRevenueTrend === true || stored.showRevenueTrend === 1 ? true : false),
            showQuickActions: stored.showQuickActions === false || stored.showQuickActions === 0
              ? false
              : (stored.showQuickActions === true || stored.showQuickActions === 1 ? true : false),
            showReports: stored.showReports === false || stored.showReports === 0
              ? false
              : (stored.showReports === true || stored.showReports === 1 ? true : false),
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
        updatedAt: new Date().toISOString(),
      }
      
      await saveAdminSettings(settingsToSave)
      toast({ title: 'Saved', description: 'Settings saved successfully' })
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
    <div className="space-y-6 p-6">
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
            {uploading === 'logo' && <p className="text-sm text-blue-600">Uploading...</p>}
            {branding.logo && logoUrl && (
              <div className="mt-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{ maxHeight: '80px', maxWidth: '200px' }}
                  className="border rounded p-2"
                />
                <p className="text-sm text-green-600 mt-1">✓ Logo uploaded</p>
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
            {uploading === 'seal' && <p className="text-sm text-blue-600">Uploading...</p>}
            {branding.seal && sealUrl && (
              <div className="mt-2">
                <img
                  src={sealUrl}
                  alt="Seal preview"
                  style={{ maxHeight: '100px', maxWidth: '100px' }}
                  className="border rounded p-2"
                />
                <p className="text-sm text-green-600 mt-1">✓ Seal uploaded</p>
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

      {/* Dashboard Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Settings</CardTitle>
          <CardDescription>
            Control which sections are displayed on the home screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showRevenueTrend">Show Revenue Trend Chart</Label>
              <p className="text-sm text-gray-500">
                Display the revenue trend chart on the home screen
              </p>
            </div>
            <Switch
              id="showRevenueTrend"
              checked={settings.showRevenueTrend === true}
              onCheckedChange={(checked) => handleInputChange('showRevenueTrend', checked)}
            />
          </div>

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
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
