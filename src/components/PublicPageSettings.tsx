import { openUrl } from '../lib/capacitor';

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
            {/* 🌐 rather than a retro icon: `Windows95MyComputer` is already
                SettingsModal's `data` heading, and reusing one glyph for two
                different sections is the same empty encoding the `stars` icon
                had. No retro icon in the set means "a page other people can
                visit"; this one says it exactly. */}
            <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1 }}>
              🌐
            </span>
            public page
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Keep your journal private, with an optional page for entries you choose to share.
          </p>
        </div>
        {/* Text, not a pill. This was a bordered, rounded, filled, bold span
            sitting a thumb's width above a real button — the third time this
            app has dressed an inert status as a control (the entry detail's
            chapter, the stat pills on the public profile). Nothing happens when
            you tap it.

            It is a status, so it takes the status treatment: bold, and the
            accent only for the state worth noticing. That is the same split the
            entry detail's metadata band uses for public vs private — accent for
            `on`, --text-body for the quiet default — rather than a third
            convention invented here. */}
        <span
          className="w-fit text-xs font-bold"
          style={{ color: enabled ? 'var(--accent-primary)' : 'var(--text-body)' }}
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
            {/* openUrl, not target="_blank" — the latter is a no-op in the
                Capacitor WebView, so this button did nothing on iOS. */}
            <a
              href={publicUrl}
              onClick={(e) => {
                e.preventDefault();
                void openUrl(publicUrl);
              }}
              className="xanga-button text-xs min-h-[44px] inline-flex items-center justify-center"
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
