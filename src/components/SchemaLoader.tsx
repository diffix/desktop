import React, { FunctionComponent } from 'react';
import { Result, Spin } from 'antd';

import { useSchema } from '../state';
import { AnonymizationView } from './AnonymizationView';

import './SchemaLoader.css';

export const SchemaLoader: FunctionComponent = () => {
  const computedSchema = useSchema('my-file.csv');

  switch (computedSchema.state) {
    case 'completed':
      return (
        <div className="SchemaLoader SchemaLoader--completed">
          <AnonymizationView schema={computedSchema.value} />
        </div>
      );

    case 'failed':
      return (
        <div className="SchemaLoader SchemaLoader--failed">
          <Result
            status="error"
            title="Schema discovery failed"
            subTitle="Something went wrong while loading the schema."
          />
        </div>
      );

    case 'in_progress':
      return (
        <div className="SchemaLoader SchemaLoader--loading">
          <Spin tip="Loading schema..." size="large" />
        </div>
      );
  }
};
