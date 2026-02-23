import { queryOne, queryAll } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ServiceError } from "@/lib/services/posts.service";

// ─── Types ───────────────────────────────────────────────────

export type CosmeticCategory =
  | "theme"
  | "border"
  | "title"
  | "color"
  | "avatar"
  | "banner"
  | "icon";

export type CosmeticSubcategory = "profile" | "community";

export interface CosmeticDefinition {
  cosmetic_id: string;
  name: string;
  description: string;
  preview_concept: string;
  category: CosmeticCategory;
  subcategory: CosmeticSubcategory;
  price_cents: number;
  metadata: Record<string, unknown>;
  available: boolean;
}

export interface CosmeticRow {
  id: string;
  cosmetic_id: string;
  name: string;
  description: string;
  preview_url: string | null;
  category: string;
  subcategory: string;
  price_cents: number;
  metadata: Record<string, unknown>;
  available: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserCosmeticRow {
  id: string;
  user_id: string;
  cosmetic_id: string;
  price_paid_cents: number;
  stripe_payment_id: string | null;
  refunded: boolean;
  refunded_at: string | null;
  purchased_at: string;
  // joined fields
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  metadata?: Record<string, unknown>;
}

export interface ActiveCosmetics {
  theme?: string;
  border?: string;
  title?: string;
  color?: string;
  avatar?: string;
  banner?: string;
  icon?: string;
}

// ─── Static Catalog (40 items from GAMIFICATION.md) ─────────

export const COSMETICS_CATALOG: CosmeticDefinition[] = [
  // ── Profile Themes ──
  {
    cosmetic_id: "theme_lava_flow",
    name: "Lava Flow",
    description: "Deep red and orange gradient background with flowing lava animation on your profile page.",
    preview_concept: "Profile page with dark red-to-orange gradient, subtle flowing animation.",
    category: "theme",
    subcategory: "profile",
    price_cents: 499,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#1a0000",
        "--profile-bg-secondary": "#330000",
        "--profile-accent": "#FF4500",
        "--profile-text": "#FFD700",
      },
      animation: "lava_flow",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_midnight_ember",
    name: "Midnight Ember",
    description: "Deep black background with subtle orange ember particles floating across your profile.",
    preview_concept: "Near-black profile with tiny orange dots drifting upward.",
    category: "theme",
    subcategory: "profile",
    price_cents: 499,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#0a0a0a",
        "--profile-bg-secondary": "#1a1008",
        "--profile-accent": "#FF6B35",
        "--profile-text": "#E0E0E0",
      },
      animation: "ember_float",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_arctic_frost",
    name: "Arctic Frost",
    description: "Cool blue and white gradient with crystalline frost effects. The anti-fire theme.",
    preview_concept: "Ice-blue profile with subtle frost crystal overlays.",
    category: "theme",
    subcategory: "profile",
    price_cents: 499,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#0a1628",
        "--profile-bg-secondary": "#1a2a4a",
        "--profile-accent": "#60A5FA",
        "--profile-text": "#E0F0FF",
      },
      animation: "frost_crystals",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_neon_grid",
    name: "Neon Grid",
    description: "Retro-futuristic neon grid background with purple and cyan accents.",
    preview_concept: "Dark background with perspective neon grid lines, Tron-style.",
    category: "theme",
    subcategory: "profile",
    price_cents: 599,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#0a0020",
        "--profile-bg-secondary": "#150040",
        "--profile-accent": "#00FFFF",
        "--profile-text": "#E0E0FF",
      },
      animation: "neon_pulse",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_forest_canopy",
    name: "Forest Canopy",
    description: "Deep green and brown tones with leaf particle effects.",
    preview_concept: "Dark forest green background with falling leaf silhouettes.",
    category: "theme",
    subcategory: "profile",
    price_cents: 499,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#0a1a0a",
        "--profile-bg-secondary": "#1a2a1a",
        "--profile-accent": "#4ADE80",
        "--profile-text": "#D0F0D0",
      },
      animation: "falling_leaves",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_void",
    name: "The Void",
    description: "Pure black with subtle dark purple undertones. Minimal. Mysterious.",
    preview_concept: "Almost entirely black with very faint purple nebula wisps.",
    category: "theme",
    subcategory: "profile",
    price_cents: 399,
    metadata: {
      css_vars: {
        "--profile-bg-primary": "#000000",
        "--profile-bg-secondary": "#0a0010",
        "--profile-accent": "#8B5CF6",
        "--profile-text": "#C0C0C0",
      },
      animation: "none",
    },
    available: true,
  },
  // ── Campfire Themes ──
  {
    cosmetic_id: "theme_community_inferno",
    name: "Community Inferno",
    description: "Intense red and orange theme for your campfire page. Flames on every surface.",
    preview_concept: "Campfire page bathed in red-orange tones with fire border effects.",
    category: "theme",
    subcategory: "community",
    price_cents: 999,
    metadata: {
      css_vars: {
        "--community-bg-primary": "#1a0500",
        "--community-bg-secondary": "#2a0a00",
        "--community-accent": "#FF4500",
        "--community-text": "#FFE0C0",
      },
      animation: "fire_border",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_community_ocean",
    name: "Community Ocean",
    description: "Deep blue aquatic theme with wave animations for your campfire page.",
    preview_concept: "Campfire page with deep blue gradient and wave motion at the top.",
    category: "theme",
    subcategory: "community",
    price_cents: 999,
    metadata: {
      css_vars: {
        "--community-bg-primary": "#001020",
        "--community-bg-secondary": "#002040",
        "--community-accent": "#0EA5E9",
        "--community-text": "#C0E0FF",
      },
      animation: "wave_motion",
    },
    available: true,
  },
  {
    cosmetic_id: "theme_community_terminal",
    name: "Community Terminal",
    description: "Classic green-on-black terminal aesthetic for your campfire page.",
    preview_concept: "Campfire page styled like an old CRT terminal with green text.",
    category: "theme",
    subcategory: "community",
    price_cents: 799,
    metadata: {
      css_vars: {
        "--community-bg-primary": "#000000",
        "--community-bg-secondary": "#001100",
        "--community-accent": "#00FF00",
        "--community-text": "#00CC00",
      },
      animation: "scanlines",
    },
    available: true,
  },
  // ── Avatar Borders ──
  {
    cosmetic_id: "border_flame_ring",
    name: "Flame Ring",
    description: "Animated ring of fire around your avatar.",
    preview_concept: "User avatar enclosed in a rotating ring of orange flames.",
    category: "border",
    subcategory: "profile",
    price_cents: 299,
    metadata: {
      border_style: "animated",
      animation: "flame_rotation",
      colors: ["#FF4500", "#FF6B35", "#FFD700"],
    },
    available: true,
  },
  {
    cosmetic_id: "border_ice_crystal",
    name: "Ice Crystal",
    description: "Crystalline ice border with subtle shimmer effect.",
    preview_concept: "User avatar enclosed in a jagged ice crystal frame with blue shimmer.",
    category: "border",
    subcategory: "profile",
    price_cents: 299,
    metadata: {
      border_style: "animated",
      animation: "ice_shimmer",
      colors: ["#60A5FA", "#93C5FD", "#DBEAFE"],
    },
    available: true,
  },
  {
    cosmetic_id: "border_gold_ornate",
    name: "Gold Ornate",
    description: "Elegant gold filigree border with intricate patterns.",
    preview_concept: "User avatar with an ornate gold decorative frame, like a portrait painting.",
    category: "border",
    subcategory: "profile",
    price_cents: 399,
    metadata: {
      border_style: "static",
      animation: "none",
      colors: ["#FFD700", "#DAA520", "#B8860B"],
    },
    available: true,
  },
  {
    cosmetic_id: "border_pixel_art",
    name: "Pixel Art",
    description: "Retro 8-bit pixel art border with chunky colored squares.",
    preview_concept: "User avatar with a pixelated border made of small colored squares.",
    category: "border",
    subcategory: "profile",
    price_cents: 199,
    metadata: {
      border_style: "static",
      animation: "none",
      colors: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"],
    },
    available: true,
  },
  {
    cosmetic_id: "border_lightning",
    name: "Lightning",
    description: "Electric lightning bolts crackling around your avatar.",
    preview_concept: "User avatar surrounded by small animated lightning arcs.",
    category: "border",
    subcategory: "profile",
    price_cents: 399,
    metadata: {
      border_style: "animated",
      animation: "lightning_crackle",
      colors: ["#FFFFFF", "#60A5FA", "#A855F7"],
    },
    available: true,
  },
  {
    cosmetic_id: "border_shadow",
    name: "Shadow Aura",
    description: "Dark smoke-like tendrils emanating from your avatar border.",
    preview_concept: "User avatar with dark wisps of shadow curling outward.",
    category: "border",
    subcategory: "profile",
    price_cents: 299,
    metadata: {
      border_style: "animated",
      animation: "shadow_wisps",
      colors: ["#1a1a2e", "#16213e", "#0f3460"],
    },
    available: true,
  },
  // ── Custom Titles ──
  {
    cosmetic_id: "title_fire_starter",
    name: "Fire Starter",
    description: "Displays 'Fire Starter' below your username.",
    preview_concept: "Username with 'Fire Starter' in orange text below it.",
    category: "title",
    subcategory: "profile",
    price_cents: 199,
    metadata: { title_text: "Fire Starter", title_color: "#FF4500" },
    available: true,
  },
  {
    cosmetic_id: "title_flame_keeper",
    name: "Flame Keeper",
    description: "Displays 'Flame Keeper' below your username.",
    preview_concept: "Username with 'Flame Keeper' in gold text below it.",
    category: "title",
    subcategory: "profile",
    price_cents: 199,
    metadata: { title_text: "Flame Keeper", title_color: "#FFD700" },
    available: true,
  },
  {
    cosmetic_id: "title_ember_walker",
    name: "Ember Walker",
    description: "Displays 'Ember Walker' below your username.",
    preview_concept: "Username with 'Ember Walker' in warm red text below it.",
    category: "title",
    subcategory: "profile",
    price_cents: 199,
    metadata: { title_text: "Ember Walker", title_color: "#DC2626" },
    available: true,
  },
  {
    cosmetic_id: "title_ash_born",
    name: "Ash Born",
    description: "Displays 'Ash Born' below your username.",
    preview_concept: "Username with 'Ash Born' in silver-grey text below it.",
    category: "title",
    subcategory: "profile",
    price_cents: 199,
    metadata: { title_text: "Ash Born", title_color: "#A0A0A0" },
    available: true,
  },
  {
    cosmetic_id: "title_phoenix",
    name: "Phoenix",
    description: "Displays 'Phoenix' below your username with gradient coloring.",
    preview_concept: "Username with 'Phoenix' in red-to-gold gradient text below it.",
    category: "title",
    subcategory: "profile",
    price_cents: 299,
    metadata: { title_text: "Phoenix", title_color: "gradient(#DC2626, #FFD700)" },
    available: true,
  },
  {
    cosmetic_id: "title_wildfire",
    name: "Wildfire",
    description: "Displays 'Wildfire' below your username with animated flame effect.",
    preview_concept: "Username with 'Wildfire' text that has a subtle flame shimmer animation.",
    category: "title",
    subcategory: "profile",
    price_cents: 399,
    metadata: { title_text: "Wildfire", title_color: "#FF6B35", animation: "flame_text" },
    available: true,
  },
  // ── Username Colors ──
  {
    cosmetic_id: "color_flame_orange",
    name: "Flame Orange",
    description: "Your username appears in bright flame orange in posts and comments.",
    preview_concept: "Username text rendered in #FF6B35.",
    category: "color",
    subcategory: "profile",
    price_cents: 149,
    metadata: { username_color: "#FF6B35" },
    available: true,
  },
  {
    cosmetic_id: "color_royal_purple",
    name: "Royal Purple",
    description: "Your username appears in rich royal purple.",
    preview_concept: "Username text rendered in #A855F7.",
    category: "color",
    subcategory: "profile",
    price_cents: 149,
    metadata: { username_color: "#A855F7" },
    available: true,
  },
  {
    cosmetic_id: "color_ocean_blue",
    name: "Ocean Blue",
    description: "Your username appears in deep ocean blue.",
    preview_concept: "Username text rendered in #3B82F6.",
    category: "color",
    subcategory: "profile",
    price_cents: 149,
    metadata: { username_color: "#3B82F6" },
    available: true,
  },
  {
    cosmetic_id: "color_emerald_green",
    name: "Emerald Green",
    description: "Your username appears in vivid emerald green.",
    preview_concept: "Username text rendered in #10B981.",
    category: "color",
    subcategory: "profile",
    price_cents: 149,
    metadata: { username_color: "#10B981" },
    available: true,
  },
  {
    cosmetic_id: "color_crimson_red",
    name: "Crimson Red",
    description: "Your username appears in deep crimson red.",
    preview_concept: "Username text rendered in #DC2626.",
    category: "color",
    subcategory: "profile",
    price_cents: 149,
    metadata: { username_color: "#DC2626" },
    available: true,
  },
  {
    cosmetic_id: "color_gold",
    name: "Gold",
    description: "Your username appears in gleaming gold.",
    preview_concept: "Username text rendered in #FFD700.",
    category: "color",
    subcategory: "profile",
    price_cents: 199,
    metadata: { username_color: "#FFD700" },
    available: true,
  },
  {
    cosmetic_id: "color_rainbow",
    name: "Rainbow",
    description: "Your username cycles through rainbow colors with a smooth gradient animation.",
    preview_concept: "Username text with animated rainbow gradient.",
    category: "color",
    subcategory: "profile",
    price_cents: 399,
    metadata: { username_color: "rainbow_gradient", animation: "color_cycle" },
    available: true,
  },
  // ── Avatar Frames ──
  {
    cosmetic_id: "avatar_flame_aura",
    name: "Flame Aura",
    description: "A glow of flickering flames behind your avatar image.",
    preview_concept: "Avatar with a soft orange flame-like glow behind it.",
    category: "avatar",
    subcategory: "profile",
    price_cents: 349,
    metadata: { frame_type: "glow", animation: "flicker", colors: ["#FF4500", "#FF6B35"] },
    available: true,
  },
  {
    cosmetic_id: "avatar_hexagon",
    name: "Hexagon Frame",
    description: "Your avatar is displayed in a hexagonal shape instead of a circle.",
    preview_concept: "Avatar cropped to a hexagonal shape with thin border.",
    category: "avatar",
    subcategory: "profile",
    price_cents: 249,
    metadata: { frame_type: "shape", shape: "hexagon", animation: "none" },
    available: true,
  },
  {
    cosmetic_id: "avatar_diamond",
    name: "Diamond Frame",
    description: "Your avatar is displayed in a diamond (rotated square) shape.",
    preview_concept: "Avatar cropped to a 45-degree rotated square shape.",
    category: "avatar",
    subcategory: "profile",
    price_cents: 249,
    metadata: { frame_type: "shape", shape: "diamond", animation: "none" },
    available: true,
  },
  // ── Profile Banners ──
  {
    cosmetic_id: "banner_fire_landscape",
    name: "Fire Landscape",
    description: "A wide panoramic banner of a volcanic landscape with flowing lava.",
    preview_concept: "Dark volcanic terrain with rivers of lava and an orange sky.",
    category: "banner",
    subcategory: "profile",
    price_cents: 499,
    metadata: { banner_url: "/cosmetics/banners/fire_landscape.webp", banner_height: 200 },
    available: true,
  },
  {
    cosmetic_id: "banner_starfield",
    name: "Starfield",
    description: "Deep space starfield with distant nebulae and twinkling stars.",
    preview_concept: "Dark space background with colorful nebula clouds and bright stars.",
    category: "banner",
    subcategory: "profile",
    price_cents: 499,
    metadata: { banner_url: "/cosmetics/banners/starfield.webp", banner_height: 200 },
    available: true,
  },
  {
    cosmetic_id: "banner_circuit_board",
    name: "Circuit Board",
    description: "Close-up of a circuit board with glowing orange traces.",
    preview_concept: "Green PCB with bright orange/copper traces and component outlines.",
    category: "banner",
    subcategory: "profile",
    price_cents: 399,
    metadata: { banner_url: "/cosmetics/banners/circuit_board.webp", banner_height: 200 },
    available: true,
  },
  {
    cosmetic_id: "banner_abstract_waves",
    name: "Abstract Waves",
    description: "Smooth abstract waves in warm gradient tones.",
    preview_concept: "Flowing wave shapes in orange, red, and gold on a dark background.",
    category: "banner",
    subcategory: "profile",
    price_cents: 399,
    metadata: { banner_url: "/cosmetics/banners/abstract_waves.webp", banner_height: 200 },
    available: true,
  },
  // ── Campfire Banners ──
  {
    cosmetic_id: "banner_community_flames",
    name: "Community Flames",
    description: "Dramatic wall of flames banner for your campfire page.",
    preview_concept: "Wide banner of rising flames against a dark background.",
    category: "banner",
    subcategory: "community",
    price_cents: 799,
    metadata: { banner_url: "/cosmetics/banners/campfire_flames.webp", banner_height: 250 },
    available: true,
  },
  {
    cosmetic_id: "banner_community_mountains",
    name: "Community Mountains",
    description: "Mountain range silhouette at sunset for your campfire page.",
    preview_concept: "Dark mountain silhouettes against an orange-red sunset sky.",
    category: "banner",
    subcategory: "community",
    price_cents: 799,
    metadata: { banner_url: "/cosmetics/banners/campfire_mountains.webp", banner_height: 250 },
    available: true,
  },
  // ── Campfire Icons ──
  {
    cosmetic_id: "icon_flame_circle",
    name: "Flame Circle Icon",
    description: "Stylized flame inside a circle for your campfire icon.",
    preview_concept: "Orange flame icon centered in a dark circle with orange border.",
    category: "icon",
    subcategory: "community",
    price_cents: 499,
    metadata: { icon_url: "/cosmetics/icons/flame_circle.svg", icon_size: 128 },
    available: true,
  },
  {
    cosmetic_id: "icon_shield",
    name: "Shield Icon",
    description: "Shield emblem with customizable inner color for your campfire.",
    preview_concept: "Traditional shield shape with inner flame emblem.",
    category: "icon",
    subcategory: "community",
    price_cents: 499,
    metadata: { icon_url: "/cosmetics/icons/shield.svg", icon_size: 128 },
    available: true,
  },
  {
    cosmetic_id: "icon_diamond",
    name: "Diamond Icon",
    description: "Faceted diamond icon with fire refraction effects.",
    preview_concept: "Diamond shape with internal orange/red light refractions.",
    category: "icon",
    subcategory: "community",
    price_cents: 599,
    metadata: { icon_url: "/cosmetics/icons/diamond.svg", icon_size: 128 },
    available: true,
  },
];

