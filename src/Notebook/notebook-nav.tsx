import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Steps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useInViewport } from 'react-in-viewport';
import { useImmer } from 'use-immer';
import { produce } from 'immer';
import { debounce, findLastIndex, noop } from 'lodash';

import { useStaticValue } from '../shared';

const { Step } = Steps;

// Nav state

export enum NotebookNavStep {
  CsvImport,
  DataPreview,
  AidSelection,
  ColumnSelection,
  AnonParamsSelection,
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
  focusedStep: NotebookNavStep;
};

const defaultNavState: NotebookNavState = {
  steps: Array(NotebookNavStep.CsvExport + 1)
    .fill(null)
    .map(() => ({ status: 'inactive', htmlElement: null })),
  focusedStep: NotebookNavStep.CsvImport,
};

const defaultVisibility = Array(NotebookNavStep.CsvExport + 1).fill(false);

const NotebookNavStateContext = React.createContext<NotebookNavState>(defaultNavState);

export function useNavState(): NotebookNavState {
  return useContext(NotebookNavStateContext);
}

// Nav functions

type NotebookNavStepPatch =
  | { htmlElement: null; status?: never }
  | { htmlElement: HTMLElement; status: 'active' | 'loading' | 'done' | 'failed' }
  | { htmlElement?: never; status: NotebookNavStepStatus };

type NotebookNavFunctions = {
  updateStepStatus(step: NotebookNavStep, patch: NotebookNavStepPatch): void;
  updateStepVisibility(step: NotebookNavStep, visible: boolean): void;
  scrollToStep(step: NotebookNavStep): void;
};

const NotebookNavFunctionsContext = React.createContext<NotebookNavFunctions>({
  updateStepStatus: noop,
  updateStepVisibility: noop,
  scrollToStep: noop,
});

function useNavFunctions(): NotebookNavFunctions {
  return useContext(NotebookNavFunctionsContext);
}

// Context provider

export type NotebookNavProviderProps = {
  isActive: boolean;
};

