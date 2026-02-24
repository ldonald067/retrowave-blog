/**
 * Skeleton loader for the post feed — renders 3 placeholder post cards
 * with pulsing bars that match the PostCard layout dimensions.
 */
export default function PostSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="xanga-box p-0 overflow-hidden"
          style={{ opacity: 1 - i * 0.15 }}
        >
          {/* Header skeleton */}
          <div
            className="p-4 border-b-2 border-dotted"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* Title bar */}
            <div
              className="h-6 rounded w-3/4 mb-2 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 50%, transparent)' }}
            />
            {/* Date bar */}
            <div
              className="h-3 rounded w-1/3 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 30%, transparent)' }}
            />
          </div>

          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            {/* Content lines */}
            <div
              className="h-3 rounded w-full animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 25%, transparent)' }}
            />
            <div
              className="h-3 rounded w-5/6 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 25%, transparent)' }}
            />
            <div
              className="h-3 rounded w-4/6 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 25%, transparent)' }}
            />
            <div
              className="h-3 rounded w-2/3 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 25%, transparent)' }}
            />
          </div>

          {/* Footer skeleton */}
          <div
            className="px-4 py-2 border-t flex items-center justify-between"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* Author bar */}
            <div
              className="h-3 rounded w-20 animate-pulse"
              style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 30%, transparent)' }}
            />
            {/* Reaction bar placeholder */}
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-7 w-10 rounded-full animate-pulse"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--border-primary) 20%, transparent)' }}
                />
              ))}
            </div>
          </div>

          {/* Decorative bottom border */}
          <div
            className="h-1"
            style={{
              background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary), var(--border-primary))',
              opacity: 0.3,
            }}
          />
        </div>
      ))}
    </div>
  );
}
