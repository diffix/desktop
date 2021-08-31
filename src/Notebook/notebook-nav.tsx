import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Steps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useImmer } from 'use-immer';
import { noop } from 'lodash';

const { Step } = Steps;

// Nav state

export enum NotebookNavStep {
  CsvImport,
  DataPreview,
  ColumnSelection,
  AnonymizationSummary,
  AnonymizedResults,
  CsvExport,
}

export type NotebookNavStepStatus = 'inactive' | 'active' | 'loading' | 'done' | 'failed';

type NotebookNavStepState = {
  htmlElement: HTMLElement | null;
  status: NotebookNavStepStatus;
};

type NotebookNavState = {
  steps: NotebookNavStepState[];
};

const defaultNavState: NotebookNavState = {
  steps: Array(NotebookNavStep.CsvExport + 1)
    .fill(null)
    .map(() => ({ status: 'inactive', htmlElement: null })),
};

const NotebookNavStateContext = React.createContext<NotebookNavState>(defaultNavState);

function useNavState(): NotebookNavState {
  return useContext(NotebookNavStateContext);
}

// Nav functions

type NotebookNavStepPatch =
  | { htmlElement: null; status?: never }
  | { htmlElement: HTMLElement; status: 'active' | 'loading' | 'done' | 'failed' }
  | { htmlElement?: never; status: NotebookNavStepStatus };

type NotebookNavFunctions = {
  updateStep(step: NotebookNavStep, patch: NotebookNavStepPatch): void;
};

const NotebookNavFunctionsContext = React.createContext<NotebookNavFunctions>({
  updateStep: noop,
});

function useNavFunctions(): NotebookNavFunctions {
  return useContext(NotebookNavFunctionsContext);
}

// Context provider

export const NotebookNavProvider: React.FunctionComponent = ({ children }) => {
  const [navState, updateNavState] = useImmer(defaultNavState);
  const navFunctions = useRef<NotebookNavFunctions>({
    updateStep(step, patch) {
      updateNavState((draft) => {
        const { steps } = draft as NotebookNavState;
        if (patch.htmlElement === null) {
          steps[step] = {
            htmlElement: null,
            status: 'inactive',
          };
        } else if (patch.htmlElement) {
          steps[step] = patch;
        } else if (steps[step].htmlElement) {
          steps[step].status = patch.status;
        }
      });
    },
  });

  return (
    <NotebookNavStateContext.Provider value={navState}>
      <NotebookNavFunctionsContext.Provider value={navFunctions.current}>
        {children}
      </NotebookNavFunctionsContext.Provider>
    </NotebookNavStateContext.Provider>
  );
};

// Context consumers

export type NotebookNavAnchorProps = {
  step: NotebookNavStep;
  status?: NotebookNavStepStatus;
};

export const NotebookNavAnchor: React.FunctionComponent<NotebookNavAnchorProps> = ({ step, status = 'active' }) => {
  const navFunctions = useNavFunctions();

  const ref = useCallback(
    (htmlElement: HTMLElement | null) => {
      navFunctions.updateStep(step, {
        htmlElement,
        status,
      } as NotebookNavStepPatch);
    },
    [step, status, navFunctions],
  );

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} style={{ position: 'absolute', top: -60, left: 0 }}></div>
    </div>
  );
};

function mapStatus(status: NotebookNavStepStatus): 'error' | 'process' | 'finish' | 'wait' {
  switch (status) {
    case 'inactive':
      return 'wait';
    case 'active':
    case 'loading':
      return 'process';
    case 'done':
      return 'finish';
    case 'failed':
      return 'error';
  }
}

export const NotebookNav: React.FunctionComponent = () => {
  const { steps } = useNavState();
  const status = (step: NotebookNavStep) => mapStatus(steps[step].status);

  return (
    <Steps
      progressDot={(dot, { index }) =>
        steps[index].status === 'loading' ? (
          <span
            key="loading"
            className="ant-steps-icon-dot"
            style={{
              backgroundColor: 'transparent',
              color: '#1890ff',
              left: -5,
            }}
          >
            <LoadingOutlined />
          </span>
        ) : (
          dot
        )
      }
      direction="vertical"
      current={-1}
      onChange={(step) => {
        const { htmlElement } = steps[step];
        if (htmlElement) {
          htmlElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }}
    >
      <Step status={status(NotebookNavStep.CsvImport)} title="CSV Import" description="Load data from CSV" />
      <Step status={status(NotebookNavStep.DataPreview)} title="Data Preview" description="Preview contents of file" />
      <Step
        status={status(NotebookNavStep.ColumnSelection)}
        title="Column Selection"
        description="Select columns for anonymization"
      />
      <Step
        status={status(NotebookNavStep.AnonymizationSummary)}
        title="Anonymization Summary"
        description="Review distortion statistics"
      />
      <Step
        status={status(NotebookNavStep.AnonymizedResults)}
        title="Anonymized Results"
        description="Preview anonymized results"
      />
      <Step status={status(NotebookNavStep.CsvExport)} title="CSV Export" description="Export anonymized data to CSV" />
    </Steps>
  );
};
