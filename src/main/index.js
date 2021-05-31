import { app, BrowserWindow, ipcMain } from 'electron';
import { getAssetURL } from 'electron-snowpack';
import { fromCsv } from "../compiled/CsvProvider";
import { anonymize } from "../compiled/Anonymizer";

let parsedData = undefined;

function createMainWindow() {
  const path = require("path");
  console.log(path.join(__dirname, "preload.js"));

  const window = new BrowserWindow({
    title: "Open Diffix Publisher",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  ipcMain.on("loadFile", (event, filePath) => {
    const {readFile} = require("fs");
    console.log(filePath);

    readFile(filePath, "utf-8", (err, csvContent) => {
      if (err) {
        alert("An error ocurred reading the file :" + err.message);
        return;
      }

      const data = fromCsv(csvContent, ",");
      parsedData = data; // we are keeping a copy of the data so it doesn't do the RPC dance
      event.reply('schemaLoaded', data.Columns);
    });
  });

  ipcMain.on("anonymize", (event, columns) => {
    const result = anonymize(parsedData, columns);
    event.reply('resultsComputed', result);
  });

  if (process.env.MODE !== 'production') {
    window.webContents.openDevTools();
  }

  window.loadURL(getAssetURL('index.html'));

  window.on('closed', () => {
    mainWindow = null;
  });

  window.webContents.on('devtools-opened', () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  mainWindow = createMainWindow();
});
