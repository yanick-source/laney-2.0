export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      upload_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          photo_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: string;
          photo_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          photo_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "upload_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      photos: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          storage_path: string;
          url: string;
          size: number;
          width: number | null;
          height: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          storage_path: string;
          url: string;
          size: number;
          width?: number | null;
          height?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          name?: string;
          storage_path?: string;
          url?: string;
          size?: number;
          width?: number | null;
          height?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "upload_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      processing_jobs: {
        Row: {
          id: string;
          session_id: string;
          status: string;
          current_step: string | null;
          progress: number;
          result: Json | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          status?: string;
          current_step?: string | null;
          progress?: number;
          result?: Json | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          status?: string;
          current_step?: string | null;
          progress?: number;
          result?: Json | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processing_jobs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "upload_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      photobooks: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          title: string;
          status: string;
          book_format: Json;
          pages: Json | null;
          analysis: Json | null;
          metadata: Json | null;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          title: string;
          status?: string;
          book_format?: Json;
          pages?: Json | null;
          analysis?: Json | null;
          metadata?: Json | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          title?: string;
          status?: string;
          book_format?: Json;
          pages?: Json | null;
          analysis?: Json | null;
          metadata?: Json | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photobooks_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "upload_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photobooks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
