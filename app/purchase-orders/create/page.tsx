'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import PurchaseOrderForm from '@/app/purchase-orders/PurchaseOrderForm'
import { getPurchaseOrderById } from '@/lib/storage'
import { PurchaseOrder } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

export default function CreatePurchaseOrderPage() {
  const router = useRouter()
  const [initialPO, setInitialPO] = useState<PurchaseOrder | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null

        if (id) {
          const existing = await getPurchaseOrderById(id)
          if (existing) {
            setInitialPO(existing)
          }
        }
      } catch (err) {
        console.error('Failed to load PO:', err)
        toast({ title: 'Error', description: 'Failed to load purchase order', variant: 'destructive' })
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
        <Link href="/purchase-orders">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </Link>
      </div>

      <PurchaseOrderForm
        initialData={initialPO}
        onSave={(savedPO) => {
          setInitialPO(savedPO)
          router.replace(`/purchase-orders/create?id=${savedPO.id}`)
        }}
        onCancel={() => router.push('/purchase-orders')}
      />
    </div>
  )
}
