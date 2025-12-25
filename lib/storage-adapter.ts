/**
 * Storage Adapter - Handles storage operations for both browser and Electron
 * Uses localStorage in browser, SQLite via IPC in Electron
 */

// Type declaration for Electron API
declare global {
  interface Window {
    electronAPI?: {
      platform?: string
      invoke?: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

// Storage operations interface
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  getAllKeys(): Promise<string[]>
}

// Browser localStorage adapter
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined') return []
    return Object.keys(localStorage)
  }
}

// Electron IPC adapter (will use IPC to communicate with main process)
class ElectronAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.electronAPI) return null
    try {
      // Use IPC to get from SQLite
      const result = await (window as any).electronAPI.invoke('storage:get', key)
      return result
    } catch (error) {
      console.error('Error getting item via IPC:', error)
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI) return
    try {
      await (window as any).electronAPI.invoke('storage:set', key, value)
    } catch (error) {
      console.error('Error setting item via IPC:', error)
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI) return
    try {
      await (window as any).electronAPI.invoke('storage:remove', key)
    } catch (error) {
      console.error('Error removing item via IPC:', error)
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined' || !window.electronAPI) return []
    try {
      return await (window as any).electronAPI.invoke('storage:keys')
    } catch (error) {
      console.error('Error getting keys via IPC:', error)
      return []
    }
  }
}

// Get the appropriate adapter
let adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter

  if (isElectron()) {
    adapter = new ElectronAdapter()
  } else {
    adapter = new LocalStorageAdapter()
  }

  return adapter
}

// For now, we'll use localStorage in both cases until IPC is set up
// This ensures backward compatibility
export function getStorage(): StorageAdapter {
  // Always use localStorage for now to maintain compatibility
  // We'll switch to Electron adapter once IPC handlers are ready
  return new LocalStorageAdapter()
}

