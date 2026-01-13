'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ExpenseCategoryManager from '@/components/expense-category-manager'

export default function ExpenseCategoriesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Expense Categories</h1>
        <p className="text-slate-500">Manage expense categories for vehicle transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseCategoryManager />
        </CardContent>
      </Card>
    </div>
  )
}








