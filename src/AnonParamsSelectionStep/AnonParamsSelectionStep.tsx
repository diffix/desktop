import { Divider, Form, InputNumber, Checkbox, Typography } from 'antd';
import React, { FunctionComponent, useState } from 'react';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { useMemoStable, useT } from '../shared';
import { AnonymizationParams } from '../types';

const { Title } = Typography;

export type AnonParamsSelectionStepProps = {
  children: (data: AnonParamsSelectionStepData) => React.ReactNode;
};

export type AnonParamsSelectionStepData = {
  anonParams: AnonymizationParams;
};

export const AnonParamsSelectionStep: FunctionComponent<AnonParamsSelectionStepProps> = ({ children }) => {
  const t = useT('AnonParamsSelectionStep');
  const [lowThreshold, setLowThreshold] = useState<number>(3);
  const minLowThreshold = 2;
  const [recoverOutliers, setRecoverOutliers] = useState<boolean>(true);

  const anonParams = useMemoStable(
    () => ({
      suppression: {
        lowThreshold: lowThreshold,
        layerSD: 1.0,
        lowMeanGap: 2.0,
      },
      outlierCount: { lower: 1, upper: 2 },
      topCount: { lower: 3, upper: 4 },
      layerNoiseSD: 1.0,
      recoverOutliers: recoverOutliers,
    }),
    [lowThreshold, recoverOutliers],
  );

  return (
    <>
      <div className="AnonParamsSelectionStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.AnonParamsSelection} status="done" />
        <Title level={3}>{t('Suppression configuration')}</Title>

        <Form
          layout="inline"
          initialValues={{ lowThreshold: lowThreshold, recoverOutliers: recoverOutliers }}
          onValuesChange={({ lowThreshold, recoverOutliers }) => {
            if (lowThreshold != null) setLowThreshold(Math.round(lowThreshold));
            if (recoverOutliers != null) setRecoverOutliers(recoverOutliers);
          }}
        >
          <Form.Item
            label={t('Suppression Threshold')}
            tooltip={t(
              'Bins with fewer protected entities than this are suppressed. Bins with more may not be suppressed.',
            )}
            name="lowThreshold"
          >
            <InputNumber
              // `precision` and `Math.round` in change handler both needed to protect from decimals
              precision={0}
              size="middle"
              min={minLowThreshold}
            />
          </Form.Item>
          <Form.Item
            label={t('Redistribute Outliers Label')}
            tooltip={t('Redistribute Outliers Tooltip')}
            name="recoverOutliers"
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
        </Form>
      </div>
      {/* Render next step */}
      <Divider />
      {children({ anonParams })}
    </>
  );
};
