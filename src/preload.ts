import { ipcRenderer } from 'electron';

window.executeQuery = (fileName: string, salt: string, statement: string) => {
  return ipcRenderer.invoke('execute_query', fileName, salt, statement);
};

window.hashFile = (fileName: string) => {
  return ipcRenderer.invoke('hash_file', fileName);
};
