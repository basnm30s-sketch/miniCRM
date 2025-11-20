'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminSettings, getAllCustomers, getAllVehicles, generateQuoteNumber } from '@/lib/storage'
import { pdfRenderer } from '@/lib/pdf'
import type { Quote, QuoteLineItem, Customer, Vehicle } from '@/lib/types'

export default function PdfTestPage() {
  const [admin, setAdmin] = useState<any | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const a = await getAdminSettings()
      setAdmin(a)
      const c = await getAllCustomers()
      setCustomers(c || [])
      const v = await getAllVehicles()
      setVehicles(v || [])
    }
    load()
  }, [])

  function buildQuoteWithItems(count: number): Quote {
    const customer: Customer = customers && customers.length ? customers[0] : {
      id: 'sample-cust-1',
      name: 'Ahmed Al Mansouri',
      company: 'Al Mansouri Trading',
      address: 'Dubai, UAE',
      email: 'ahmed@almansouri.ae',
      phone: '+971 4 1234567',
    }

    const items: QuoteLineItem[] = []
    for (let i = 0; i < count; i++) {
      const vehicle = vehicles[i % (vehicles.length || 1)]
      const label = vehicle ? (vehicle.type || 'Vehicle') : `Item ${i + 1}`
      const unitPrice = vehicle && vehicle.basePrice ? vehicle.basePrice : 1000 + (i * 10)

      const item: QuoteLineItem = {
        id: `${Date.now()}-${i}`,
        vehicleTypeId: vehicle ? vehicle.id : `v-${i}`,
        vehicleTypeLabel: label,
        quantity: 1,
        unitPrice: unitPrice,
        taxPercent: 15,
      }

      // compute line tax/total
      const lineTax = (item.unitPrice * item.quantity * (item.taxPercent || 0)) / 100
      item.lineTaxAmount = parseFloat(lineTax.toFixed(2))
      item.lineTotal = parseFloat((item.unitPrice * item.quantity + lineTax).toFixed(2))
      items.push(item)
    }

    const subTotal = items.reduce((s, it) => s + (it.unitPrice * it.quantity), 0)
    const totalTax = items.reduce((s, it) => s + (it.lineTaxAmount || 0), 0)
    const total = subTotal + totalTax

    const pattern = admin?.quoteNumberPattern || 'AAT-YYYYMMDD-NNNN'
    const number = generateQuoteNumber(pattern)

    const quote: Quote = {
      id: `q-${Date.now()}`,
      number,
      date: new Date().toISOString().slice(0, 10),
      currency: admin?.currency || 'AED',
      customer,
      items,
      subTotal,
      totalTax,
      total,
      notes: 'PDF test generated for verifying dynamic signature/seal positioning',
    }

    return quote
  }

  async function generate(count: number) {
    setStatus('Generating PDF...')
    try {
      const a = admin || (await getAdminSettings())
      if (!a) {
        setStatus('Admin settings not configured — please open Admin settings and save default settings (logo/seal/signature optional)')
        return
      }

      const quote = buildQuoteWithItems(count)
      const blob = await pdfRenderer.renderQuoteToPdf(quote, a)
      pdfRenderer.downloadPdf(blob, `pdf-test-${quote.number}-${count}-items.pdf`)
      setStatus(`Generated PDF for ${count} items`)
    } catch (err) {
      console.error(err)
      setStatus('Error while generating PDF: ' + (err as any)?.message)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">PDF Renderer Test</h1>
        <p className="text-sm text-slate-600">Use these buttons to generate example PDFs and verify that the signature and seal move with content length.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDF Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button onClick={() => generate(1)} className="bg-blue-600 text-white">Generate short PDF (1 item)</Button>
            <Button onClick={() => generate(5)} className="bg-blue-600 text-white">Generate medium PDF (5 items)</Button>
            <Button onClick={() => generate(20)} className="bg-blue-600 text-white">Generate long PDF (20 items)</Button>
          </div>
          <div className="text-sm text-slate-700">Status: {status || 'idle'}</div>
          <div className="mt-4 text-xs text-slate-500">Tip: If you have company logo/seal/signature saved in Admin Settings, the generated PDF will include them. Otherwise defaults are used.</div>
        </CardContent>
      </Card>
    </div>
  )
}
