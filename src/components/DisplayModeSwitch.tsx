import React, { FunctionComponent } from 'react';
import { Radio } from 'antd';

import { DisplayMode } from '../types';

type DisplayModeSwitchProps = {
  value: DisplayMode;
  setValue: (mode: DisplayMode) => void;
};

export const DisplayModeSwitch: FunctionComponent<DisplayModeSwitchProps> = ({ value, setValue }) => {
  return (
    <Radio.Group value={value} onChange={(e) => setValue(e.target.value)}>
      <Radio.Button value="anonymized">Anonymized</Radio.Button>
      <Radio.Button value="raw">Raw results</Radio.Button>
      <Radio.Button value="combined">Combined view</Radio.Button>
    </Radio.Group>
  );
};
