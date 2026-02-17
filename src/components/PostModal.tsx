import { useState, useEffect, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Sparkles, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Post, CreatePostInput } from '../types/post';
import { MOODS } from '../lib/constants';
import { quickContentCheck } from '../lib/moderation';

interface PostModalProps {
  post?: Post | null;
  onSave: (postData: CreatePostInput) => Promise<void>;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export default function PostModal({ post, onSave, onClose, mode = 'create' }: PostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [mood, setMood] = useState('');
  const [music, setMusic] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setAuthor(post.author || '');
      setMood(post.mood || '');
      setMusic(post.music || '');
    }
  }, [post]);

  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    },
    [onClose, saving]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModerationError(null);
    setSaving(true);

    // Run content moderation check
    const moderationResult = quickContentCheck(`${title} ${content}`);
    if (!moderationResult.allowed) {
      setModerationError(moderationResult.reason || 'Content violates community guidelines');
      setSaving(false);
      return;
    }

    const postData: CreatePostInput = {
      title,
      content,
      author: author || 'Anonymous',
      mood,
      music,
    };

    try {
      await onSave(postData);
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={
            isViewMode ? `Viewing: ${title}` : mode === 'edit' ? 'Edit entry' : 'New entry'
          }
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          style={{
            backgroundColor: 'var(--modal-bg)',
            border: '4px solid var(--modal-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 border-b-2 border-dotted"
            style={{
              background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="xanga-title text-2xl">
                {isViewMode ? (
                  <span className="flex items-center gap-2">
                    <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                    {post?.title}
                  </span>
                ) : mode === 'edit' ? (
                  '✏️ Edit Entry'
                ) : (
                  '✨ New Entry'
                )}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-full transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            className="overflow-y-auto max-h-[calc(90vh-140px)]"
            style={{ backgroundColor: 'var(--modal-bg)' }}
          >
            {isViewMode ? (
              <div className="p-6">
                {post?.mood && (
                  <div
                    className="mb-4 p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, var(--modal-bg))',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Mood: </span>
                    <span className="text-lg">{post.mood}</span>
                  </div>
                )}

                {post?.music && (
                  <div
                    className="mb-4 p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--modal-bg))',
                      borderColor: 'var(--accent-secondary)',
                    }}
                  >
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🎵 Currently listening to: </span>
                    <span className="text-sm italic" style={{ color: 'var(--accent-secondary)' }}>{post.music}</span>
                  </div>
                )}

                {post?.author && (
                  <p className="text-sm mb-4 font-semibold" style={{ color: 'var(--accent-primary)' }}>~ {post.author}</p>
                )}

                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-body)' }}>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post?.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Moderation Error Alert */}
                {moderationError && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-lg border-2"
                    style={{
                      backgroundColor: 'color-mix(in srgb, #ef4444 15%, var(--modal-bg))',
                      borderColor: '#ef4444',
                    }}
                  >
                    <AlertTriangle size={20} className="flex-shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-600 text-sm">Content Not Allowed</p>
                      <p className="text-xs text-red-500 mt-1">{moderationError}</p>
                      <p className="text-xs text-red-400 mt-2">
                        Please revise your post to comply with our community guidelines.
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="post-title"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: 'var(--text-body)' }}
                  >
                    Entry Title *
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '2px solid var(--input-border)',
                      color: 'var(--text-body)',
                    }}
                    placeholder="What's on your mind today?"
                    required
                    maxLength={200}
                    aria-required="true"
                  />
                  <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{title.length}/200</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="post-author"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--text-body)' }}
                    >
                      Your Name
                    </label>
                    <input
                      id="post-author"
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        border: '2px solid var(--input-border)',
                        color: 'var(--text-body)',
                      }}
                      placeholder="Anonymous"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="post-mood"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--text-body)' }}
                    >
                      Current Mood
                    </label>
                    <select
                      id="post-mood"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg transition cursor-pointer focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        border: '2px solid var(--input-border)',
                        color: 'var(--text-body)',
                      }}
                      aria-label="Select your current mood"
                    >
                      <option value="">Select a mood...</option>
                      {MOODS.map((m) => (
                        <option key={m.label} value={`${m.emoji} ${m.label}`}>
                          {m.emoji} {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="post-music"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: 'var(--text-body)' }}
                  >
                    🎵 Currently Listening To
                  </label>
                  <input
                    id="post-music"
                    type="text"
                    value={music}
                    onChange={(e) => setMusic(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '2px solid var(--input-border)',
                      color: 'var(--text-body)',
                    }}
                    placeholder="Song name, artist, or paste a YouTube link..."
                    maxLength={200}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Tip: Paste a YouTube link to share the song!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="post-content"
                      className="block text-sm font-semibold"
                      style={{ color: 'var(--text-body)' }}
                    >
                      Your Thoughts * (Markdown supported)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs px-3 py-1 rounded-full transition"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 20%, var(--modal-bg))',
                        color: 'var(--accent-secondary)',
                      }}
                    >
                      {showPreview ? '✏️ Edit' : '👁️ Preview'}
                    </button>
                  </div>

                  {showPreview ? (
                    <div
                      className="min-h-[250px] rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '2px solid var(--input-border)',
                      }}
                    >
                      <div
                        className="p-3 border-b-2 border-dotted"
                        style={{
                          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
                          borderColor: 'var(--border-primary)',
                        }}
                      >
                        <h3 className="xanga-title text-xl">{title || 'Your Title Here'}</h3>
                      </div>

                      <div className="p-4">
                        {mood && (
                          <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Mood: </span>
                            <span className="text-sm">{mood}</span>
                          </div>
                        )}

                        {music && (
                          <div
                            className="mb-3 pb-3 border-b p-2 rounded"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--accent-secondary) 10%, var(--card-bg))',
                              borderColor: 'var(--accent-secondary)',
                            }}
                          >
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              🎵 Currently listening to:{' '}
                            </span>
                            <span className="text-xs italic" style={{ color: 'var(--accent-secondary)' }}>{music}</span>
                          </div>
                        )}

                        <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-body)' }}>
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                            {content || '_Start typing to see your post preview..._'}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div
                        className="px-4 py-2 border-t text-xs"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, var(--card-bg))',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {author && <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>~ {author}</span>}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      id="post-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full h-[250px] px-4 py-3 rounded-lg transition resize-none focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        border: '2px solid var(--input-border)',
                        color: 'var(--text-body)',
                      }}
                      placeholder="Dear diary... today I..."
                      required
                    />
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Use **bold**, *italic*, or [links](url) for formatting
                  </p>
                </div>
              </form>
            )}
          </div>

          {!isViewMode && (
            <div
              className="p-4 border-t-2 border-dotted flex justify-end space-x-3"
              style={{
                background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
                borderColor: 'var(--border-primary)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-full transition font-semibold text-sm"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-body)',
                  border: '2px solid var(--border-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="xanga-button flex items-center gap-2"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Entry'}</span>
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
