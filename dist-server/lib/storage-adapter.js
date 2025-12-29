"use strict";
/**
 * Storage Adapter - Handles storage operations for both browser and Electron
 * Uses localStorage in browser, SQLite via IPC in Electron
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectron = isElectron;
exports.getStorageAdapter = getStorageAdapter;
exports.getStorage = getStorage;
// Check if running in Electron
function isElectron() {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
}
// Browser localStorage adapter
class LocalStorageAdapter {
    async getItem(key) {
        if (typeof window === 'undefined')
            return null;
        return localStorage.getItem(key);
    }
    async setItem(key, value) {
        if (typeof window === 'undefined')
            return;
        localStorage.setItem(key, value);
    }
    async removeItem(key) {
        if (typeof window === 'undefined')
            return;
        localStorage.removeItem(key);
    }
    async getAllKeys() {
        if (typeof window === 'undefined')
            return [];
        return Object.keys(localStorage);
    }
}
// Electron IPC adapter (will use IPC to communicate with main process)
class ElectronAdapter {
    async getItem(key) {
        if (typeof window === 'undefined' || !window.electronAPI)
            return null;
        try {
            // Use IPC to get from SQLite
            const result = await window.electronAPI.invoke('storage:get', key);
            return result;
        }
        catch (error) {
            console.error('Error getting item via IPC:', error);
            return null;
        }
    }
    async setItem(key, value) {
        if (typeof window === 'undefined' || !window.electronAPI)
            return;
        try {
            await window.electronAPI.invoke('storage:set', key, value);
        }
        catch (error) {
            console.error('Error setting item via IPC:', error);
        }
    }
    async removeItem(key) {
        if (typeof window === 'undefined' || !window.electronAPI)
            return;
        try {
            await window.electronAPI.invoke('storage:remove', key);
        }
        catch (error) {
            console.error('Error removing item via IPC:', error);
        }
    }
    async getAllKeys() {
        if (typeof window === 'undefined' || !window.electronAPI)
            return [];
        try {
            return await window.electronAPI.invoke('storage:keys');
        }
        catch (error) {
            console.error('Error getting keys via IPC:', error);
            return [];
        }
    }
}
// Get the appropriate adapter
let adapter = null;
function getStorageAdapter() {
    if (adapter)
        return adapter;
    if (isElectron()) {
        adapter = new ElectronAdapter();
    }
    else {
        adapter = new LocalStorageAdapter();
    }
    return adapter;
}
// For now, we'll use localStorage in both cases until IPC is set up
// This ensures backward compatibility
function getStorage() {
    // Always use localStorage for now to maintain compatibility
    // We'll switch to Electron adapter once IPC handlers are ready
    return new LocalStorageAdapter();
}
