/**
 * Preload script for Electron
 * Provides secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to use the database through IPC
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // IPC methods for storage operations and error logging
  invoke: (channel, ...args) => {
    // Whitelist channels for security
    const validChannels = [
      'storage:get',
      'storage:set',
      'storage:remove',
      'storage:keys',
      'storage:getAll',
      'storage:save',
      'storage:delete',
      'log-error', // Allow error logging from renderer
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
});