// ─── Catalog helpers ─────────────────────────────────────────

export function getCatalogItem(cosmeticId: string): CosmeticDefinition | undefined {
  return COSMETICS_CATALOG.find((c) => c.cosmetic_id === cosmeticId);
}

export function getCatalogGroupedByCategory(): Record<string, CosmeticDefinition[]> {
  const grouped: Record<string, CosmeticDefinition[]> = {};
  for (const item of COSMETICS_CATALOG) {
    const key = `${item.category}:${item.subcategory}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}

// ─── DB: List all available cosmetics ────────────────────────

export async function listCosmetics(): Promise<CosmeticRow[]> {
  return queryAll<CosmeticRow>(
    `SELECT * FROM cosmetics
     WHERE available = TRUE
     ORDER BY category, subcategory, sort_order, name`
  );
}

// ─── DB: Get single cosmetic ─────────────────────────────────

export async function getCosmeticById(cosmeticId: string): Promise<CosmeticRow | null> {
  return queryOne<CosmeticRow>(
    `SELECT * FROM cosmetics WHERE cosmetic_id = $1`,
    [cosmeticId]
  );
}

// ─── DB: Check user owns cosmetic ────────────────────────────

export async function userOwnsCosmetic(
  userId: string,
  cosmeticId: string
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM user_cosmetics
     WHERE user_id = $1 AND cosmetic_id = $2 AND refunded = FALSE`,
    [userId, cosmeticId]
  );
  return row !== null;
}

