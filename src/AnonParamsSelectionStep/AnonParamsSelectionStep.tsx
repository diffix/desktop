import React, { FunctionComponent, useState } from 'react';
import { Divider, Radio, Typography, Tooltip } from 'antd';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { AnonParamsPreset, AnonymizationParams } from '../types';

const { Title } = Typography;

export type AnonParamsSelectionStepProps = {
  children: (data: AnonParamsSelectionStepData) => React.ReactNode;
};

export type AnonParamsSelectionStepData = {
  anonParams: AnonymizationParams;
};

function presetAnonParams(preset: AnonParamsPreset): AnonymizationParams {
  switch (preset) {
    case 'P':
      return {
        suppression: {
          lowThreshold: 3,
          sD: 1.0,
          lowMeanGap: 2.0,
        },
        outlierCount: { lower: 1, upper: 2 },
        topCount: { lower: 3, upper: 4 },
        baseNoiseSD: 1.5,
      };

    case 'XP':
      return {
        suppression: {
          lowThreshold: 4,
          sD: 1.0,
          lowMeanGap: 2.0,
        },
        outlierCount: { lower: 2, upper: 3 },
        topCount: { lower: 3, upper: 4 },
        baseNoiseSD: 2.25,
      };

    case 'XXP':
      return {
        suppression: {
          lowThreshold: 5,
          sD: 1.0,
          lowMeanGap: 2.0,
        },
        outlierCount: { lower: 2, upper: 3 },
        topCount: { lower: 3, upper: 4 },
        baseNoiseSD: 3.0,
      };
  }
}

export const AnonParamsSelectionStep: FunctionComponent<AnonParamsSelectionStepProps> = ({ children }) => {
  const [preset, setPreset] = useState<AnonParamsPreset>('P');

  const anonParams = presetAnonParams(preset);

  return (
    <>
      <div className="AnonParamsSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AnonParamsSelection} status="done" />
        <Title level={3}>Adjust anonymization parameters</Title>
        <Radio.Group value={preset} size="large" buttonStyle="solid" onChange={(e) => setPreset(e.target.value)}>
          <Tooltip placement="bottom" title="Strong anonymity, best output utility">
            <Radio.Button value="P">Max utility</Radio.Button>
          </Tooltip>
          <Tooltip placement="bottom" title="Stronger anonymity, great output utility">
            <Radio.Button value="XP">Balanced</Radio.Button>
          </Tooltip>
          <Tooltip placement="bottom" title="Extreme anonymity, good output utility">
            <Radio.Button value="XXP">Max privacy</Radio.Button>
          </Tooltip>
        </Radio.Group>
      </div>
      {/* Render next step */}
      <Divider />
      {children({ anonParams })}
    </>
  );
};
