import { message } from 'antd';
import { useEffect, useState } from 'react';

export function useCheckUpdates(): void {
  const [, setCheckedUpdates] = useState(false);
  useEffect(() => {
    message.loading({ content: `Checking for updates...`, key: 'useCheckUpdates', duration: 0 });
    try {
      setCheckedUpdates(true);
      window.checkForUpdates().then((newerVersion) => {
        if (newerVersion) {
          message.info({
            content: `New version ${newerVersion} available! See Help -> Latest Releases`,
            key: 'useCheckUpdates',
            duration: 10,
          });
        } else {
          message.success({ content: 'No updates available!', key: 'useCheckUpdates', duration: 2 });
        }
      });
    } catch (e) {
      console.error(e);
      message.error({ content: 'Checking for updates failed!', key: 'useCheckUpdates', duration: 2 });
    }
    return () => {};
  }, []);
}
