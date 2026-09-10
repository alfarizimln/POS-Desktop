import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('config:set', key, value),
  },
  menu: {
    list: () => ipcRenderer.invoke('menu:list'),
    categories: () => ipcRenderer.invoke('menu:categories'),
    create: (data: unknown) => ipcRenderer.invoke('menu:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('menu:update', id, data),
    remove: (id: string) => ipcRenderer.invoke('menu:delete', id),
    categoryCreate: (nama: string) => ipcRenderer.invoke('category:create', nama),
    categoryUpdate: (id: string, nama: string) => ipcRenderer.invoke('category:update', id, nama),
    categoryDelete: (id: string) => ipcRenderer.invoke('category:delete', id),
  },
  order: {
    create: (data: unknown) => ipcRenderer.invoke('order:create', data),
  },
  sync: {
    run: () => ipcRenderer.invoke('sync:run'),
    push: () => ipcRenderer.invoke('sync:push'),
    pushMenu: () => ipcRenderer.invoke('sync:pushMenu'),
    pullMenu: () => ipcRenderer.invoke('sync:pullMenu'),
    status: () => ipcRenderer.invoke('sync:status'),
  },
  printer: {
    list: () => ipcRenderer.invoke('printer:list'),
    set: (name: string) => ipcRenderer.invoke('printer:set', name),
    setShare: (share: string) => ipcRenderer.invoke('printer:setShare', share),
    test: () => ipcRenderer.invoke('printer:test'),
    printOrder: (orderId: string) => ipcRenderer.invoke('printer:printOrder', orderId),
  },
});