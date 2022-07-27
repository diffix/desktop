import { notification } from 'antd';
import React, { useEffect } from 'react';

const notificationContent = (version: string) => {
  return (
    <>
      A more recent version ({version}) is available.
      <br />
      Click{' '}
      <strong>
        <a href={`https://github.com/diffix/desktop/releases/tag/${version}`} target="_blank" rel="noreferrer">
          here
        </a>
      </strong>{' '}
      to open the release page.
    </>
  );
};

async function checkForUpdates() {
  try {
    const newerVersion = await window.checkForUpdates();
    if (newerVersion) {
      notification.info({
        message: 'Update Available',
        description: notificationContent(newerVersion),
        duration: 10,
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export function useCheckUpdates(): void {
  useEffect(() => {
    checkForUpdates();
  }, []);
}
