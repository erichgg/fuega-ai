-- ============================================
-- FUEGA.AI — 009_cosmetics_and_user_cosmetics.sql
-- V2: Cosmetics catalog + user cosmetic purchases
-- ADDITIVE ONLY — no drops, no deletes
-- ============================================

-- ============================================
-- 1. COSMETICS TABLE (system-managed catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cosmetic_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    preview_url VARCHAR(500),

    category VARCHAR(20) NOT NULL,
    subcategory VARCHAR(20) NOT NULL,

    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),

    metadata JSONB DEFAULT '{}',

    available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT category_valid CHECK (category IN (
        'theme', 'border', 'title', 'color', 'avatar', 'banner', 'icon'
    )),
    CONSTRAINT subcategory_valid CHECK (subcategory IN ('profile', 'community'))
);

CREATE INDEX IF NOT EXISTS idx_cosmetics_category ON cosmetics(category, subcategory, sort_order);
CREATE INDEX IF NOT EXISTS idx_cosmetics_available ON cosmetics(available, category) WHERE available = TRUE;
CREATE INDEX IF NOT EXISTS idx_cosmetics_price ON cosmetics(price_cents);

-- ============================================
-- 2. USER COSMETICS TABLE (purchase history)
-- ============================================
CREATE TABLE IF NOT EXISTS user_cosmetics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    cosmetic_id VARCHAR(50) NOT NULL REFERENCES cosmetics(cosmetic_id),

    price_paid_cents INTEGER NOT NULL,
    stripe_payment_id VARCHAR(100),

    refunded BOOLEAN DEFAULT FALSE,
    refunded_at TIMESTAMPTZ,

    purchased_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON user_cosmetics(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_stripe ON user_cosmetics(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
-- Note: refund eligibility (7-day window) checked at query time, not via partial index
-- Partial index on non-refunded items for efficient lookup
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_refundable ON user_cosmetics(user_id, purchased_at)
    WHERE refunded = FALSE;

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY cosmetics_select_all ON cosmetics
    FOR SELECT
    USING (available = TRUE);

ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_cosmetics_select_own ON user_cosmetics
    FOR SELECT
    USING (user_id = current_setting('app.user_id')::uuid);

-- ============================================
-- 4. SEED ALL 40 COSMETIC DEFINITIONS
-- ============================================
INSERT INTO cosmetics (cosmetic_id, name, description, category, subcategory, price_cents, metadata, sort_order) VALUES

-- PROFILE THEMES (6)
('theme_lava_flow', 'Lava Flow', 'Deep red and orange gradient background with flowing lava animation on your profile page.', 'theme', 'profile', 499, '{"css_vars": {"--profile-bg-primary": "#1a0000", "--profile-bg-secondary": "#330000", "--profile-accent": "#FF4500", "--profile-text": "#FFD700"}, "animation": "lava_flow"}', 1),
('theme_midnight_ember', 'Midnight Ember', 'Deep black background with subtle orange ember particles floating across your profile.', 'theme', 'profile', 499, '{"css_vars": {"--profile-bg-primary": "#0a0a0a", "--profile-bg-secondary": "#1a1008", "--profile-accent": "#FF6B35", "--profile-text": "#E0E0E0"}, "animation": "ember_float"}', 2),
('theme_arctic_frost', 'Arctic Frost', 'Cool blue and white gradient with crystalline frost effects. The anti-fire theme.', 'theme', 'profile', 499, '{"css_vars": {"--profile-bg-primary": "#0a1628", "--profile-bg-secondary": "#1a2a4a", "--profile-accent": "#60A5FA", "--profile-text": "#E0F0FF"}, "animation": "frost_crystals"}', 3),
('theme_neon_grid', 'Neon Grid', 'Retro-futuristic neon grid background with purple and cyan accents.', 'theme', 'profile', 599, '{"css_vars": {"--profile-bg-primary": "#0a0020", "--profile-bg-secondary": "#150040", "--profile-accent": "#00FFFF", "--profile-text": "#E0E0FF"}, "animation": "neon_pulse"}', 4),
('theme_forest_canopy', 'Forest Canopy', 'Deep green and brown tones with leaf particle effects.', 'theme', 'profile', 499, '{"css_vars": {"--profile-bg-primary": "#0a1a0a", "--profile-bg-secondary": "#1a2a1a", "--profile-accent": "#4ADE80", "--profile-text": "#D0F0D0"}, "animation": "falling_leaves"}', 5),
('theme_void', 'The Void', 'Pure black with subtle dark purple undertones. Minimal. Mysterious.', 'theme', 'profile', 399, '{"css_vars": {"--profile-bg-primary": "#000000", "--profile-bg-secondary": "#0a0010", "--profile-accent": "#8B5CF6", "--profile-text": "#C0C0C0"}, "animation": "none"}', 6),

-- COMMUNITY THEMES (3)
('theme_community_inferno', 'Community Inferno', 'Intense red and orange theme for your community page. Flames on every surface.', 'theme', 'community', 999, '{"css_vars": {"--community-bg-primary": "#1a0500", "--community-bg-secondary": "#2a0a00", "--community-accent": "#FF4500", "--community-text": "#FFE0C0"}, "animation": "fire_border"}', 7),
('theme_community_ocean', 'Community Ocean', 'Deep blue aquatic theme with wave animations for your community page.', 'theme', 'community', 999, '{"css_vars": {"--community-bg-primary": "#001020", "--community-bg-secondary": "#002040", "--community-accent": "#0EA5E9", "--community-text": "#C0E0FF"}, "animation": "wave_motion"}', 8),
('theme_community_terminal', 'Community Terminal', 'Classic green-on-black terminal aesthetic for your community page.', 'theme', 'community', 799, '{"css_vars": {"--community-bg-primary": "#000000", "--community-bg-secondary": "#001100", "--community-accent": "#00FF00", "--community-text": "#00CC00"}, "animation": "scanlines"}', 9),

-- AVATAR BORDERS (6)
('border_flame_ring', 'Flame Ring', 'Animated ring of fire around your avatar.', 'border', 'profile', 299, '{"border_style": "animated", "animation": "flame_rotation", "colors": ["#FF4500", "#FF6B35", "#FFD700"]}', 1),
('border_ice_crystal', 'Ice Crystal', 'Crystalline ice border with subtle shimmer effect.', 'border', 'profile', 299, '{"border_style": "animated", "animation": "ice_shimmer", "colors": ["#60A5FA", "#93C5FD", "#DBEAFE"]}', 2),
('border_gold_ornate', 'Gold Ornate', 'Elegant gold filigree border with intricate patterns.', 'border', 'profile', 399, '{"border_style": "static", "animation": "none", "colors": ["#FFD700", "#DAA520", "#B8860B"]}', 3),
('border_pixel_art', 'Pixel Art', 'Retro 8-bit pixel art border with chunky colored squares.', 'border', 'profile', 199, '{"border_style": "static", "animation": "none", "colors": ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"]}', 4),
('border_lightning', 'Lightning', 'Electric lightning bolts crackling around your avatar.', 'border', 'profile', 399, '{"border_style": "animated", "animation": "lightning_crackle", "colors": ["#FFFFFF", "#60A5FA", "#A855F7"]}', 5),
('border_shadow', 'Shadow Aura', 'Dark smoke-like tendrils emanating from your avatar border.', 'border', 'profile', 299, '{"border_style": "animated", "animation": "shadow_wisps", "colors": ["#1a1a2e", "#16213e", "#0f3460"]}', 6),

-- CUSTOM TITLES (6)
('title_fire_starter', 'Fire Starter', 'Displays ''Fire Starter'' below your username.', 'title', 'profile', 199, '{"title_text": "Fire Starter", "title_color": "#FF4500"}', 1),
('title_flame_keeper', 'Flame Keeper', 'Displays ''Flame Keeper'' below your username.', 'title', 'profile', 199, '{"title_text": "Flame Keeper", "title_color": "#FFD700"}', 2),
('title_ember_walker', 'Ember Walker', 'Displays ''Ember Walker'' below your username.', 'title', 'profile', 199, '{"title_text": "Ember Walker", "title_color": "#DC2626"}', 3),
('title_ash_born', 'Ash Born', 'Displays ''Ash Born'' below your username.', 'title', 'profile', 199, '{"title_text": "Ash Born", "title_color": "#A0A0A0"}', 4),
('title_phoenix', 'Phoenix', 'Displays ''Phoenix'' below your username with gradient coloring.', 'title', 'profile', 299, '{"title_text": "Phoenix", "title_color": "gradient(#DC2626, #FFD700)"}', 5),
('title_wildfire', 'Wildfire', 'Displays ''Wildfire'' below your username with animated flame effect.', 'title', 'profile', 399, '{"title_text": "Wildfire", "title_color": "#FF6B35", "animation": "flame_text"}', 6),

-- USERNAME COLORS (7)
('color_flame_orange', 'Flame Orange', 'Your username appears in bright flame orange in posts and comments.', 'color', 'profile', 149, '{"username_color": "#FF6B35"}', 1),
('color_royal_purple', 'Royal Purple', 'Your username appears in rich royal purple.', 'color', 'profile', 149, '{"username_color": "#A855F7"}', 2),
('color_ocean_blue', 'Ocean Blue', 'Your username appears in deep ocean blue.', 'color', 'profile', 149, '{"username_color": "#3B82F6"}', 3),
('color_emerald_green', 'Emerald Green', 'Your username appears in vivid emerald green.', 'color', 'profile', 149, '{"username_color": "#10B981"}', 4),
('color_crimson_red', 'Crimson Red', 'Your username appears in deep crimson red.', 'color', 'profile', 149, '{"username_color": "#DC2626"}', 5),
('color_gold', 'Gold', 'Your username appears in gleaming gold.', 'color', 'profile', 199, '{"username_color": "#FFD700"}', 6),
('color_rainbow', 'Rainbow', 'Your username cycles through rainbow colors with a smooth gradient animation.', 'color', 'profile', 399, '{"username_color": "rainbow_gradient", "animation": "color_cycle"}', 7),

-- AVATAR FRAMES (3)
('avatar_flame_aura', 'Flame Aura', 'A glow of flickering flames behind your avatar image.', 'avatar', 'profile', 349, '{"frame_type": "glow", "animation": "flicker", "colors": ["#FF4500", "#FF6B35"]}', 1),
('avatar_hexagon', 'Hexagon Frame', 'Your avatar is displayed in a hexagonal shape instead of a circle.', 'avatar', 'profile', 249, '{"frame_type": "shape", "shape": "hexagon", "animation": "none"}', 2),
('avatar_diamond', 'Diamond Frame', 'Your avatar is displayed in a diamond (rotated square) shape.', 'avatar', 'profile', 249, '{"frame_type": "shape", "shape": "diamond", "animation": "none"}', 3),

-- PROFILE BANNERS (4)
('banner_fire_landscape', 'Fire Landscape', 'A wide panoramic banner of a volcanic landscape with flowing lava.', 'banner', 'profile', 499, '{"banner_url": "/cosmetics/banners/fire_landscape.webp", "banner_height": 200}', 1),
('banner_starfield', 'Starfield', 'Deep space starfield with distant nebulae and twinkling stars.', 'banner', 'profile', 499, '{"banner_url": "/cosmetics/banners/starfield.webp", "banner_height": 200}', 2),
('banner_circuit_board', 'Circuit Board', 'Close-up of a circuit board with glowing orange traces.', 'banner', 'profile', 399, '{"banner_url": "/cosmetics/banners/circuit_board.webp", "banner_height": 200}', 3),
('banner_abstract_waves', 'Abstract Waves', 'Smooth abstract waves in warm gradient tones.', 'banner', 'profile', 399, '{"banner_url": "/cosmetics/banners/abstract_waves.webp", "banner_height": 200}', 4),

-- COMMUNITY BANNERS (2)
('banner_community_flames', 'Community Flames', 'Dramatic wall of flames banner for your community page.', 'banner', 'community', 799, '{"banner_url": "/cosmetics/banners/community_flames.webp", "banner_height": 250}', 5),
('banner_community_mountains', 'Community Mountains', 'Mountain range silhouette at sunset for your community page.', 'banner', 'community', 799, '{"banner_url": "/cosmetics/banners/community_mountains.webp", "banner_height": 250}', 6),

-- COMMUNITY ICONS (3)
('icon_flame_circle', 'Flame Circle Icon', 'Stylized flame inside a circle for your community icon.', 'icon', 'community', 499, '{"icon_url": "/cosmetics/icons/flame_circle.svg", "icon_size": 128}', 1),
('icon_shield', 'Shield Icon', 'Shield emblem with customizable inner color for your community.', 'icon', 'community', 499, '{"icon_url": "/cosmetics/icons/shield.svg", "icon_size": 128}', 2),
('icon_diamond', 'Diamond Icon', 'Faceted diamond icon with fire refraction effects.', 'icon', 'community', 599, '{"icon_url": "/cosmetics/icons/diamond.svg", "icon_size": 128}', 3)

ON CONFLICT (cosmetic_id) DO NOTHING;
