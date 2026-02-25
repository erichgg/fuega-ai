-- Migration 020: Reports system
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  campfire_id UUID REFERENCES campfires(id),
  post_id UUID REFERENCES posts(id),
  comment_id UUID REFERENCES comments(id),
  reason TEXT NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  -- Must report either a post or a comment
  CONSTRAINT report_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_campfire ON reports(campfire_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- Users can see their own reports
CREATE POLICY reports_select ON reports FOR SELECT
  USING (reporter_id = current_setting('app.user_id', true)::uuid);
-- Users can create reports
CREATE POLICY reports_insert ON reports FOR INSERT
  WITH CHECK (reporter_id = current_setting('app.user_id', true)::uuid);
