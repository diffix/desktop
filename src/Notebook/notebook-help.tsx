import React from 'react';
import { Typography } from 'antd';
import { NotebookNavStep, useNavState } from './notebook-nav';

const { Link, Paragraph, Text, Title } = Typography;

function CsvImportHelp() {
  return (
    <div>
      <Title level={4}>CSV Import</Title>
      <Paragraph>
        Each row of the data must pertain to a single protected entity. A protected entity is typically an individual
        person, but can also be an account, a device, a vehicle, or even a company. Examples of data where there is more
        than one protected entity per row include transaction data (one individual transfer money to another individual)
        or social network data (one individual connects to another individual). Data like this must be pre-processed so
        that each row pertains to a single protected entity.
      </Paragraph>
      <Paragraph>
        The data may have one or multiple rows per protected entity. Examples of the former are demographic data or
        survey data. An example of the latter is time-series data. Data with multiple rows per protected entity must
        have at least one column containing a unique ID per protected entity.
      </Paragraph>
    </div>
  );
}

function DataPreviewHelp() {
  return (
    <div>
      <Title level={4}>Data Preview</Title>
      <Paragraph>Use the data preview to confirm that the data was imported correctly.</Paragraph>
    </div>
  );
}

function AidSelectionHelp() {
  return (
    <div>
      <Title level={4}>ID Selection</Title>
      <Paragraph>
        <strong>WARNING:</strong> If this configuration is not done correctly, the data will not be properly anonymized.
      </Paragraph>
      <Paragraph>
        If the data has one row per protected entity, then no entity identifier column need be selected. Otherwise,
        select a column containing a unique ID per protected entity. See{' '}
        <Link href="https://open-diffix.org" target="_blank">
          this link
        </Link>{' '}
        for more information on this selection.
      </Paragraph>
    </div>
  );
}

function ColumnSelectionHelp() {
  return (
    <div>
      <Title level={4}>Column Selection</Title>
      <Paragraph>Select which columns appear in the anonymized results.</Paragraph>
      <Paragraph>
        Numeric columns may be generalized as bins. Non-numeric columns may be generalized by selecting a substring
        (offset and number of characters).
      </Paragraph>
      <Paragraph>
        If an ID column was previously selected, you can choose between counting rows or counting protected entities.
      </Paragraph>
    </div>
  );
}

function AnonymizationSummaryHelp() {
  return (
    <div>
      <Title level={4}>Anonymization Summary</Title>
      <Paragraph>
        Easy Diffix distorts the data in two ways. It perturbs counts, and it suppresses data that pertains to too few
        protected entities. The summary is useful for determining the overall quality of the anonymized data: the
        relative count distortion and the amount of suppression. Data quality may be improved by selecting fewer
        columns, or by generalizing.
      </Paragraph>
    </div>
  );
}

function AnonymizedResultsHelp() {
  return (
    <div>
      <Title level={4}>Anonymized Results</Title>
      <Paragraph>
        The anonymized results may be viewed side-by-side with the non-anonymized results using the{' '}
        <Text code>Combined view</Text>
        button. Suppressed bins are shaded in grey. Non-suppressed bins give the true count side-by-side with the
        anonymized count, and display the relative count distortion. This combined view is useful for determining the
        precise causes of distortion and suppression, and for deciding in detail if the quality of the anonymized data
        is satisfactory.
      </Paragraph>
    </div>
  );
}

function CsvExportHelp() {
  return (
    <div>
      <Title level={4}>CSV Export</Title>
      <Paragraph>Exports the anonymized results only (not the combined view).</Paragraph>
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
