import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import crypto from 'crypto';
import stream from 'stream';

const asyncExecFile = util.promisify(execFile);
const asyncPipeline = util.promisify(stream.pipeline);

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1400,
    webPreferences: {
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

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

const diffixPrefix = app.isPackaged ? './resources/' : ''
const diffixSuffix = process.platform === 'win32' ? '.exe' : ''
const diffixPath = diffixPrefix + './bin/OpenDiffix.CLI' + diffixSuffix;

ipcMain.handle('execute_query', async (_event, fileName: string, salt: string, statement: string) => {
  console.log('Executing query: ' + statement);
  const diffixArgs = ['--json', '-f', fileName, '-s', salt, '-q', statement];
  // Throws stderr output on error.
  const { stdout } = await asyncExecFile(diffixPath, diffixArgs, {
    maxBuffer: 100 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
});

ipcMain.handle('hash_file', async (_event, fileName: string) => {
  const hash = crypto.createHash('md5');
  const stream = fs.createReadStream(fileName);
  await asyncPipeline(stream, hash);
  return hash.digest('hex');
});
