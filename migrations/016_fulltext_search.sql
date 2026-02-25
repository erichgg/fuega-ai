-- Full-text search support
-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Posts: add tsvector column + GIN index + auto-update trigger
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION posts_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_search_trigger ON posts;
CREATE TRIGGER posts_search_trigger
  BEFORE INSERT OR UPDATE OF title, body ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_update();

-- Backfill existing posts
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body, '')), 'B')
WHERE search_vector IS NULL;

-- Comments: add tsvector column + GIN index + auto-update trigger
ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING GIN(search_vector);

CREATE OR REPLACE FUNCTION comments_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.body, ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_search_trigger ON comments;
CREATE TRIGGER comments_search_trigger
  BEFORE INSERT OR UPDATE OF body ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_search_update();

UPDATE comments SET search_vector =
  to_tsvector('english', COALESCE(body, ''))
WHERE search_vector IS NULL;

-- Campfires: trigram indexes for name and description
CREATE INDEX IF NOT EXISTS idx_campfires_name_trgm ON campfires USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_campfires_desc_trgm ON campfires USING GIN(description gin_trgm_ops);

-- Users: trigram index for username
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING GIN(username gin_trgm_ops);
