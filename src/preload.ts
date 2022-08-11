import { ipcRenderer } from 'electron';
import i18n from 'i18next';
import { set } from 'lodash';
import { initReactI18next } from 'react-i18next';
import { i18nConfig } from './shared/config';

import de from '../assets/locales/de/translation.json';
import en from '../assets/locales/en/translation.json';

const args = window.process.argv;
let initialLanguage = 'en';
for (let i = args.length - 1; i >= 0; i--) {
  const arg = args[i];
  if (arg.startsWith('--language=')) {
    initialLanguage = arg.substring('--language='.length);
    break;
  }
}

i18n.use(initReactI18next).init({
  ...i18nConfig,
  lng: initialLanguage,
  resources: { en: { [i18nConfig.ns]: en }, de: { [i18nConfig.ns]: de } },
});

window.i18n = i18n;
window.i18nMissingKeys = {};

i18n.on('missingKey', (lngs, namespace, key) => {
  const keyPath = key.split(i18nConfig.keySeparator);
  for (const lng of lngs) {
    set(window.i18nMissingKeys, [lng, namespace, ...keyPath], keyPath[keyPath.length - 1]);
  }
});

ipcRenderer.on('language_changed', (_event, language) => {
  i18n.changeLanguage(language);
});

let nextTaskId = 1;

async function newTask<T>(signal: AbortSignal, runner: (taskId: string) => Promise<T>): Promise<T> {
  if (signal.aborted) throw new Error('Operation is canceled.');

  const taskId = (nextTaskId++).toString();
  let taskDone = false;

  signal.addEventListener('abort', () => {
    if (!taskDone) {
      ipcRenderer.send('cancel_task', taskId);
    }
  });

  try {
    return await runner(taskId);
  } finally {
    taskDone = true;
  }
}

window.callService = (request: unknown, signal: AbortSignal) =>
  newTask(signal, async (taskId) => {
    const json: string | null = await ipcRenderer.invoke('call_service', taskId, JSON.stringify(request));
    return json ? JSON.parse(json) : null;
  });

window.selectExportFile = (defaultPath: string) => {
  return ipcRenderer.invoke('select_export_file', defaultPath);
};

window.hashFile = (fileName: string, signal: AbortSignal) =>
  newTask(signal, (taskId) => {
    return ipcRenderer.invoke('hash_file', taskId, fileName);
  });

window.onOpenDocs = (_page) => {};

window.setMainWindowTitle = (title: string) => {
  ipcRenderer.invoke('set_main_window_title', title);
};

window.checkForUpdates = () => {
  return ipcRenderer.invoke('check_for_updates');
};

ipcRenderer.on('open_docs', (_event, page) => {
  window.onOpenDocs(page);
});