// ─── DB: Record purchase ─────────────────────────────────────

export async function recordPurchase(
  userId: string,
  cosmeticId: string,
  pricePaidCents: number,
  stripePaymentId: string | null
): Promise<void> {
  await queryOne(
    `INSERT INTO user_cosmetics (user_id, cosmetic_id, price_paid_cents, stripe_payment_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, cosmetic_id) DO NOTHING
     RETURNING id`,
    [userId, cosmeticId, pricePaidCents, stripePaymentId]
  );
}

// ─── DB: Get user's owned cosmetics ──────────────────────────

export async function getUserCosmetics(userId: string): Promise<UserCosmeticRow[]> {
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }

  return queryAll<UserCosmeticRow>(
    `SELECT uc.id, uc.user_id, uc.cosmetic_id, uc.price_paid_cents,
            uc.stripe_payment_id, uc.refunded, uc.refunded_at, uc.purchased_at,
            c.name, c.description, c.category, c.subcategory, c.metadata
     FROM user_cosmetics uc
     JOIN cosmetics c ON c.cosmetic_id = uc.cosmetic_id
     WHERE uc.user_id = $1 AND uc.refunded = FALSE
     ORDER BY uc.purchased_at DESC`,
    [userId]
  );
}

// ─── DB: Get purchase record for refund ──────────────────────

