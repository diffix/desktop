import React from 'react';
import { Divider, Typography } from 'antd';
import { Components } from 'react-markdown';
import classNames from 'classnames';

const { Paragraph, Text, Title } = Typography;

// Removes annoying `onClick` type mismatch error and discards the `node` prop.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap<TArgs>(fn: (props: TArgs & { onClick: any }) => JSX.Element) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (({ node: _, ...props }: any) => fn(props)) as (args: TArgs) => JSX.Element;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export const components: Components = {
  // todo: a, img, li?
  blockquote: wrap((props) => <blockquote {...props} className={classNames(props.className, 'ant-typography')} />),
  code: wrap(({ inline, ...props }) => {
    if (inline) {
      return <Text {...props} code />;
    } else {
      return <Paragraph {...props} code />;
    }
  }),
  em: wrap((props) => <Text {...props} italic />),
  h1: wrap((props) => <Title {...props} level={1} />),
  h2: wrap((props) => <Title {...props} level={2} />),
  h3: wrap((props) => <Title {...props} level={3} />),
  h4: wrap((props) => <Title {...props} level={4} />),
  h5: wrap((props) => <Title {...props} level={5} />),
  h6: wrap((props) => <Title {...props} level={5} />),
  hr: wrap((props) => <Divider {...props} />),
  ol: wrap(({ depth, ordered, ...props }) => (
    <ol {...props} className={classNames(props.className, 'ant-typography')} />
  )),
  p: wrap((props) => <Paragraph {...props} />),
  pre: wrap((props) => <pre {...props} className={classNames(props.className, 'ant-typography')} />),
  strong: wrap((props) => <Text {...props} strong />),
  ul: wrap(({ depth, ordered, ...props }) => (
    <ul {...props} className={classNames(props.className, 'ant-typography')} />
  )),
  // GFM
  del: wrap((props) => <Text {...props} delete />),
  table: wrap((props) => <table {...props} className={classNames(props.className, 'ant-typography')} />),
};
