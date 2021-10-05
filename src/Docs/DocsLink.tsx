import React, { FunctionComponent, useContext } from 'react';
import { Typography } from 'antd';
import { noop } from 'lodash';

import { PageId } from './Docs';

const { Link } = Typography;

export type DocsFunctions = {
  openDocs(page: PageId, section: string | null): void;
};

export const DocsFunctionsContext = React.createContext<DocsFunctions>({
  openDocs: noop,
});

export type DocsLinkProps = {
  page: PageId;
  section?: string | null;
};

export const DocsLink: FunctionComponent<DocsLinkProps> = ({ page, section, children }) => {
  const docsFunctions = useContext(DocsFunctionsContext);
  return (
    <Link
      className="DocsLink"
      href="#"
      onClick={(e) => {
        e.preventDefault();
        docsFunctions.openDocs(page, section ?? null);
      }}
    >
      {children}
    </Link>
  );
};
