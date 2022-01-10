import React from 'react';
import { Typography } from 'antd';

import { NotebookNavStep, useNavState } from './notebook-nav';
import { DocsLink } from '../Docs';

const { Paragraph, Text, Title } = Typography;

function CsvImportHelp() {
  return (
    <div>
      <Title level={4}>CSV Import</Title>
      <Paragraph>
        <strong>Diffix for Desktop</strong> auto-detects the CSV deliminter, as well as the field type (text and
        numeric).{' '}
        <DocsLink page="operation" section="load-table-from-csv">
          Click here for details.
        </DocsLink>
      </Paragraph>
      <Paragraph>
        <DocsLink page="operation" section="sample-csv-files">
          Sample CSV files
        </DocsLink>{' '}
        are available for testing purposes.
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
        If the data has one row per person (or other <em>protected entity</em>), then no entity identifier column need
        be selected. Otherwise, select a column containing a unique ID per protected entity.{' '}
        <DocsLink page="operation" section="important-configure-the-protected-entity-identifier-column">
          Click here for details on how to set.
        </DocsLink>
      </Paragraph>
    </div>
  );
}

function AnonParamsSelectionHelp() {
  return (
    <div>
      <Title level={4}>Suppression Threshold Configuration</Title>
      <Paragraph>
        The suppression threshold determines the minimum number of protected entities that comprise any bin. Bins with
        fewer entities than this threshold are suppressed. Changing this threshold automatically recomputes the
        anonymized results.{' '}
        <DocsLink page="operation" section="suppression-threshold-configuration">
          Click here for details on how to set.
        </DocsLink>
      </Paragraph>
    </div>
  );
}

function ColumnSelectionHelp() {
  return (
    <div>
      <Title level={4}>Column Selection</Title>
      <Paragraph>
        Select the columns to be anonymized and the amount of generalization per column. Any changes automatically
        recomputes the anonymized results.
      </Paragraph>
      <Paragraph>
        Numeric columns may be generalized as bins. Non-numeric columns may be generalized by selecting a substring
        (offset and number of characters).{' '}
        <DocsLink page="operation" section="select-columns-and-generalization">
          Click here for details.
        </DocsLink>
      </Paragraph>
      <Paragraph>
        The <Text code>Count</Text> toggle below the column selection selects whether to count rows or to count the
        number of protected entities for each bin in the anonymized output.
      </Paragraph>
    </div>
  );
}

function AnonymizationSummaryHelp() {
  return (
    <div>
      <Title level={4}>Anonymization Summary</Title>
      <Paragraph>
        <strong>Diffix for Desktop</strong> distorts the data in two ways. It perturbs counts, and it suppresses data
        that pertains to too few protected entities. The summary is useful for determining the overall quality of the
        anonymized data: the relative count distortion and the amount of suppression. Data quality may be improved by
        selecting fewer columns, or by generalizing more.{' '}
        <DocsLink page="operation" section="how-to-interpret-the-anonymization-summary">
          Click here for details.
        </DocsLink>
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
        is satisfactory.{' '}
        <DocsLink page="operation" section="anonymized-data">
          Click here for details.
        </DocsLink>
      </Paragraph>
      <Paragraph>
        The{' '}
        <DocsLink page="operation" section="suppress-bin">
          suppress bin
        </DocsLink>{' '}
        denoted by <Text code>*</Text> column values is shown in the first row. It indicates the combined anonymized
        count of all suppressed bins.
      </Paragraph>
    </div>
  );
}

function CsvExportHelp() {
  return (
    <div>
      <Title level={4}>CSV Export</Title>
      <Paragraph>
        Exports the anonymized results only (not the combined view). The suppress bin, when present, is exported as the
        first row in the CSV file.
      </Paragraph>
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
    case NotebookNavStep.AnonParamsSelection:
      return <AnonParamsSelectionHelp />;
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
