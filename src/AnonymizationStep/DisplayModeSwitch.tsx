import { Radio } from 'antd';
import React, { FunctionComponent } from 'react';
import { DisplayMode } from '../types';

export type DisplayModeSwitchProps = {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
};

export const DisplayModeSwitch: FunctionComponent<DisplayModeSwitchProps> = ({ value, onChange }) => {
  return (
    <Radio.Group className="DisplayModeSwitch" value={value} onChange={(e) => onChange(e.target.value)}>
      <Radio.Button value="anonymized">Anonymized</Radio.Button>
      <Radio.Button value="combined">Combined view</Radio.Button>
    </Radio.Group>
  );
};
