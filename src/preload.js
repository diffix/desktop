import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld('electron', {
  // Actions
  loadFile: (file) => ipcRenderer.send('loadFile', file),
  anonymizeForColumns: (columns) => ipcRenderer.send('anonymize', columns),

  // Callbacks
  onSchemaChange: (callback) => {
    ipcRenderer.on("onSchemaChange", (event, data) => {
      callback(data);
    });
  },
  onAnonymizedResult: (callback) => {
    ipcRenderer.on("onAnonymizedResult", (event, data) => {
      callback(data);
    });
  },
});