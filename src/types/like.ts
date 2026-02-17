// Post like types

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostWithLikes {
  like_count: number;
  user_has_liked: boolean;
}
