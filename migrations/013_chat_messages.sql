-- ============================================
-- FUEGA.AI — 013_chat_messages.sql
-- Real-time chat messages for campfires (Discord-like)
-- ============================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id),
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_removed BOOLEAN DEFAULT FALSE,
    removal_reason TEXT,

    CONSTRAINT chat_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX idx_chat_campfire_time ON chat_messages(campfire_id, created_at DESC);
CREATE INDEX idx_chat_author ON chat_messages(author_id);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_select_all ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY chat_insert_auth ON chat_messages
    FOR INSERT WITH CHECK (
        author_id = current_setting('app.current_user_id', true)::uuid
    );