export const NotebookNavProvider: React.FunctionComponent<NotebookNavProviderProps> = ({ isActive, children }) => {
  const [navState, updateNavState] = useImmer(defaultNavState);

  // Refs are needed in `navFunctions` because we want it referentially stable.
  const navStateRef = useRef(navState);
  navStateRef.current = navState;
  const visibilityRef = useRef(defaultVisibility);

  const focusStep = useStaticValue(() =>
    debounce(
      (step?: NotebookNavStep) =>
        updateNavState((draft) => {
          if (typeof step !== 'undefined') {
            draft.focusedStep = step;
            return;
          }

          const maxStep = Math.max(
            NotebookNavStep.CsvImport,
            findLastIndex(draft.steps, (s) => s.status !== 'inactive'),
          );
          const visibleStep = visibilityRef.current.findIndex((visible) => visible);
          draft.focusedStep = visibleStep < 0 || visibleStep > maxStep ? maxStep : visibleStep;
        }),
      500,
    ),
  );

  const navFunctions = useStaticValue<NotebookNavFunctions>(() => ({
    updateStepStatus(step, patch) {
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

      focusStep();
    },
    updateStepVisibility(step: NotebookNavStep, visible: boolean) {
      visibilityRef.current = produce(visibilityRef.current, (draft) => void (draft[step] = visible));
      focusStep();
    },
    scrollToStep(step: NotebookNavStep) {
      const { htmlElement } = navStateRef.current.steps[step];
      if (htmlElement) {
        htmlElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }

      focusStep(step);
      focusStep.flush();

      // Ugly workaround below...
      // `scrollIntoView` does not return a promise, so we have to cancel intermediate events that happened while smooth scrolling
      setTimeout(() => {
        focusStep.cancel();
        if (!visibilityRef.current[step]) {
          // If scrolling across the entire page, 400 ms is not enough, so we wait again...
          setTimeout(() => focusStep.cancel(), 400);
        }
      }, 400);
    },
  }));

  // Prevents updates while notebook is not active.
  useEffect(() => {
    if (!isActive) {
      focusStep.cancel();
      const id = setTimeout(() => focusStep.cancel(), 400);
      return () => clearTimeout(id);
    }
  }, [isActive, focusStep]);

  // Cancels pending updates when unmounted.
  useEffect(() => {
    return () => focusStep.cancel();
  }, [focusStep]);

  return (
    <NotebookNavStateContext.Provider value={navState}>
      <NotebookNavFunctionsContext.Provider value={navFunctions}>{children}</NotebookNavFunctionsContext.Provider>
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

  const visibilityRef = useRef<HTMLDivElement>(null);

  const scrollRef = useCallback(
    (htmlElement: HTMLElement | null) => {
      navFunctions.updateStepStatus(step, {
        htmlElement,
        status,
      } as NotebookNavStepPatch);
    },
    [step, status, navFunctions],
  );

  const { inViewport } = useInViewport(visibilityRef, {}, { disconnectOnLeave: false }, {});

  useEffect(() => {
    navFunctions.updateStepVisibility(step, inViewport);
  }, [step, inViewport, navFunctions]);

  // Clicking on the first step will scroll to top.
  const scrollOffset = step === 0 ? -32 : -24;

  return (
    <div style={{ position: 'relative' }}>
      <div ref={scrollRef} style={{ position: 'absolute', top: scrollOffset, left: 0 }}></div>
      <div ref={visibilityRef} style={{ position: 'absolute', top: 0, left: 0 }}></div>
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

function mapText(text: string, focused: boolean) {
  if (focused) return <strong>{text}</strong>;
  else return <>{text}</>;
}

const NotebookNavSteps = React.memo<{ steps: NotebookNavStepState[]; focusedStep: NotebookNavStep }>(
  ({ steps, focusedStep }) => {
    const navFunctions = useNavFunctions();
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
          navFunctions.scrollToStep(step);
        }}
        size="small"
      >
        <Step
          status={status(NotebookNavStep.CsvImport)}
          title={mapText('CSV Import', focusedStep === NotebookNavStep.CsvImport)}
          description="Load data from CSV"
        />
        <Step
          status={status(NotebookNavStep.DataPreview)}
          title={mapText('Data Preview', focusedStep === NotebookNavStep.DataPreview)}
          description="Preview contents of file"
        />
        <Step
          status={status(NotebookNavStep.AidSelection)}
          title={mapText('ID Selection', focusedStep === NotebookNavStep.AidSelection)}
          description="Select the entity identifier column"
        />
        <Step
          status={status(NotebookNavStep.ColumnSelection)}
          title={mapText('Column Selection', focusedStep === NotebookNavStep.ColumnSelection)}
          description="Select columns for anonymization"
        />
        <Step
          status={status(NotebookNavStep.AnonParamsSelection)}
          title={mapText('Anonymization Configuration', focusedStep === NotebookNavStep.AnonParamsSelection)}
          description="Configure the anonymization parameters"
        />
        <Step
          status={status(NotebookNavStep.AnonymizationSummary)}
          title={mapText('Anonymization Summary', focusedStep === NotebookNavStep.AnonymizationSummary)}
          description="Review distortion statistics"
        />
        <Step
          status={status(NotebookNavStep.AnonymizedResults)}
          title={mapText('Anonymized Results', focusedStep === NotebookNavStep.AnonymizedResults)}
          description="Preview anonymized results"
        />
        <Step
          status={status(NotebookNavStep.CsvExport)}
          title={mapText('CSV Export', focusedStep === NotebookNavStep.CsvExport)}
          description="Export anonymized data to CSV"
        />
      </Steps>
    );
  },
);

export const NotebookNav: React.FunctionComponent = () => {
  const { steps, focusedStep } = useNavState();
  return <NotebookNavSteps steps={steps} focusedStep={focusedStep} />;
};
