import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import './Layout.css';

export type LayoutProps = {
  className?: string;
};

export const Layout: FunctionComponent<LayoutProps> & {
  Sidebar: FunctionComponent<LayoutProps & { collapsed?: boolean }>;
  Content: FunctionComponent<LayoutProps & React.RefAttributes<HTMLDivElement>>;
} = ({ children, className }) => {
  return <div className={classNames('Layout', className)}>{children}</div>;
};

Layout.Sidebar = ({ children, className, collapsed = false }) => {
  return collapsed ? (
    <div className={classNames('Layout-sidebar-collapsed', className)}>{children}</div>
  ) : (
    <div className={classNames('Layout-sidebar', className)}>{children}</div>
  );
};

Layout.Content = React.forwardRef<HTMLDivElement, LayoutProps>(({ children, className }, ref) => {
  return (
    <div ref={ref} className={classNames('Layout-content', className)}>
      {children}
    </div>
  );
});
