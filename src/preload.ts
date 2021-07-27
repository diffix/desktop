import { ipcRenderer } from 'electron';

window.executeQuery = async (fileName: string, salt: string, statement: string) => {
  const json: string = await ipcRenderer.invoke('execute_query', fileName, salt, statement);
  return JSON.parse(json);
};

window.hashFile = (fileName: string) => {
  return ipcRenderer.invoke('hash_file', fileName);
};
