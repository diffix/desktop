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

window.executeQuery = (fileName: string, salt: string, statement: string, signal: AbortSignal) =>
  newTask(signal, async (taskId) => {
    const json: string = await ipcRenderer.invoke('execute_query', taskId, fileName, salt, statement);
    return JSON.parse(json);
  });

window.selectExportFile = () => {
  return ipcRenderer.invoke('select_export_file');
};

window.exportQueryResult = (inFileName: string, salt: string, statement: string, outFileName: string) => {
  return ipcRenderer.invoke('export_query_result', inFileName, salt, statement, outFileName);
};

window.hashFile = (fileName: string, signal: AbortSignal) =>
  newTask(signal, (taskId) => {
    return ipcRenderer.invoke('hash_file', taskId, fileName);
  });
