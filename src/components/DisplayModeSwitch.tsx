import React, { FunctionComponent } from 'react';
import { Radio } from 'antd';

import { DisplayMode } from '../types';

type DisplayModeSwitchProps = {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
};

export const DisplayModeSwitch: FunctionComponent<DisplayModeSwitchProps> = ({ value, onChange }) => {
  return (
    <Radio.Group className="DisplayModeSwitch" value={value} onChange={(e) => onChange(e.target.value)}>
      <Radio.Button value="anonymized">Anonymized</Radio.Button>
      <Radio.Button value="raw">Raw results</Radio.Button>
      <Radio.Button value="combined">Combined view</Radio.Button>
    </Radio.Group>
  );
};
