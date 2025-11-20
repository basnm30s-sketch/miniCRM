"use client"

import React, { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  rows?: number
}

export default function RichTextEditor({ value = '', onChange, placeholder, rows = 6 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    onChange?.(html)
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    // trigger input handler
    handleInput()
    editorRef.current?.focus()
  }

  const findAncestor = (node: Node | null, tagName: string): HTMLElement | null => {
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && (node as Element).nodeName === tagName) {
        return node as HTMLElement
      }
      node = node.parentNode
    }
    return null
  }

  const toggleNumberedList = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return
    const range = sel.getRangeAt(0)

    // If selection is inside an existing <ol>, unwrap it
    const olAncestor = findAncestor(range.startContainer, 'OL') || findAncestor(range.endContainer, 'OL')
    if (olAncestor) {
      // collect li contents
      const lis = Array.from(olAncestor.querySelectorAll('li'))
      const html = lis.map((li) => `<div>${li.innerHTML}</div>`).join('')
      const wrapper = document.createElement('div')
      wrapper.innerHTML = html
      olAncestor.replaceWith(...Array.from(wrapper.childNodes))
      handleInput()
      return
    }

    // Otherwise, create an <ol> from the selected text (split by newlines)
    const selectedText = range.toString()
    const lines = selectedText.split(/\r?\n/).filter((l) => l.trim().length > 0)

    if (lines.length === 0) {
      // Insert an empty ordered list
      const frag = document.createRange().createContextualFragment('<ol><li></li></ol>')
      range.deleteContents()
      range.insertNode(frag)
      // place caret inside the new li
      const li = editorRef.current.querySelector('li')
      if (li) placeCaretAtEnd(li as HTMLElement)
      handleInput()
      return
    }

    const olHtml = `<ol>${lines.map((l) => `<li>${l}</li>`).join('')}</ol>`
    const frag = document.createRange().createContextualFragment(olHtml)
    range.deleteContents()
    range.insertNode(frag)
    // move caret after inserted ol
    sel.removeAllRanges()
    const afterRange = document.createRange()
    afterRange.setStartAfter(frag.lastChild as Node)
    afterRange.collapse(true)
    sel.addRange(afterRange)
    handleInput()
  }

  return (
    <div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => exec('bold')}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-100 font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => exec('italic')}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-100 italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => exec('underline')}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-100 underline"
              title="Underline"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => toggleNumberedList()}
              className="px-3 py-1 border rounded bg-white hover:bg-gray-100"
              title="Numbered List"
            >
              1.
            </button>
            <button
              type="button"
              onClick={() => exec('removeFormat')}
              className="px-3 py-1 border rounded bg-red-50 hover:bg-red-100 text-red-700"
              title="Clear Formats"
            >
              Clear Formats
            </button>
          </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[120px] border rounded p-3 prose prose-sm max-w-full focus:outline-none"
        style={{ whiteSpace: 'pre-wrap' }}
        data-placeholder={placeholder}
      />
    </div>
  )
}

function placeCaretAtEnd(el: HTMLElement) {
  el.focus()
  if (typeof window.getSelection !== 'undefined' && typeof document.createRange !== 'undefined') {
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}
