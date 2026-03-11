'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, FileText, Copy } from 'lucide-react'
import InvoiceForm from '@/app/invoices/InvoiceForm'
import { getInvoiceById, getQuoteById, getAllInvoices, getAllCustomers, generateId, generateInvoiceNumber } from '@/lib/storage'
import { Invoice, InvoiceItem } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

type Step = 'choice' | 'list' | 'form'

async function buildInvoiceCloneFrom(source: Invoice): Promise<Invoice> {
  const newId = generateId()
  const newNumber = await generateInvoiceNumber()
  const today = new Date().toISOString().split('T')[0]
  const items: InvoiceItem[] = (source.items || []).map((item) => ({
    ...item,
    id: generateId(),
  }))
  return {
    ...source,
    id: newId,
    number: newNumber,
    date: today,
    dueDate: undefined,
    status: 'draft',
    amountReceived: 0,
    items,
    createdAt: undefined,
    updatedAt: undefined,
  }
}

function CreateInvoicePageContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [initialInvoice, setInitialInvoice] = useState<Invoice | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('choice')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [vehicleFilter, setVehicleFilter] = useState<string>('')

  const id = searchParams.get('id')
  const quoteId = searchParams.get('quoteId')
  const copyFrom = searchParams.get('copyFrom')

  useEffect(() => {
    async function loadData() {
      if (id || quoteId || copyFrom) setLoading(true)
      try {
        if (id) {
          const existing = await getInvoiceById(id)
          if (existing) {
            setInitialInvoice(existing)
            setStep('form')
          }
        } else if (quoteId) {
          const quote = await getQuoteById(quoteId)
          if (quote) {
            const newInvoice: Partial<Invoice> = {
              customerId: quote.customer?.id,
              items: quote.items.map((item) => ({
                ...item,
                id: generateId(),
                amountReceived: 0,
              })) as InvoiceItem[],
              subtotal: quote.subTotal,
              tax: quote.totalTax,
              total: quote.total,
              quoteId: quote.id,
            }
            setInitialInvoice(newInvoice as Invoice)
            setStep('form')
          }
        } else if (copyFrom) {
          const source = await getInvoiceById(copyFrom)
          if (!source) {
            toast({ title: 'Error', description: 'Invoice not found', variant: 'destructive' })
            router.replace('/invoices/create')
            return
          }
          const clone = await buildInvoiceCloneFrom(source)
          setInitialInvoice(clone)
          setStep('form')
        } else {
          setStep('choice')
        }
      } catch (err) {
        console.error('Failed to load invoice:', err)
        toast({ title: 'Error', description: 'Failed to load invoice', variant: 'destructive' })
        setStep('choice')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, quoteId, copyFrom, router])

  useEffect(() => {
    if (step !== 'list') return
    let cancelled = false
    setListLoading(true)
    Promise.all([getAllInvoices(), getAllCustomers()])
      .then(([invList, custList]) => {
        if (cancelled) return
        setInvoices(invList)
        setCustomers(custList.map((c) => ({ id: c.id, name: c.name || '' })))
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' })
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step])

  const filteredInvoices = useMemo(() => {
    let list = invoices
    if (customerFilter) {
      list = list.filter((inv) => inv.customerId === customerFilter)
    }
    if (vehicleFilter.trim()) {
      const v = vehicleFilter.trim().toLowerCase()
      list = list.filter((inv) =>
        (inv.items || []).some((item) =>
          (item.vehicleNumber || '').toLowerCase().includes(v)
        )
      )
    }
    return list
  }, [invoices, customerFilter, vehicleFilter])

  const handleNewEmpty = () => {
    setInitialInvoice(undefined)
    setStep('form')
  }

  const handleCopyFromExisting = () => {
    setStep('list')
  }

  const handleSelectInvoice = (invoiceId: string) => {
    router.replace(`/invoices/create?copyFrom=${encodeURIComponent(invoiceId)}`)
  }

  const handleBackToList = () => {
    router.replace('/invoices/create')
  }

  if (loading && (id || quoteId || copyFrom)) {
    return (
      <div className="p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (step === 'choice') {
    return (
      <div className="max-w-[560px] mx-auto p-8">
        <Link href="/invoices">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create invoice</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start h-12 text-left"
              onClick={handleNewEmpty}
            >
              <FileText className="h-4 w-4 mr-3 text-slate-500" />
              New empty invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start h-12 text-left"
              onClick={handleCopyFromExisting}
            >
              <Copy className="h-4 w-4 mr-3 text-slate-500" />
              Copy from existing invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'list') {
    return (
      <div className="max-w-[900px] mx-auto p-8">
        <Button variant="outline" className="mb-6" onClick={handleBackToList}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Copy from existing invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Customer</Label>
                <Select value={customerFilter || '__all__'} onValueChange={(v) => setCustomerFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Vehicle number</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Filter by vehicle number"
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                />
              </div>
            </div>
            {listLoading ? (
              <div className="py-8 text-center text-slate-500">Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="mb-2">No invoices match the filters.</p>
                <Button variant="link" className="text-sm" onClick={handleBackToList}>
                  New empty invoice
                </Button>
              </div>
            ) : (
              <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                {filteredInvoices.map((inv) => {
                  const customerName = customers.find((c) => c.id === inv.customerId)?.name || '—'
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center gap-4"
                      onClick={() => handleSelectInvoice(inv.id)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{inv.number}</span>
                        <span className="text-sm text-slate-600">{customerName}</span>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <div>{inv.date}</div>
                        <div className="font-medium text-slate-900">AED {(inv.total ?? 0).toFixed(2)}</div>
                      </div>
                      <span className="text-xs text-blue-600">Use this invoice</span>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="p-8 pb-0">
        <Link href="/invoices">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>
      <InvoiceForm
        initialData={initialInvoice}
        onSave={(savedInvoice) => {
          setInitialInvoice(savedInvoice)
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
          router.replace(`/invoices/create?id=${savedInvoice.id}`)
        }}
        onCancel={() => router.push('/invoices')}
      />
    </div>
  )
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <CreateInvoicePageContent />
    </Suspense>
  )
}
