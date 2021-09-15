import React from 'react';
import { Typography } from 'antd';
import { NotebookNavStep, useNavState } from './notebook-nav';

const { Paragraph, Title } = Typography;

function CsvImportHelp() {
  return (
    <div>
      <Title level={4}>CsvImportHelp</Title>
      <Paragraph>CsvImportHelp step help...</Paragraph>
    </div>
  );
}

function DataPreviewHelp() {
  return (
    <div>
      <Title level={4}>DataPreviewHelp</Title>
      <Paragraph>DataPreviewHelp step help...</Paragraph>
    </div>
  );
}

function AidSelectionHelp() {
  return (
    <div>
      <Title level={4}>AidSelectionHelp</Title>
      <Paragraph>AidSelection step help...</Paragraph>
    </div>
  );
}

function ColumnSelectionHelp() {
  return (
    <div>
      <Title level={4}>ColumnSelectionHelp</Title>
      <Paragraph>ColumnSelectionHelp step help...</Paragraph>
    </div>
  );
}

function AnonymizationSummaryHelp() {
  return (
    <div>
      <Title level={4}>AnonymizationSummaryHelp</Title>
      <Paragraph>AnonymizationSummaryHelp step help...</Paragraph>
    </div>
  );
}

function AnonymizedResultsHelp() {
  return (
    <div>
      <Title level={4}>AnonymizedResultsHelp</Title>
      <Paragraph>AnonymizedResultsHelp step help...</Paragraph>
    </div>
  );
}

function CsvExportHelp() {
  return (
    <div>
      <Title level={4}>CsvExportHelp</Title>
      <Paragraph>CsvExportHelp step help...</Paragraph>
    </div>
  );
}

const NotebookStepHelp = React.memo<{ step: NotebookNavStep }>(({ step }) => {
  switch (step) {
    case NotebookNavStep.CsvImport:
      return <CsvImportHelp />;
    case NotebookNavStep.DataPreview:
      return <DataPreviewHelp />;
    case NotebookNavStep.AidSelection:
      return <AidSelectionHelp />;
    case NotebookNavStep.ColumnSelection:
      return <ColumnSelectionHelp />;
    case NotebookNavStep.AnonymizationSummary:
      return <AnonymizationSummaryHelp />;
    case NotebookNavStep.AnonymizedResults:
      return <AnonymizedResultsHelp />;
    case NotebookNavStep.CsvExport:
      return <CsvExportHelp />;
    default:
      return null;
  }
});

export const NotebookHelp: React.FunctionComponent = () => {
  const { focusedStep } = useNavState();
  return <NotebookStepHelp step={focusedStep} />;
};
