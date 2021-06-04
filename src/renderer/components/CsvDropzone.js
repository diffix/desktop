import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

function DropTargetDescription(isDragActive, error) {
  if (isDragActive) {
    return <p>Drop the CSV file here ...</p>
  } else {
    if (error) {
      return <p>{error}</p>
    } else {
      return <p>Drag and drop a CSV file to anonymize here, or click to select a file</p>
    }
  }
}

export function CsvDropzone({loadCsv}) {
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    acceptedFiles.forEach((file) => loadCsv(file.path));

    if (rejectedFiles.length === 0) {
      setError(null);
    } else {
      if (rejectedFiles.length > 1) {
        setError("Only a single CSV file at a time is supported");
      } else {
        setError("Only CSV files are supported");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "application/csv, text/csv",
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className={`${isDragActive ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100" } ${error ? "bg-red-100 border-red-300" : ""} rounded-lg p-2 mt-4 border-dashed border-4 h-full flex text-xl text-gray-600 items-center justify-center`} {...getRootProps()}>
      <input {...getInputProps()} />
      {DropTargetDescription(isDragActive, error)}
    </div>
  );
}
