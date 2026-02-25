import { useState, useEffect } from 'react';
import { parseYouTubeUrl, fetchYouTubeTitle, type YouTubeInfo } from '../utils/parseYouTube';

export type YouTubeInfoWithTitle = YouTubeInfo & { title?: string };

/**
 * Hook that parses a YouTube URL and fetches its title.
 * Deduplicates logic previously copy-pasted in PostCard and Sidebar.
 */
export function useYouTubeInfo(url: string | null | undefined): YouTubeInfoWithTitle | null {
  const [ytInfo, setYtInfo] = useState<YouTubeInfoWithTitle | null>(null);

  useEffect(() => {
    if (!url) {
      setYtInfo(null);
      return;
    }

    const info = parseYouTubeUrl(url);
    if (!info) {
      setYtInfo(null);
      return;
    }

    // Set initial info without title
    setYtInfo(info);

    // Fetch title asynchronously
    let cancelled = false;
    fetchYouTubeTitle(info.videoId).then((title) => {
      if (!cancelled && title) {
        setYtInfo((prev) => (prev ? { ...prev, title } : null));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return ytInfo;
}
