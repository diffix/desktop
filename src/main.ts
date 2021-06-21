import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile } from 'child_process';
import util from 'util';

const asyncExecFile = util.promisify(execFile);

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 1600,
    webPreferences: {
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.openDevTools();
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('execute_query', async (_event, fileName: string, statement: string) => {
  console.log('Executing query: ' + statement);
  const diffixPath = './bin/OpenDiffix.CLI.exe';
  const diffixArgs = ['--json', '-f', fileName, '-q', statement];
  // Throws stderr output on error.
  const { stdout } = await asyncExecFile(diffixPath, diffixArgs, {
    maxBuffer: 100 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
});
