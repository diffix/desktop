import { ipcRenderer } from 'electron';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.callService = (request: any, signal: AbortSignal) =>
  newTask(signal, async (taskId) => {
    const json: string | null = await ipcRenderer.invoke('call_service', taskId, JSON.stringify(request));
    return json ? JSON.parse(json) : null;
  });

window.selectExportFile = () => {
  return ipcRenderer.invoke('select_export_file');
};

window.hashFile = (fileName: string, signal: AbortSignal) =>
  newTask(signal, (taskId) => {
    return ipcRenderer.invoke('hash_file', taskId, fileName);
  });
