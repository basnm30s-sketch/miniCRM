'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { getAllExpenseCategories, saveExpenseCategory, deleteExpenseCategory, generateId } from '@/lib/storage'
import type { ExpenseCategory } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export default function ExpenseCategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
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
      toast({
        title: 'Error',
        description: err?.message || 'Failed to load categories',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      })
      return
    }

    // Check for duplicate
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({
        title: 'Validation Error',
        description: 'Category with this name already exists',
        variant: 'destructive',
      })
      return
    }

    try {
      await saveExpenseCategory({
        id: generateId(),
        name: newCategoryName.trim(),
        isCustom: true,
      })
      setNewCategoryName('')
      setShowAddForm(false)
      await loadCategories()
      toast({
        title: 'Success',
        description: 'Category created successfully',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to add category',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (category: ExpenseCategory) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      })
      return
    }

    const category = categories.find(c => c.id === id)
    if (!category) return

    // Check for duplicate (excluding current category)
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === editingName.trim().toLowerCase())) {
      toast({
        title: 'Validation Error',
        description: 'Category with this name already exists',
        variant: 'destructive',
      })
      return
    }

    try {
      await saveExpenseCategory({
        ...category,
        name: editingName.trim(),
      })
      setEditingId(null)
      setEditingName('')
      await loadCategories()
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update category',
        variant: 'destructive',
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = async (id: string) => {
    const category = categories.find(c => c.id === id)
    if (!category) return

    if (!category.isCustom) {
      toast({
        title: 'Error',
        description: 'Cannot delete predefined category',
        variant: 'destructive',
      })
      return
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return
    }

    try {
      await deleteExpenseCategory(id)
      await loadCategories()
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      })
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to delete category',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="p-4 text-slate-500">Loading categories...</div>
  }

  const predefinedCategories = categories.filter(c => !c.isCustom)
  const customCategories = categories.filter(c => c.isCustom)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Expense Categories</h3>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

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
                <TableCell className="text-right gap-2 flex justify-end">
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
                    <>
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-primary hover:text-primary/90"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
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

      <Dialog open={showAddForm} onOpenChange={(open) => {
        setShowAddForm(open)
        if (!open) {
          setNewCategoryName('')
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label htmlFor="newCategory" className="text-slate-700 text-sm mb-2 block">
                Category Name
              </Label>
              <Input
                id="newCategory"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value)
                }}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowAddForm(false)
                setNewCategoryName('')
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

