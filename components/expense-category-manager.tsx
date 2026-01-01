'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { getAllExpenseCategories, saveExpenseCategory, deleteExpenseCategory, generateId } from '@/lib/storage'
import type { ExpenseCategory } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function ExpenseCategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingName, setEditingName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await getAllExpenseCategories()
      setCategories(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required')
      return
    }

    // Check for duplicate
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setError('Category with this name already exists')
      return
    }

    try {
      setError(null)
      await saveExpenseCategory({
        id: generateId(),
        name: newCategoryName.trim(),
        isCustom: true,
      })
      setNewCategoryName('')
      setShowAddForm(false)
      await loadCategories()
    } catch (err: any) {
      setError(err?.message || 'Failed to add category')
    }
  }

  const handleEdit = (category: ExpenseCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      setError('Category name is required')
      return
    }

    const category = categories.find(c => c.id === id)
    if (!category) return

    // Check for duplicate (excluding current category)
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === editingName.trim().toLowerCase())) {
      setError('Category with this name already exists')
      return
    }

    try {
      setError(null)
      await saveExpenseCategory({
        ...category,
        name: editingName.trim(),
      })
      setEditingId(null)
      setEditingName('')
      await loadCategories()
    } catch (err: any) {
      setError(err?.message || 'Failed to update category')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setError(null)
  }

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id)
    if (!category) return

    if (!category.isCustom) {
      setError('Cannot delete predefined category')
      return
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return
    }

    try {
      setError(null)
      await deleteExpenseCategory(id)
      await loadCategories()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category')
    }
  }

  if (loading) {
    return <div className="p-4 text-slate-500">Loading categories...</div>
  }

  const predefinedCategories = categories.filter(c => !c.isCustom)
  const customCategories = categories.filter(c => c.isCustom)

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Expense Categories</h3>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="newCategory">Category Name</Label>
              <Input
                id="newCategory"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value)
                  setError(null)
                }}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd()
                  } else if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewCategoryName('')
                  }
                }}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAdd} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => {
                setShowAddForm(false)
                setNewCategoryName('')
                setError(null)
              }} variant="outline" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {predefinedCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Predefined
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-slate-400 text-sm">System category</span>
                </TableCell>
              </TableRow>
            ))}
            {customCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  {editingId === category.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(category.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      className="w-full"
                      autoFocus
                    />
                  ) : (
                    category.name
                  )}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Custom
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === category.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleSaveEdit(category.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="outline"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleEdit(category)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(category.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                  No categories found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

