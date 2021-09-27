import React, { FunctionComponent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import './Markdown.css';

export type MarkdownProps = {
  source: string;
};

export const Markdown: FunctionComponent<MarkdownProps> = ({ source }) => {
  return (
    <ReactMarkdown className="Markdown" remarkPlugins={[remarkGfm]}>
      {source}
    </ReactMarkdown>
  );
};
