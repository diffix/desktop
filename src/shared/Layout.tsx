import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import './Layout.css';

export type LayoutProps = {
  className?: string;
};

export const Layout: FunctionComponent<LayoutProps> & {
  Sidebar: FunctionComponent<LayoutProps>;
  Content: FunctionComponent<LayoutProps>;
} = ({ children, className }) => {
  return <div className={classNames('Layout', className)}>{children}</div>;
};

Layout.Sidebar = ({ children, className }) => {
  return <div className={classNames('Layout-sidebar', className)}>{children}</div>;
};

Layout.Content = ({ children, className }) => {
  return <div className={classNames('Layout-content', className)}>{children}</div>;
};
