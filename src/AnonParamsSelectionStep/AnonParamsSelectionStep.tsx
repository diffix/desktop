import React, { FunctionComponent, useState } from 'react';
import { Divider, Typography, Form, InputNumber } from 'antd';

import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { AnonymizationParams } from '../types';

const { Title } = Typography;

export type AnonParamsSelectionStepProps = {
  children: (data: AnonParamsSelectionStepData) => React.ReactNode;
};

export type AnonParamsSelectionStepData = {
  anonParams: AnonymizationParams;
};

export const AnonParamsSelectionStep: FunctionComponent<AnonParamsSelectionStepProps> = ({ children }) => {
  const [lowThreshold, setLowThreshold] = useState<number>(3);
  const minLowThreshold = 2;

  const anonParams = {
    suppression: {
      lowThreshold: lowThreshold,
      sD: 1.0,
      lowMeanGap: 2.0,
    },
    outlierCount: { lower: 1, upper: 2 },
    topCount: { lower: 3, upper: 4 },
    baseNoiseSD: 1.5,
  };

  return (
    <>
      <div className="AnonParamsSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AnonParamsSelection} status="done" />
        <Title level={3}>Adjust suppression threshold</Title>

        <Form layout="inline">
          <Form.Item
            label="Suppression Threshold"
            tooltip="Bins with fewer protected entities than this are suppressed. Bins with more may not be suppressed"
            name="lowThreshold"
          >
            <InputNumber
              size="middle"
              min={minLowThreshold}
              defaultValue={lowThreshold}
              value={lowThreshold}
              onChange={(newThreshold) => setLowThreshold(newThreshold)}
            />
          </Form.Item>
        </Form>
      </div>
      {/* Render next step */}
      <Divider />
      {children({ anonParams })}
    </>
  );
};
