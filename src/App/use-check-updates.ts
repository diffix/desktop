import { message } from 'antd';
import { useEffect } from 'react';

async function checkForUpdates() {
  try {
    const newerVersion = await window.checkForUpdates();
    if (newerVersion) {
      message.info({
        content: `New version ${newerVersion} available! See Help ► Latest Releases`,
        key: 'useCheckUpdates',
        duration: 10,
      });
    }
  } catch (e) {
    console.error(e);
    message.error({ content: 'Checking for updates failed!', key: 'useCheckUpdates', duration: 2 });
  }
}

export function useCheckUpdates(): void {
  useEffect(() => {
    checkForUpdates();
  }, []);
}
