declare module '*.mdx' {
  const MDXComponent: (props: Record<string, unknown>) => JSX.Element;
  export default MDXComponent;
}

declare module '*.md' {
  const MDComponent: () => JSX.Element;
  export default MDComponent;
}
