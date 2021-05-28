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

  return <div>
      <h1 className="text-center text-6xl w-100 px-4 md:text-9xl">
        <span className="font-bold text-white transition-all duration-500">
          <span className="text-transparent inline-block bg-gradient-to-r bg-clip-text from-pink-500 to-purple-500 md:from-shamrock-500 md:to-royalblue-500">
            Open Diffix Anonymizer
          </span>
        </span>
      </h1>
      <CsvDropzone />
      <ColumnSelector columns={columns} columnsChanged={columnsChanged} />
      <AnonymizedResult results={anonymizedResult} />
    </div>;
}