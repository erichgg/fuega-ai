-- ============================================
-- FUEGA.AI — 019_fix_chat_rls.sql
-- Fix chat_messages RLS policy
-- INSERT policy uses app.current_user_id but should use app.user_id like all other tables
-- ============================================

-- Drop the old INSERT policy
DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;

-- Recreate with correct session variable name
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true)::uuid);
