import { app, BrowserWindow, ipcMain, dialog } from 'electron';
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

const resourcesLocation = app.isPackaged ? '..' : '.';

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
    icon: path.join(app.getAppPath(), resourcesLocation, 'assets', 'icon.png'),
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

const diffixName = 'OpenDiffix.CLI' + (process.platform === 'win32' ? '.exe' : '');
const diffixPath = path.join(app.getAppPath(), resourcesLocation, 'bin', diffixName);

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

ipcMain.on('cancel_task', async (_event, taskId: string) => {
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
    console.log(`(${taskId}) Executing query: ${statement.trimEnd()}`);

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

function showSaveDialog() {
  const options = {
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  return dialog.showSaveDialog(BrowserWindow.getAllWindows()[0], options);
}

ipcMain.handle('export_query_result', async (_event, fileName: string, salt: string, statement: string) => {
  const outputFileName = (await showSaveDialog()).filePath;
  if (!outputFileName) return null;

  console.log(`Exporting query result to: ${outputFileName}`);

  const diffixArgs = ['-f', fileName, '-s', salt, '-q', statement, '-o', outputFileName];
  // Throws stderr output on error.
  await asyncExecFile(diffixPath, diffixArgs, { windowsHide: true });

  return outputFileName;
});

ipcMain.handle('hash_file', (_event, taskId: string, fileName: string) =>
  runTask(taskId, async (signal) => {
    console.log(`(${taskId}) Hashing file ${fileName}`);

    const fileStream = stream.addAbortSignal(signal, fs.createReadStream(fileName));
    const hash = crypto.createHash('md5');

    await asyncPipeline(fileStream, hash);
    return hash.digest('hex');
  }),
);
