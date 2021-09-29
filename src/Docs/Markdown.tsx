import React, { FunctionComponent, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import { toc } from 'mdast-util-toc';
import { toString } from 'mdast-util-to-string';
import invariant from 'tiny-invariant';

import { components } from './markdown-components';

import './Markdown.css';

type MdAst = import('mdast').Root | import('mdast').Content;
type List = import('mdast').List;
type Paragraph = import('mdast').Paragraph;

export type TableOfContentsLink = {
  title: string;
  hash: string;
  children: TableOfContentsLink[];
};

export type TableOfContents = TableOfContentsLink[];

function mapLink(paragraph: Paragraph, children: TableOfContentsLink[] = []): TableOfContentsLink {
  invariant(paragraph.children.length === 1);
  const link = paragraph.children[0];
  invariant(link.type === 'link');
  return {
    title: toString(link),
    hash: link.url,
    children,
  };
}

function mapTableOfContents(list: List | null): TableOfContentsLink[] {
  if (list === null) return [];

  return list.children.flatMap((listItem) => {
    const { children } = listItem;

    if (children.length === 1) {
      const node = children[0];
      invariant(node.type === 'paragraph' || node.type === 'list');
      return node.type === 'paragraph' ? [mapLink(node)] : mapTableOfContents(node);
    }

    invariant(children.length === 2);
    invariant(children[0].type === 'paragraph');
    invariant(children[1].type === 'list');

    return [mapLink(children[0], mapTableOfContents(children[1]))];
  });
}

export type MarkdownProps = {
  source: string;
  onTableOfContents?: (toc: TableOfContents) => void;
};

export const Markdown: FunctionComponent<MarkdownProps> = ({ source, onTableOfContents }) => {
  const tocRef = useRef<TableOfContents>([]);

  useEffect(() => {
    onTableOfContents && onTableOfContents(tocRef.current);
  }, [source, onTableOfContents]);

  const tocPlugin = () => (ast: MdAst) => {
    const table = toc(ast).map;
    tocRef.current = mapTableOfContents(table);
  };

  return (
    <ReactMarkdown
      className="Markdown"
      skipHtml={true}
      components={components}
      remarkPlugins={[remarkGfm, remarkSlug, tocPlugin]}
    >
      {source}
    </ReactMarkdown>
  );
};
