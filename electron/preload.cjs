const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vistaStorage", {
  getItem: (key) => ipcRenderer.invoke("vista-storage:get", key),
  setItem: (key, value) => ipcRenderer.invoke("vista-storage:set", key, value),
  removeItem: (key) => ipcRenderer.invoke("vista-storage:remove", key),
});
