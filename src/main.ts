import { execFile } from 'child_process';
import crypto from 'crypto';
import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, protocol, shell } from 'electron';
import fetch from 'electron-fetch';
import fs from 'fs';
import i18n from 'i18next';
import i18nFsBackend from 'i18next-fs-backend';
import path from 'path';
import semver from 'semver';
import stream from 'stream';
import util from 'util';
import { PageId } from './Docs';
import { i18nConfig } from './shared/config';

const asyncExecFile = util.promisify(execFile);
const asyncPipeline = util.promisify(stream.pipeline);

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isMac = process.platform === 'darwin';
const resourcesLocation = path.join(app.getAppPath(), app.isPackaged ? '..' : '.');

// Localization

i18n.use(i18nFsBackend).init({
  ...i18nConfig,
  backend: {
    loadPath: path.join(resourcesLocation, 'assets', 'locales', '{{lng}}/{{ns}}.json'),
    addPath: path.join(resourcesLocation, 'assets', 'locales', '{{lng}}/{{ns}}.missing.json'),
    ident: 2,
  },
  debug: i18nConfig.debug && !app.isPackaged,
  initImmediate: false,
});

// App menu

function openDocs(page: PageId) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('open_docs', page);
}

function openURL(url: string) {
  shell.openExternal(url);
}

function setupMenu() {
  const t = i18n.getFixedT(null, null, 'App::Menu');

  const macAppMenu: MenuItemConstructorOptions = {
    label: t(`AppMenu::${app.name}`),
    submenu: [
      { role: 'about', label: t(`AppMenu::About ${app.name}`) },
      { type: 'separator' },
      { role: 'services', label: t('AppMenu::Services') },
      { type: 'separator' },
      { role: 'hide', label: t(`AppMenu::Hide ${app.name}`) },
      { role: 'hideOthers', label: t('AppMenu::Hide Others') },
      { role: 'unhide', label: t('AppMenu::Show All') },
      { type: 'separator' },
      { role: 'quit', label: t(`AppMenu::Quit ${app.name}`) },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    {
      label: t('View::&View'),
      submenu: [
        { role: 'copy', label: t('View::Copy') },
        { role: 'selectAll', label: t('View::Select All') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('View::Actual Size') },
        { role: 'zoomIn', label: t('View::Zoom In') },
        { role: 'zoomOut', label: t('View::Zoom Out') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('View::Toggle Full Screen') },
      ],
    },
    {
      label: t('Settings::&Settings'),
      submenu: [
        {
          label: t('Settings::Language'),
          submenu: [
            {
              label: 'English',
              type: 'radio',
              checked: i18n.language === 'en',
              click: () => i18n.changeLanguage('en'),
            },
            {
              label: 'Deutsch',
              type: 'radio',
              checked: i18n.language === 'de',
              click: () => i18n.changeLanguage('de'),
            },
          ],
        },
      ],
    },
    {
      label: t('Help::&Help'),
      submenu: [
        {
          label: t('Help::Documentation'),
          click: () => openDocs('operation'),
        },
        {
          label: t('Help::Changelog'),
          click: () => openDocs('changelog'),
        },
        {
          label: t('Help::License'),
          click: () => openDocs('license'),
        },
        { type: 'separator' },
        {
          label: t('Help::Learn More'),
          click: () => openURL('https://open-diffix.org'),
        },
        {
          label: t('Help::Community Discussions'),
          click: () => openURL('https://github.com/diffix/desktop/discussions'),
        },
        {
          label: t('Help::Search Issues'),
          click: () => openURL('https://github.com/diffix/desktop/issues'),
        },
        {
          label: t('Help::Latest Releases'),
          click: () => openURL('https://github.com/diffix/desktop/releases'),
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
    const url = request.url.substring('docs://'.length);
    callback(path.join(resourcesLocation, 'docs', i18n.language, url));
  });
}

// Main window

const ALLOWED_DOMAINS = ['https://open-diffix.org', 'https://github.com', 'https://arxiv.org', 'mailto:'];

function createWindow() {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1400,
    webPreferences: {
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      additionalArguments: [`--language=${i18n.language}`],
    },
    icon: path.join(resourcesLocation, 'assets', 'icon.png'),
  });

  mainWindow.on('page-title-updated', function (e) {
    e.preventDefault();
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
  i18n.changeLanguage(app.getLocale());
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

i18n.on('languageChanged', (lng) => {
  setupMenu();
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('language_changed', lng);
});

const diffixName = 'OpenDiffix.Service' + (process.platform === 'win32' ? '.exe' : '');
const diffixPath = path.join(resourcesLocation, 'bin', diffixName);

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

ipcMain.handle('set_main_window_title', (_event, title: string) => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.setTitle(title);
});

ipcMain.handle('check_for_updates', async (_event) => {
  const response = await fetch('https://api.github.com/repos/diffix/desktop/releases/latest');

  // 404 here means there hasn't yet been a full release yet, just prerelases or drafts
  if (response.status == 404) return null;

  const data = await response.json();
  const newestTagName = data['tag_name'];
  const newestSemVer = semver.coerce(newestTagName);
  const currentSemVer = semver.coerce(app.getVersion());

  return newestSemVer && currentSemVer && semver.gt(newestSemVer, currentSemVer) ? newestTagName : null;
});
