import { lazy, Suspense, useEffect } from 'react';

/**
 * Post body rendering, split off the startup path.
 *
 * `react-markdown` + `rehype-sanitize` is ~120 KB — 15% of everything the app
 * evaluated before it could paint, for a renderer that cannot be needed until
 * posts have come back from the network. On Capacitor the bytes ship inside the
 * `.app`, so the cost is not download but parse and evaluate on the device CPU
 * during the splash screen.
 *
 * It is prefetched on idle immediately after mount, so in practice the chunk is
 * resident long before the feed request resolves and the fallback below is not
 * seen. The fallback exists for the case where it is: a slow device, or a
 * cached feed that renders instantly.
 */
const Markdown = lazy(async () => {
  const [{ default: ReactMarkdown }, { default: rehypeSanitize }] = await Promise.all([
    import('react-markdown'),
    import('rehype-sanitize'),
  ]);

  return {
    default: ({ children }: { children: string }) => (
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{children}</ReactMarkdown>
    ),
  };
});

/** Warm the chunk without blocking paint. Repeated calls are free — the import is cached. */
function prefetchMarkdown(): void {
  const load = () => {
    void import('react-markdown');
    void import('rehype-sanitize');
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 2000 });
  } else {
    setTimeout(load, 0);
  }
}

interface MarkdownContentProps {
  children: string;
  /** Wrapper classes, so callers keep their own prose sizing. */
  className?: string;
  style?: React.CSSProperties;
}

export default function MarkdownContent({ children, className, style }: MarkdownContentProps) {
  useEffect(prefetchMarkdown, []);

  return (
    <div className={className} style={style}>
      <Suspense
        fallback={
          // Same text, unformatted, rather than a spinner or blank space: the
          // layout stays put and the words are readable if this is ever seen.
          <div style={{ whiteSpace: 'pre-wrap' }}>{children}</div>
        }
      >
        <Markdown>{children}</Markdown>
      </Suspense>
    </div>
  );
}
