'use client'

import { useToast, TOAST_REMOVE_DELAY } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} style={{ ['--duration' as any]: `${TOAST_REMOVE_DELAY}ms` }}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            {/* progress bar - uses CSS variable --duration for timing */}
            <div
              className="absolute left-0 bottom-0 h-1 w-full toast-progress"
              aria-hidden
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
