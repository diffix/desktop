import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export function CsvDropzone() {
  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach((file) => {
      window.electron.loadFile(file.path);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "application/csv, text/csv"
  });

  return (
    <div className={` ${isDragActive ? "bg-gray-500 border-gray-100" : "bg-gray-900 border-gray-800" } rounded-lg p-2 mt-4 border-dashed border-4 `} {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive
        ? <p>Drop the files here ...</p>
        : <p>Drag 'n' drop some files here, or click to select files</p>}
    </div>
  );
}
