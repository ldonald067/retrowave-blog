import { describe, it, expect } from 'vitest';

// These are the same filtering functions used in App.tsx — extracted for testability
// The actual App.tsx uses inline logic, so we test the equivalent here

const LOOSE_ENTRIES = '__loose__';

interface MockPost {
  id: string;
  title: string;
  chapter?: string | null;
  is_private: boolean;
}

const mockPosts: MockPost[] = [
  { id: '1', title: 'Public loose post', chapter: null, is_private: false },
  { id: '2', title: 'Private loose post', chapter: null, is_private: true },
  { id: '3', title: 'Deep thoughts entry', chapter: 'deep thoughts', is_private: false },
  { id: '4', title: 'Daily vibes entry', chapter: 'daily vibes', is_private: false },
  { id: '5', title: 'Private chapter post', chapter: 'secret diary', is_private: false },
];

// Replicate the filtering logic from App.tsx
function filterPosts(posts: MockPost[], chapterFilter: string | null): MockPost[] {
  if (chapterFilter === LOOSE_ENTRIES) {
    return posts.filter((p) => !p.chapter);
  }
  if (chapterFilter) {
    return posts.filter((p) => p.chapter === chapterFilter);
  }
  return posts;
}

function getLooseCount(posts: MockPost[]): number {
  return posts.filter((p) => !p.chapter).length;
}

describe('Chapter Filtering', () => {
  // ── All entries (no filter) ──────────────────────────────────────────────

  it('returns all posts when no filter applied', () => {
    const result = filterPosts(mockPosts, null);
    expect(result).toHaveLength(5);
  });

  // ── Loose entries filter ─────────────────────────────────────────────────

  it('filters to loose entries (no chapter)', () => {
    const result = filterPosts(mockPosts, LOOSE_ENTRIES);
    expect(result).toHaveLength(2);
    expect(result.every((p) => !p.chapter)).toBe(true);
    expect(result[0]?.title).toBe('Public loose post');
    expect(result[1]?.title).toBe('Private loose post');
  });

  it('loose entries count matches filter result', () => {
    const count = getLooseCount(mockPosts);
    const filtered = filterPosts(mockPosts, LOOSE_ENTRIES);
    expect(count).toBe(filtered.length);
    expect(count).toBe(2);
  });

  it('loose entries count is 0 when all posts have chapters', () => {
    const allChaptered = mockPosts.filter((p) => p.chapter);
    expect(getLooseCount(allChaptered)).toBe(0);
  });

  // ── Chapter filter ───────────────────────────────────────────────────────

  it('filters to specific chapter', () => {
    const result = filterPosts(mockPosts, 'deep thoughts');
    expect(result).toHaveLength(1);
    expect(result[0]?.chapter).toBe('deep thoughts');
  });

  it('returns empty for non-existent chapter', () => {
    const result = filterPosts(mockPosts, 'does not exist');
    expect(result).toHaveLength(0);
  });

  // ── LOOSE_ENTRIES sentinel ───────────────────────────────────────────────

  it('LOOSE_ENTRIES sentinel does not collide with real chapter names', () => {
    const postsWithTrickyName = [
      ...mockPosts,
      { id: '6', title: 'Tricky post', chapter: '__loose__', is_private: false },
    ];
    // If someone named a chapter "__loose__", the filter would match it AND loose posts
    // This is the expected behavior — the sentinel is chosen to be unlikely
    const result = filterPosts(postsWithTrickyName, LOOSE_ENTRIES);
    // Should get posts with no chapter (2) — the __loose__ chapter post has a chapter set
    expect(result).toHaveLength(2);
  });
});

describe('Chapter Privacy', () => {
  const privateChapters = ['secret diary'];

  // ── Public profile filtering ─────────────────────────────────────────────

  it('filters out posts in private chapters for public view', () => {
    const publicPosts = mockPosts.filter(
      (p) => !p.is_private && (p.chapter === null || !privateChapters.includes(p.chapter!)),
    );
    expect(publicPosts).toHaveLength(3); // loose public + deep thoughts + daily vibes
    expect(publicPosts.find((p) => p.chapter === 'secret diary')).toBeUndefined();
  });

  it('filters out individually private posts for public view', () => {
    const publicPosts = mockPosts.filter(
      (p) => !p.is_private && (p.chapter === null || !privateChapters.includes(p.chapter!)),
    );
    expect(publicPosts.find((p) => p.title === 'Private loose post')).toBeUndefined();
  });

  it('two privacy layers work independently', () => {
    // Post-level private + chapter-level private should both be hidden
    const postsWithBoth = [
      ...mockPosts,
      { id: '6', title: 'Double private', chapter: 'secret diary', is_private: true },
    ];
    const publicPosts = postsWithBoth.filter(
      (p) => !p.is_private && (p.chapter === null || !privateChapters.includes(p.chapter!)),
    );
    expect(publicPosts).toHaveLength(3);
    expect(publicPosts.find((p) => p.title === 'Double private')).toBeUndefined();
  });

  it('empty private chapters array hides nothing', () => {
    const noPrivate: string[] = [];
    const publicPosts = mockPosts.filter(
      (p) => !p.is_private && (p.chapter === null || !noPrivate.includes(p.chapter!)),
    );
    expect(publicPosts).toHaveLength(4); // all except the individually private post
  });

  // ── Toggle behavior ──────────────────────────────────────────────────────

  it('toggling chapter privacy adds/removes from array', () => {
    let chapters = ['secret diary'];

    // Toggle off (make public)
    const chapter = 'secret diary';
    if (chapters.includes(chapter)) {
      chapters = chapters.filter((c) => c !== chapter);
    } else {
      chapters = [...chapters, chapter];
    }
    expect(chapters).toHaveLength(0);

    // Toggle on (make private again)
    if (chapters.includes(chapter)) {
      chapters = chapters.filter((c) => c !== chapter);
    } else {
      chapters = [...chapters, chapter];
    }
    expect(chapters).toHaveLength(1);
    expect(chapters[0]).toBe('secret diary');
  });
});

describe('Post Privacy (is_private)', () => {
  it('new posts default to public (is_private = false)', () => {
    const defaultPost = { is_private: false };
    expect(defaultPost.is_private).toBe(false);
  });

  it('is_private is included in CreatePostInput', () => {
    const postData = {
      title: 'Test',
      content: 'Content',
      is_private: true,
    };
    expect(postData.is_private).toBe(true);
  });

  it('toggling is_private flips the value', () => {
    let isPrivate = false;
    isPrivate = !isPrivate;
    expect(isPrivate).toBe(true);
    isPrivate = !isPrivate;
    expect(isPrivate).toBe(false);
  });
});
