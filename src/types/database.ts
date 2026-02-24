// Supabase Database types
// Auto-generated format compatible with @supabase/supabase-js v2.91+

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          author: string;
          excerpt: string;
          mood: string | null;
          music: string | null;
          embedded_links: Json | null;
          has_media: boolean;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          author?: string;
          excerpt?: string;
          mood?: string | null;
          music?: string | null;
          embedded_links?: Json | null;
          has_media?: boolean;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          author?: string;
          excerpt?: string;
          mood?: string | null;
          music?: string | null;
          embedded_links?: Json | null;
          has_media?: boolean;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          birth_year: number | null;
          age_verified: boolean;
          tos_accepted: boolean;
          theme: string | null;
          current_mood: string | null;
          current_music: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          birth_year?: number | null;
          age_verified?: boolean;
          tos_accepted?: boolean;
          theme?: string | null;
          current_mood?: string | null;
          current_music?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          birth_year?: number | null;
          age_verified?: boolean;
          tos_accepted?: boolean;
          theme?: string | null;
          current_mood?: string | null;
          current_music?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      post_reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          reaction_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          reaction_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          reaction_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_reactions_post_id_fkey';
            columns: ['post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_reactions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey';
            columns: ['post_id'];
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    // H3 FIX: posts_with_details view removed — no migration ever created it.
    // It was a ghost type from a prior architecture superseded by the
    // get_posts_with_reactions RPC function.
    Views: Record<string, never>;
    Functions: {
      // C2 FIX: SECURITY DEFINER function to set COPPA fields.
      // Bypasses the protect_coppa_fields trigger via session variable.
      set_age_verification: {
        Args: {
          p_birth_year: number;
          p_tos_accepted: boolean;
        };
        Returns: undefined;
      };
      get_posts_with_reactions: {
        Args: {
          p_cursor: string | null;
          p_limit: number;
          p_user_id: string | null;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          title: string;
          content: string;
          author: string;
          excerpt: string;
          mood: string | null;
          music: string | null;
          embedded_links: Json | null;
          has_media: boolean;
          is_private: boolean;
          created_at: string;
          updated_at: string;
          profile_display_name: string | null;
          profile_avatar_url: string | null;
          like_count: number;
          user_has_liked: boolean;
          reactions: Record<string, number>;
          user_reactions: string[];
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
