import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld('electron', {
  loadFile: (file) => {
    ipcRenderer.send('loadFile', file);
  },

  anonymizeForColumns: (columns) => ipcRenderer.send('anonymize', columns),

  registerDataProvider: (callback) => {
    ipcRenderer.on("schemaLoaded", (event, data) => {
      console.log(`Got event schemaLoaded with ${data}`);
      console.log(data);
      callback(data);
    });
  },

  registerResultHandler: (callback) => {
    ipcRenderer.on("resultsComputed", (event, data) => {
      callback(data);
    });
  },
});