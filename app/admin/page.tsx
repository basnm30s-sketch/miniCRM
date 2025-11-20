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
import RichTextEditor from '@/components/ui/rich-text-editor'
// Alerts replaced by toasts
import { toast } from '@/hooks/use-toast'
import { getAdminSettings, saveAdminSettings, initializeAdminSettings } from '@/lib/storage'
import { AdminSettings } from '@/lib/types'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // top-of-page alerts replaced by toast notifications

  useEffect(() => {
    async function loadSettings() {
      try {
        const stored = await getAdminSettings()
        if (stored) {
          setSettings(stored)
        } else {
          const initialized = await initializeAdminSettings()
          setSettings(initialized)
        }
        } catch (err) {
        console.error('Failed to load settings:', err)
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'sealUrl' | 'signatureUrl'
  ) => {
    const file = e.target.files?.[0]
  if (!file || !settings) return

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

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setSettings({
          ...settings,
          [field]: base64,
        })
        toast({ title: 'Upload', description: `${field === 'logoUrl' ? 'Logo' : field === 'sealUrl' ? 'Seal' : 'Signature'} uploaded successfully` })
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Failed to upload image:', err)
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' })
    }
  }

  const handleInputChange = (field: keyof AdminSettings, value: string) => {
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
      await saveAdminSettings({
        ...settings,
        updatedAt: new Date().toISOString(),
      })
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-gray-500">Manage company profile and branding for quotes</p>
      </div>

      {/* toasts will show notifications; no top-of-page alerts */}

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
              placeholder="Street address, city, country"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="vatNumber">VAT Number</Label>
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
          <CardDescription>These terms will be used as the default when creating a new quote. You can edit them per-quote in the quote editor.</CardDescription>
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
          <CardDescription>Upload logo, seal and signature images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div>
            <Label htmlFor="logo">Logo (for header)</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logoUrl')}
              className="mb-2"
            />
            {settings.logoUrl && (
              <div className="mt-2">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  style={{ maxHeight: '80px', maxWidth: '200px' }}
                  className="border rounded p-2"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSettings({ ...settings, logoUrl: null })}
                >
                  Remove Logo
                </Button>
              </div>
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
              onChange={(e) => handleImageUpload(e, 'sealUrl')}
              className="mb-2"
            />
            {settings.sealUrl && (
              <div className="mt-2">
                <img
                  src={settings.sealUrl}
                  alt="Seal preview"
                  style={{ maxHeight: '100px', maxWidth: '100px' }}
                  className="border rounded p-2"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSettings({ ...settings, sealUrl: null })}
                >
                  Remove Seal
                </Button>
              </div>
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
              onChange={(e) => handleImageUpload(e, 'signatureUrl')}
              className="mb-2"
            />
            {settings.signatureUrl && (
              <div className="mt-2">
                <img
                  src={settings.signatureUrl}
                  alt="Signature preview"
                  style={{ maxHeight: '60px', maxWidth: '150px' }}
                  className="border rounded p-2"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSettings({ ...settings, signatureUrl: null })}
                >
                  Remove Signature
                </Button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Max size: 2MB. Recommended: PNG with transparency</p>
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
