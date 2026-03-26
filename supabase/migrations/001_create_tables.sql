-- Laney 2.0 Database Schema
-- Run this migration against your Supabase project

-- Upload sessions
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'uploading',
  photo_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Processing jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Photobooks (updated schema)
CREATE TABLE IF NOT EXISTS photobooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  book_format JSONB NOT NULL DEFAULT '{"size": "medium", "orientation": "horizontal"}'::jsonb,
  pages JSONB,
  analysis JSONB,
  metadata JSONB,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photos_session_id ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_session_id ON processing_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_photobooks_session_id ON photobooks(session_id);
CREATE INDEX IF NOT EXISTS idx_photobooks_user_id ON photobooks(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);

-- Row Level Security
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photobooks ENABLE ROW LEVEL SECURITY;

-- Policies: Allow anonymous access for now (MVP)
-- In production, restrict to authenticated users

CREATE POLICY "Allow all access to upload_sessions" ON upload_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to photos" ON photos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to processing_jobs" ON processing_jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to photobooks" ON photobooks
  FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public uploads
CREATE POLICY "Allow public uploads to photos bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Allow public reads from photos bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photobooks_updated_at
  BEFORE UPDATE ON photobooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
