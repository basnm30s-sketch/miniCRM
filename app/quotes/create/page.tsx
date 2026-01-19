'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import QuoteForm from '@/app/quotations/QuoteForm'
import { getQuoteById } from '@/lib/storage'
import { Quote } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

export default function CreateQuotePage() {
  const router = useRouter()
  const [initialQuote, setInitialQuote] = useState<Quote | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null
        if (id) {
          const existing = await getQuoteById(id)
          if (existing) {
            setInitialQuote(existing)
          }
        }
      } catch (err) {
        console.error('Failed to load quote:', err)
        toast({ title: 'Error', description: 'Failed to load quote', variant: 'destructive' })
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
        <Link href="/quotations">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </Link>
      </div>

      <QuoteForm
        initialData={initialQuote}
        onSave={(savedQuote) => {
          // Optional: redirect or show success message (handled by form)
          setInitialQuote(savedQuote)
          router.replace(`/quotes/create?id=${savedQuote.id}`)
        }}
        onCancel={() => router.push('/quotations')}
      />
    </div>
  )
}
