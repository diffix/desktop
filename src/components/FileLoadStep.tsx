import React, { FunctionComponent, useCallback, useState } from 'react';
import { Upload } from 'antd';
import { FileOutlined } from '@ant-design/icons';

import { File } from '../types';

const { Dragger } = Upload;

export type FileLoadStepProps = {
  children: (data: FileLoadStepData) => React.ReactNode;
};

export type FileLoadStepData = {
  file: File;
  removeFile: () => void;
};

export const FileLoadStep: FunctionComponent<FileLoadStepProps> = ({ children }) => {
  const [file, setFile] = useState<File | null>(null);
  const removeFile = useCallback(() => setFile(null), []);

  return (
    <>
      <div className="FileLoadStep notebook-step">
        <Dragger
          accept=".csv"
          fileList={[]}
          beforeUpload={(file) => {
            // Uploader is mid state update. We push the op to next frame to avoid react warning.
            setTimeout(() => {
              setFile(file);
            }, 0);
            return false;
          }}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <FileOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">Upload hint about CSV files here.</p>
        </Dragger>
      </div>
      {/* Render next step */}
      {file && children({ file, removeFile })}
    </>
  );
};
