import { Typography } from 'antd';
import classNames from 'classnames';
import { noop } from 'lodash';
import React, { FunctionComponent, useContext } from 'react';
import { PageId } from './Docs';

const { Link } = Typography;

export type DocsFunctions = {
  openDocs(page: PageId, section: string | null): void;
};

export const DocsFunctionsContext = React.createContext<DocsFunctions>({
  openDocs: noop,
});

function placeholderHref(page: string, section: string | null | undefined) {
  if (section) return `/${page}.md#${section}`;
  else return `/${page}.md`;
}

export type DocsLinkProps = {
  className?: string;
  page: PageId;
  section?: string | null;
};

export const DocsLink: FunctionComponent<DocsLinkProps> = ({ className, page, section, children }) => {
  const docsFunctions = useContext(DocsFunctionsContext);
  return (
    <Link
      className={classNames('DocsLink', className)}
      href={placeholderHref(page, section)}
      onClick={(e) => {
        e.preventDefault();
        docsFunctions.openDocs(page, section ?? null);
      }}
    >
      {children}
    </Link>
  );
};
