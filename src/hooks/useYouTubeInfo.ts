import { useState, useEffect, useMemo } from 'react';
import { parseYouTubeUrl, fetchYouTubeTitle, type YouTubeInfo } from '../utils/parseYouTube';

export type YouTubeInfoWithTitle = YouTubeInfo & { title?: string };

/**
 * Hook that parses a YouTube URL and fetches its title.
 * Deduplicates logic previously copy-pasted in PostCard and Sidebar.
 */
export function useYouTubeInfo(url: string | null | undefined): YouTubeInfoWithTitle | null {
  // Parsing is pure — derive it instead of mirroring it into state.
  const info = useMemo(() => (url ? parseYouTubeUrl(url) : null), [url]);
  const videoId = info?.videoId;
  // Only the async-fetched titles live in state, keyed by video id.
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;
    fetchYouTubeTitle(videoId)
      .then((title) => {
        if (!cancelled && title) {
          setTitles((prev) => (prev[videoId] === title ? prev : { ...prev, [videoId]: title }));
        }
      })
      .catch(() => {
        // Silent fail — video preview still works without title
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return useMemo(() => {
    if (!info) return null;
    const title = titles[info.videoId];
    return title ? { ...info, title } : info;
  }, [info, titles]);
}
