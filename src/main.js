import { app, BrowserWindow, ipcMain } from 'electron';
import { parseCsv, toFrontendTable } from "./compiled/CsvProvider";
import { anonymize } from "./compiled/Anonymizer";

let parsedData = null;
let mainWindow = null;

function isDev() {
  return process.mainModule.filename.indexOf("app.asar") === -1;
}

function createMainWindow() {
  console.log(`Preload entry: ${MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY}`);
  console.log(`Main window webpack entry: ${MAIN_WINDOW_WEBPACK_ENTRY}`);

  const window = new BrowserWindow({
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true
    }
  });

  if (isDev()) {
    window.webContents.openDevTools();
  }

  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

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

ipcMain.on("loadFile", (event, filePath) => {
  const {readFile} = require("fs");

  readFile(filePath, "utf-8", (err, csvContent) => {
    if (err) {
      alert("An error ocurred reading the file :" + err.message);
      return;
    }

    const data = parseCsv(csvContent, ",");
    // As the data can be quite large, and isn't needed in the UX,
    // we keep it locally in the backend process exclusively
    parsedData = data;
    event.reply('onSchemaChange', toFrontendTable(data));
  });
});

ipcMain.on("anonymize", (event, columns) => {
  const result = anonymize(parsedData, columns);
  event.reply('onAnonymizedResult', result);
});