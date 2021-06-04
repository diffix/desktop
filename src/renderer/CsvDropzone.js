import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export function CsvDropzone({loadCsv}) {
  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach((file) => loadCsv(file.path));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "application/csv, text/csv",
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className={`${isDragActive ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100" } rounded-lg p-2 mt-4 border-dashed border-4 h-full flex text-xl text-gray-600 items-center justify-center`} {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive
        ? <p>Drop the CSV file here ...</p>
        : <p>Drag and drop a CSV file to anonymize here, or click to select a file</p>}
    </div>
  );
}
