import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld('electron', {
  // Actions
  loadFile: (file) => ipcRenderer.send('forwardToWorker_loadFile', file),
  anonymizeForColumns: (columns) => ipcRenderer.send('forwardToWorker_anonymize', columns),

  // Callbacks
  onSchemaLoaded: (callback) => {
    ipcRenderer.on("schemaLoaded", (event, data) => {
      callback(data);
    });
  },
  onAnonymizedData: (callback) => {
    ipcRenderer.on("anonymizedData", (event, data) => {
      callback(data);
    });
  },
});