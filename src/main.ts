import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
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

const diffixBinLocation = app.isPackaged ? 'resources' : '.';
const diffixName = 'OpenDiffix.CLI' + (process.platform === 'win32' ? '.exe' : '');
const diffixPath = path.join(diffixBinLocation, 'bin', diffixName);

const activeTasks = new Map<string, AbortController>();

async function runTask<T>(taskId: string, runner: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (activeTasks.has(taskId)) throw new Error(`Duplicate task ID ${taskId}.`);

  const abortController = new AbortController();
  activeTasks.set(taskId, abortController);
  try {
    return await runner(abortController.signal);
  } finally {
    activeTasks.delete(taskId);
  }
}

ipcMain.handle('cancel_task', async (_event, taskId: string) => {
  console.log(`Cancelling task ${taskId}.`);
  const controller = activeTasks.get(taskId);
  if (controller) {
    controller.abort();
    activeTasks.delete(taskId);
  } else {
    console.log(`Task ${taskId} not found.`);
  }
});

ipcMain.handle('execute_query', (_event, taskId: string, fileName: string, salt: string, statement: string) =>
  runTask(taskId, async (signal) => {
    console.log(`(${taskId}) Executing query: ${statement}`);

    const diffixArgs = ['--json', '-f', fileName, '-s', salt, '-q', statement];
    // Throws stderr output on error.
    const { stdout } = await asyncExecFile(diffixPath, diffixArgs, {
      maxBuffer: 100 * 1024 * 1024,
      windowsHide: true,
      signal,
    });
    return stdout;
  }),
);

ipcMain.handle('hash_file', (_event, taskId: string, fileName: string) =>
  runTask(taskId, async (signal) => {
    console.log(`(${taskId}) Hashing file ${fileName}`);

    const fileStream = stream.addAbortSignal(signal, fs.createReadStream(fileName));
    const hash = crypto.createHash('md5');

    await asyncPipeline(fileStream, hash);
    return hash.digest('hex');
  }),
);
