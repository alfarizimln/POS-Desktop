import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('config:set', key, value),
  },
  auth: {
    login: (userId: string, pin: string) => ipcRenderer.invoke('auth:login', userId, pin),
    current: () => ipcRenderer.invoke('auth:current'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },
  table: {
    list: () => ipcRenderer.invoke('table:list'),
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
    history: (options?: unknown) => ipcRenderer.invoke('order:history', options),
    detail: (orderId: string) => ipcRenderer.invoke('order:detail', orderId),
  },
  report: {
    daily: (tanggal: string) => ipcRenderer.invoke('report:daily', tanggal),
    exportDaily: (tanggal: string) => ipcRenderer.invoke('report:exportDaily', tanggal),
  },
  user: {
    list: () => ipcRenderer.invoke('user:list'),
    create: (nama: string, pin: string) => ipcRenderer.invoke('user:create', nama, pin),
    rename: (id: string, nama: string) => ipcRenderer.invoke('user:rename', id, nama),
    updatePin: (id: string, pin: string) => ipcRenderer.invoke('user:updatePin', id, pin),
    delete: (id: string) => ipcRenderer.invoke('user:delete', id),
  },
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    updateInfo: (info: { nama_usaha: string; alamat_usaha: string; telp_usaha: string }) =>
      ipcRenderer.invoke('app:updateInfo', info),
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
    printDailyReport: (tanggal: string) => ipcRenderer.invoke('printer:printDailyReport', tanggal),
  },
});