'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import InvoiceForm from '@/app/invoices/InvoiceForm'
import { getInvoiceById, getQuoteById } from '@/lib/storage'
import { Invoice } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

export default function CreateInvoicePage() {
  const router = useRouter()
  const [initialInvoice, setInitialInvoice] = useState<Invoice | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null
        const quoteId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quoteId') : null

        if (id) {
          const existing = await getInvoiceById(id)
          if (existing) {
            setInitialInvoice(existing)
          }
        } else if (quoteId) {
          // Logic to populate from quote would go here, 
          // but for now InvoiceForm handles new state.
          // We could potentially fetch quote and pass it to InvoiceForm 
          // if we wanted to pre-fill it, but let's stick to standard flow.
          // Actually, the original code handled `quoteId` by fetching it and converting.
          // Let's quickly replicate that prep logic here if quoteId exists.
          const quote = await getQuoteById(quoteId)
          if (quote) {
            // Map quote to invoice structure
            // This is a simplified mapping
            const newInvoice: Partial<Invoice> = {
              customer: quote.customer,
              items: quote.items.map(item => ({
                ...item,
                amountReceived: 0,
                // Ensure all required fields for InvoiceLineItem are present
                // quote items match mostly
              })),
              subtotal: quote.subTotal,
              tax: quote.totalTax,
              total: quote.total,
              quoteNumber: quote.number,
            }
            setInitialInvoice(newInvoice as Invoice)
          }
        }
      } catch (err) {
        console.error('Failed to load invoice:', err)
        toast({ title: 'Error', description: 'Failed to load invoice', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="p-8 pb-0">
        <Link href="/invoices">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      <InvoiceForm
        initialData={initialInvoice}
        onSave={(savedInvoice) => {
          setInitialInvoice(savedInvoice)
          router.replace(`/invoices/create?id=${savedInvoice.id}`)
        }}
        onCancel={() => router.push('/invoices')}
      />
    </div>
  )
}
