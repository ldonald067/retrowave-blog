import { Pepicon } from './ui';

interface PublicPageSettingsProps {
  enabled: boolean;
  savedEnabled: boolean;
  publicUrl: string | null;
  copied: boolean;
  shareSupported?: boolean;
  onRequestPublish: () => void;
  onUnpublish: () => void;
  onCopy: () => void;
}

export default function PublicPageSettings({
  enabled,
  savedEnabled,
  publicUrl,
  copied,
  shareSupported = false,
  onRequestPublish,
  onUnpublish,
  onCopy,
}: PublicPageSettingsProps) {
  const pendingChange = enabled !== savedEnabled;
  const statusText = enabled ? 'public page on' : 'private by default';
  const pendingText = enabled
    ? 'Save changes to publish this page.'
    : 'Save changes to take this page offline.';

  return (
    <div className="xanga-box p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="xanga-title text-base sm:text-lg flex items-center gap-2">
            <Pepicon name="stars" size={14} color="var(--accent-primary)" />
            public page
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Keep your journal private, with an optional page for entries you choose to share.
          </p>
        </div>
        <span
          className="inline-flex w-fit rounded border px-2 py-1 text-xs font-bold"
          style={{
            borderColor: enabled ? 'var(--accent-primary)' : 'var(--border-primary)',
            color: enabled ? 'var(--accent-primary)' : 'var(--text-muted)',
            backgroundColor: enabled
              ? 'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))'
              : 'var(--card-bg)',
          }}
        >
          {statusText}
        </span>
      </div>

      <div
        className="mt-3 rounded border p-3 text-xs leading-relaxed"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 45%, var(--card-bg))',
          color: 'var(--text-body)',
        }}
      >
        <p>Private entries and private chapters stay hidden.</p>
        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
          Anyone with the link can view public entries once this page is published.
        </p>
      </div>

      {enabled && savedEnabled && publicUrl && (
        <div className="mt-3">
          <p
            className="rounded border px-2 py-2 font-mono text-xs break-all"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
              color: 'var(--text-body)',
            }}
          >
            {publicUrl}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCopy}
              className="xanga-button text-xs min-h-[44px]"
              aria-live="polite"
            >
              {copied
                ? shareSupported
                  ? 'shared'
                  : 'copied'
                : shareSupported
                  ? 'share public page'
                  : 'copy public link'}
            </button>
            <a
              href={publicUrl}
              className="xanga-button text-xs min-h-[44px] inline-flex items-center justify-center"
              target="_blank"
              rel="noreferrer"
            >
              view public page
            </a>
          </div>
        </div>
      )}

      {pendingChange && (
        <p
          className="mt-3 rounded border px-3 py-2 text-xs font-bold"
          style={{
            borderColor: 'var(--accent-secondary)',
            color: 'var(--accent-secondary)',
            backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
          }}
        >
          {pendingText}
        </p>
      )}

      <div className="mt-3">
        {enabled ? (
          <button
            type="button"
            onClick={onUnpublish}
            className="w-full rounded border-2 border-dotted px-4 py-2 text-xs font-bold transition hover:opacity-80 min-h-[44px]"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-body)',
              fontFamily: 'var(--title-font)',
            }}
          >
            unpublish page
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestPublish}
            className="xanga-button w-full text-xs min-h-[44px]"
          >
            review and publish page
          </button>
        )}
      </div>
    </div>
  );
}
