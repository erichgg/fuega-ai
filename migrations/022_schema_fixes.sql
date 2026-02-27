-- ============================================
-- FUEGA.AI — 022_schema_fixes.sql
-- Fix schema mismatches found during audit:
--   1. Add 'video' to posts.post_type constraint
--   2. Add 'video' to governance allowed_post_types
--   3. Add email column to users
--   4. (referral columns already exist from 008)
-- ============================================

-- ============================================
-- 1. Add 'video' to posts.post_type constraint
-- ============================================
ALTER TABLE posts DROP CONSTRAINT IF EXISTS post_type_valid;
ALTER TABLE posts ADD CONSTRAINT post_type_valid
  CHECK (post_type IN ('text', 'link', 'image', 'video'));

-- ============================================
-- 2. Add 'video' to governance allowed_post_types
-- ============================================
UPDATE governance_variables
  SET allowed_values = ARRAY['text', 'link', 'image', 'video'],
      default_value = 'text,link,image,video'
  WHERE key = 'allowed_post_types';

-- ============================================
-- 3. Add email column to users (optional, for notifications)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
