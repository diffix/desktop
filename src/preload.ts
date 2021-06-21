import { ipcRenderer } from 'electron';

window.executeQuery = (fileName: string, statement: string) => {
  return ipcRenderer.invoke('execute_query', fileName, statement);
};
