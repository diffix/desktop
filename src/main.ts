import { app, BrowserWindow, ipcMain, dialog, shell, protocol, Menu, MenuItemConstructorOptions } from 'electron';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import stream from 'stream';
import { PageId } from './Docs';

const asyncExecFile = util.promisify(execFile);
const asyncPipeline = util.promisify(stream.pipeline);

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isMac = process.platform === 'darwin';
const resourcesLocation = app.isPackaged ? '..' : '.';

// App menu

function openDocs(page: PageId) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('open_docs', page);
}

function openURL(url: string) {
  shell.openExternal(url);
}

function setupMenu() {
  const macAppMenu: MenuItemConstructorOptions = { role: 'appMenu' };
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: () => openDocs('operation'),
        },
        {
          label: 'License',
          click: () => openDocs('license'),
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click: () => openURL('https://open-diffix.org'),
        },
        {
          label: 'Community Discussions',
          click: () => openURL('https://github.com/diffix/publisher/discussions'),
        },
        {
          label: 'Search Issues',
          click: () => openURL('https://github.com/diffix/publisher/issues'),
        },
        {
          label: 'Latest Releases',
          click: () => openURL('https://github.com/diffix/publisher/releases'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Protocol for docs file serving (docs://)

protocol.registerSchemesAsPrivileged([{ scheme: 'docs', privileges: { bypassCSP: true } }]);

function registerProtocols() {
  protocol.registerFileProtocol('docs', (request, callback) => {
    const url = request.url.substr('docs://'.length);
    callback(path.resolve(path.normalize(`${resourcesLocation}/docs/${url}`)));
  });
}

// Main window

const ALLOWED_DOMAINS = ['https://open-diffix.org', 'https://github.com'];

function createWindow() {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1400,
    webPreferences: {
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    icon: path.join(app.getAppPath(), resourcesLocation, 'assets', 'icon.png'),
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (ALLOWED_DOMAINS.some((domain) => url.startsWith(domain))) {
      shell.openExternal(url);
    } else {
      console.warn(`Blocked URL ${url} by setWindowOpenHandler.`);
    }

    return { action: 'deny' };
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// IPC

app.on('ready', () => {
  setupMenu();
  registerProtocols();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const diffixName = 'OpenDiffix.Service' + (process.platform === 'win32' ? '.exe' : '');
const diffixPath = path.join(app.getAppPath(), resourcesLocation, 'bin', diffixName);

const activeTasks = new Map<string, AbortController>();

async function runTask<T>(taskId: string, runner: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (activeTasks.has(taskId)) throw new Error(`Duplicate task ID ${taskId}.`);

  const abortController = new AbortController();
  activeTasks.set(taskId, abortController);

  const startTimestamp = performance.now();
  try {
    return await runner(abortController.signal);
  } finally {
    const taskTime = Math.round(performance.now() - startTimestamp);
    console.debug(`Task ${taskId} took ${taskTime} ms.`);

    activeTasks.delete(taskId);
  }
}

ipcMain.on('cancel_task', async (_event, taskId: string) => {
  console.info(`Cancelling task ${taskId}.`);
  const controller = activeTasks.get(taskId);
  if (controller) {
    controller.abort();
    activeTasks.delete(taskId);
  } else {
    console.info(`Task ${taskId} not found.`);
  }
});

ipcMain.handle('call_service', (_event, taskId: string, request: string) =>
  runTask(taskId, async (signal) => {
    console.info(`(${taskId}) Calling service: ${request}.`);

    const promise = asyncExecFile(diffixPath, null, { maxBuffer: 100 * 1024 * 1024, windowsHide: true, signal });

    promise.child.stdin?.write(request);
    promise.child.stdin?.end();

    try {
      const { stdout, stderr } = await promise;
      console.log(stderr.trimEnd());
      return stdout;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw 'Service call aborted.';
      }

      const stderr = (err as { stderr?: string })?.stderr;
      if (stderr) {
        console.log(stderr.trimEnd());
      }

      throw 'Service call failed.';
    }
  }),
);

ipcMain.handle('select_export_file', async (_event, defaultPath: string) => {
  const options = {
    defaultPath: defaultPath,
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  const dialogResult = await dialog.showSaveDialog(BrowserWindow.getAllWindows()[0], options);
  return dialogResult.filePath;
});

ipcMain.handle('hash_file', (_event, taskId: string, fileName: string) =>
  runTask(taskId, async (signal) => {
    console.info(`(${taskId}) Hashing file ${fileName}.`);

    const fileStream = stream.addAbortSignal(signal, fs.createReadStream(fileName));
    const hash = crypto.createHash('sha256');

    await asyncPipeline(fileStream, hash);
    return hash.digest('hex');
  }),
);
