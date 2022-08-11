import { notification } from 'antd';
import React, { useEffect } from 'react';
import { Trans } from 'react-i18next';
import { getT, TFunc } from '../shared';

const notificationContent = (version: string, t: TFunc) => {
  return (
    // Needs an explicit i18n because the notification is rendered in a portal.
    <Trans i18n={window.i18n} t={t}>
      A more recent version ({{ version }}) is available.
      <br />
      Click{' '}
      <strong>
        <a href={`https://github.com/diffix/desktop/releases/tag/${version}`} target="_blank" rel="noreferrer">
          here
        </a>
      </strong>{' '}
      to open the release page.
    </Trans>
  );
};

async function checkForUpdates() {
  try {
    const newerVersion = await window.checkForUpdates();
    if (newerVersion) {
      const t = getT('check-updates');
      notification.info({
        message: t('Update Available'),
        description: notificationContent(newerVersion, t),
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
