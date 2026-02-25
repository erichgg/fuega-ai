-- ============================================
-- FUEGA.AI — 015_chat_rooms.sql
-- Multi-room chat per campfire.
-- ============================================

-- Chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campfire_id UUID NOT NULL REFERENCES campfires(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (campfire_id, name)
);

-- Add room_id to chat_messages (nullable initially for backfill)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES chat_rooms(id);

-- Index for efficient room queries
CREATE INDEX IF NOT EXISTS idx_chat_rooms_campfire ON chat_rooms(campfire_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC) WHERE deleted_at IS NULL;

-- Backfill: create a #general room for each campfire that has chat messages
INSERT INTO chat_rooms (campfire_id, name, description, is_default, position, created_by)
SELECT DISTINCT
    m.campfire_id,
    'general',
    'General chat',
    TRUE,
    0,
    '00000000-0000-0000-0000-000000000001'
FROM chat_messages m
JOIN campfires c ON c.id = m.campfire_id
WHERE c.deleted_at IS NULL
ON CONFLICT (campfire_id, name) DO NOTHING;

-- Assign existing messages to their campfire's #general room
UPDATE chat_messages m
SET room_id = r.id
FROM chat_rooms r
WHERE r.campfire_id = m.campfire_id
  AND r.name = 'general'
  AND m.room_id IS NULL;
