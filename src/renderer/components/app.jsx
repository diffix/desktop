import React, { useState, useEffect } from 'react';
import { CsvDropzone } from './csvDropzone';
import { ColumnSelector, AnonymizedResult } from "./../compiled/Components"

export function App() {
  const [ columns, setColumns ] = useState([]);
  const [ anonymizedResult, setAnonymizedResult ] = useState(null);

  useEffect(() => {
    window.electron.registerDataProvider(setColumns);
    window.electron.registerResultHandler(setAnonymizedResult);
  }, []);

  function columnsChanged(selectedColumns) {
    console.log("Requesting anonymization")
    window.electron.anonymizeForColumns(selectedColumns);
  }

  return (
    <div>
      <h1>Incredibly sexy anonymizer</h1>
      <CsvDropzone />
      <ColumnSelector columns={columns} columnsChanged={columnsChanged} />
      <AnonymizedResult results={anonymizedResult} />
    </div>
  );
}