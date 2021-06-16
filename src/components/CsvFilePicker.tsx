import React, { FunctionComponent, useCallback, useState } from 'react';
import { Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

import { File } from '../types';

const { Dragger } = Upload;

export type CsvFilePickerProps = {
  children: (file: File, removeFile: () => void) => React.ReactNode;
};

export const CsvFilePicker: FunctionComponent<CsvFilePickerProps> = ({ children }) => {
  const [file, setFile] = useState<File | null>(null);
  const removeFile = useCallback(() => setFile(null), []);

  if (file === null) {
    return (
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
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
        <p className="ant-upload-hint">Upload hint about CSV files here.</p>
      </Dragger>
    );
  } else {
    return <>{children(file, removeFile)}</>;
  }
};
