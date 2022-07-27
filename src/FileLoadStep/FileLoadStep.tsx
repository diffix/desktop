import { FileOutlined } from '@ant-design/icons';
import { Divider, Typography, Upload } from 'antd';
import React, { FunctionComponent, useCallback, useState } from 'react';
import { NotebookNavAnchor, NotebookNavStep } from '../Notebook';
import { File } from '../types';

const { Dragger } = Upload;
const { Title } = Typography;

export type FileLoadStepProps = {
  onLoad: (file: File) => void;
  children: (data: FileLoadStepData) => React.ReactNode;
};

export type FileLoadStepData = {
  file: File;
  removeFile: () => void;
};

export const FileLoadStep: FunctionComponent<FileLoadStepProps> = ({ children, onLoad }) => {
  const [file, setFile] = useState<File | null>(null);
  const removeFile = useCallback(() => setFile(null), []);

  return (
    <>
      <div className="FileLoadStep notebook-step">
        <NotebookNavAnchor step={NotebookNavStep.CsvImport} status={file ? 'done' : 'active'} />
        <Title level={3}>Import data to anonymize</Title>
        <Dragger
          accept=".csv,.tsv,.txt"
          fileList={[]}
          beforeUpload={(file) => {
            // Uploader is mid state update. We push the op to next frame to avoid react warning.
            setTimeout(() => {
              setFile(file);
              onLoad(file);
            }, 0);
            return false;
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <FileOutlined />
          </p>
          <p className="ant-upload-text">Import data from CSV file</p>
          <p className="ant-upload-hint">Click or drag file to this area to import</p>
        </Dragger>
      </div>
      {/* Render next step */}
      {file && (
        <>
          <Divider />
          {children({ file, removeFile })}
        </>
      )}
    </>
  );
};
