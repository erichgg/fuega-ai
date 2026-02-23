-- ============================================
-- FUEGA.AI — 010_update_notification_type_constraint.sql
-- Redesign: update notifications.type constraint to use
-- campfire_update instead of community_update (terminology redesign).
-- ADDITIVE ONLY — no data loss, constraint update only.
-- ============================================

-- Drop old constraint and add updated one with correct terminology
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT type_valid CHECK (type IN (
    'reply_post', 'reply_comment', 'spark', 'mention',
    'campfire_update', 'governance', 'badge_earned',
    'tip_received', 'referral'
  ));

-- Migrate any existing rows that used old 'community_update' type
UPDATE notifications
  SET type = 'campfire_update'
  WHERE type = 'community_update';
