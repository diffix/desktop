"use strict";
import { app, BrowserWindow, ipcMain } from 'electron';

let mainWindow, workerWindow;

function createWindows() {
  workerWindow = new BrowserWindow({
    show: !app.isPackaged,
    webPreferences: {
      preload: WORKER_WINDOW_PRELOAD_WEBPACK_ENTRY,
    }
  });

  workerWindow.loadURL(WORKER_WINDOW_WEBPACK_ENTRY);


  // Renderer

  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.on('closed', () => {
    mainWindow = null;
    workerWindow = null;
  });

  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.focus();
    setImmediate(() => {
      mainWindow.focus();
    });
  });

  if (! app.isPackaged) {
    mainWindow.webContents.openDevTools();
    workerWindow.webContents.openDevTools();
  }
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
    createWindows();
  }
});

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  createWindows();
});

ipcMain.on("forwardToWorker_loadFile", (event, filePath) => {
  const { readFile } = require("fs");
  readFile(filePath, "utf-8", (err, csvContent) => {
    if (err) {
      console.log("An error ocurred reading the file :" + err.message);
    }
    console.log("Successfully loaded CSV file. Forwarding content to worker.")
    workerWindow.webContents.send("loadedFile", csvContent);
  });
});

ipcMain.on("forwardToWorker_anonymize", (event, columns) => {
  console.log("Forwarding file load request to worker");
  workerWindow.webContents.send("anonymize", columns);
});

ipcMain.on("forwardToFrontend_anonymizedResult", (event, result) => {
  console.log("Forwarding anonymized result to renderer");
  mainWindow.webContents.send("anonymizedData", result);
});

ipcMain.on("forwardToFrontend_frontendTable", (event, result) => {
  console.log("Forwarding frontend table to renderer");
  mainWindow.webContents.send("schemaLoaded", result);
});