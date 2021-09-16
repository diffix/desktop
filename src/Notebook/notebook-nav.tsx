import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Steps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useInViewport } from 'react-in-viewport';
import { useImmer } from 'use-immer';
import { produce } from 'immer';
import { debounce, findLastIndex, noop } from 'lodash';

import { useSingleton } from '../shared';

const { Step } = Steps;

// Nav state

export enum NotebookNavStep {
  CsvImport,
  DataPreview,
  AidSelection,
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
  isVisible(step: NotebookNavStep): boolean;
  focusStep(step: NotebookNavStep): void;
  cancelPendingFocus(): void;
};

const NotebookNavFunctionsContext = React.createContext<NotebookNavFunctions>({
  updateStepStatus: noop,
  updateStepVisibility: noop,
  isVisible: () => {
    throw new Error('Not implemented');
  },
  focusStep: noop,
  cancelPendingFocus: noop,
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
  const visibilityRef = useRef(defaultVisibility);

  const focusStep = useSingleton(() =>
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

  const navFunctions = useRef<NotebookNavFunctions>({
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
    isVisible(step: NotebookNavStep) {
      return visibilityRef.current[step];
    },
    focusStep(step: NotebookNavStep) {
      focusStep(step);
      focusStep.flush();
    },
    cancelPendingFocus() {
      focusStep.cancel();
    },
  });

  useEffect(() => {
    if (!isActive) {
      focusStep.cancel();
      const id = setTimeout(() => focusStep.cancel(), 400);
      return () => clearTimeout(id);
    }
  }, [isActive, focusStep]);

  useEffect(() => {
    return () => focusStep.cancel();
  }, [focusStep]);

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

  return (
    <div style={{ position: 'relative' }}>
      <div ref={scrollRef} style={{ position: 'absolute', top: -60, left: 0 }}></div>
      <div ref={visibilityRef} style={{ position: 'absolute', top: -40, left: 0 }}></div>
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

const NotebookNavSteps = React.memo<{ steps: NotebookNavStepState[] }>(({ steps }) => {
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
        const { htmlElement } = steps[step];
        if (htmlElement) {
          htmlElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
        navFunctions.focusStep(step);

        // Ugly workaround below...
        // `scrollIntoView` does not return a promise, so we have to cancel intermediate events that happened while smooth scrolling
        setTimeout(() => {
          navFunctions.cancelPendingFocus();
          if (!navFunctions.isVisible(step)) {
            // If scrolling across the entire page, 400 ms is not enough, so we wait again...
            setTimeout(() => navFunctions.cancelPendingFocus(), 400);
          }
        }, 400);
      }}
    >
      <Step status={status(NotebookNavStep.CsvImport)} title="CSV Import" description="Load data from CSV" />
      <Step status={status(NotebookNavStep.DataPreview)} title="Data Preview" description="Preview contents of file" />
      <Step
        status={status(NotebookNavStep.AidSelection)}
        title="ID Selection"
        description="Select the entity identifier column"
      />
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
});

export const NotebookNav: React.FunctionComponent = () => {
  const { steps } = useNavState();
  return <NotebookNavSteps steps={steps} />;
};