export async function getPurchaseRecord(
  userId: string,
  cosmeticId: string
): Promise<UserCosmeticRow | null> {
  return queryOne<UserCosmeticRow>(
    `SELECT * FROM user_cosmetics
     WHERE user_id = $1 AND cosmetic_id = $2 AND refunded = FALSE`,
    [userId, cosmeticId]
  );
}

// ─── DB: Count recent refunds (abuse prevention) ─────────────

export async function countRecentRefunds(userId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM user_cosmetics
     WHERE user_id = $1 AND refunded = TRUE
       AND refunded_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  );
  return parseInt(row?.count ?? "0", 10);
}

// ─── DB: Mark cosmetic as refunded ───────────────────────────

export async function markRefunded(
  userId: string,
  cosmeticId: string
): Promise<void> {
  await queryOne(
    `UPDATE user_cosmetics
     SET refunded = TRUE, refunded_at = NOW()
     WHERE user_id = $1 AND cosmetic_id = $2 AND refunded = FALSE
     RETURNING id`,
    [userId, cosmeticId]
  );
}

// ─── DB: Get active cosmetics ────────────────────────────────

export async function getActiveCosmetics(userId: string): Promise<ActiveCosmetics> {
  const user = await queryOne<{ cosmetics: ActiveCosmetics }>(
    `SELECT cosmetics FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return user?.cosmetics ?? {};
}

// ─── DB: Set active cosmetics ────────────────────────────────

export async function setActiveCosmetics(
  userId: string,
  cosmetics: ActiveCosmetics
): Promise<void> {
  // Validate user owns each cosmetic
  for (const [_slot, cosmeticId] of Object.entries(cosmetics)) {
    if (!cosmeticId) continue;
    const owned = await userOwnsCosmetic(userId, cosmeticId);
    if (!owned) {
      throw new ServiceError(
        `You do not own cosmetic "${cosmeticId}"`,
        "COSMETIC_NOT_OWNED",
        400
      );
    }
  }

  await queryOne(
    `UPDATE users SET cosmetics = $1 WHERE id = $2 RETURNING id`,
    [JSON.stringify(cosmetics), userId]
  );
}

// ─── DB: Remove cosmetic from active if applied ──────────────

export async function removeFromActive(
  userId: string,
  cosmeticId: string
): Promise<void> {
  const active = await getActiveCosmetics(userId);
  let changed = false;

  for (const [slot, id] of Object.entries(active)) {
    if (id === cosmeticId) {
      delete (active as Record<string, string | undefined>)[slot];
      changed = true;
    }
  }

  if (changed) {
    await queryOne(
      `UPDATE users SET cosmetics = $1 WHERE id = $2 RETURNING id`,
      [JSON.stringify(active), userId]
    );
  }
}
