import React, { useState, useEffect } from 'react';
import { CsvDropzone } from './CsvDropzone';
import { AnonymizedResult } from "../compiled/AnonymizedResult"
import { ColumnSelector } from "../compiled/ColumnSelector"

export function App() {
  const [ frontendTable, setFrontendTable ] = useState({Columns: []});
  const [ anonymizedResult, setAnonymizedResult ] = useState(null);

  useEffect(() => {
    window.electron.registerDataProvider(setFrontendTable);
    window.electron.registerResultHandler(setAnonymizedResult);
  }, []);

  function columnsChanged(selectedColumns) {
    console.log("Requesting anonymization")
    window.electron.anonymizeForColumns(selectedColumns);
  }

  return <div>
      <h1 className="text-3xl">
        <span className="font-bold text-white transition-all duration-500">
          <span className="inline-block text-transparent bg-gradient-to-r bg-clip-text from-pink-500 to-purple-500">
            Easy Diffix
          </span>
        </span>
      </h1>
      <CsvDropzone />
      <ColumnSelector columns={frontendTable.Columns} columnsChanged={columnsChanged} />
      <AnonymizedResult results={anonymizedResult} />
    </div>;
}