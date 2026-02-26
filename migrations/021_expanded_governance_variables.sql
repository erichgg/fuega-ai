-- ============================================
-- FUEGA.AI — 021_expanded_governance_variables.sql
-- Expanded governance variables: human moderation,
-- content controls, rate limits, voting, chat,
-- reputation, discovery, and more.
-- ============================================

INSERT INTO governance_variables (key, display_name, description, data_type, default_value, min_value, max_value, category, sort_order, requires_proposal) VALUES

-- =============================================
-- MODERATION (additional)
-- =============================================
('moderation_style', 'Moderation Style', 'Overall moderation strictness level for this campfire.', 'enum', 'moderate', NULL, NULL, 'moderation', 20, true),
('allow_appeals', 'Allow Appeals', 'Whether members can appeal AI moderation decisions.', 'boolean', 'true', NULL, NULL, 'moderation', 21, true),
('appeal_window_hours', 'Appeal Window (hours)', 'Hours after a moderation action during which appeals can be filed.', 'integer', '72', '1', '720', 'moderation', 22, true),
('auto_remove_threshold', 'Auto-Remove Confidence', 'AI confidence level (%) above which content is auto-removed without review.', 'integer', '85', '50', '100', 'moderation', 23, true),
('require_moderation_reason', 'Require AI Reasoning', 'Whether the AI must provide detailed reasoning for all moderation decisions.', 'boolean', 'true', NULL, NULL, 'moderation', 24, false),
('profanity_filter', 'Profanity Filter', 'Level of automatic profanity filtering applied to posts and comments.', 'enum', 'light', NULL, NULL, 'moderation', 25, true),
('hate_speech_sensitivity', 'Hate Speech Sensitivity', 'How aggressively hate speech and slurs are detected and actioned.', 'enum', 'high', NULL, NULL, 'moderation', 26, true),
('misinformation_policy', 'Misinformation Policy', 'How suspected misinformation is handled by the AI moderator.', 'enum', 'flag', NULL, NULL, 'moderation', 27, true),
('ai_explanation_visibility', 'AI Reasoning Visibility', 'Who can see the AI reasoning behind moderation decisions.', 'enum', 'public', NULL, NULL, 'moderation', 28, true),

-- =============================================
-- HUMAN MODERATION
-- =============================================
('allow_human_mods', 'Allow Human Moderators', 'Whether this campfire has human moderators in addition to AI.', 'boolean', 'false', NULL, NULL, 'human_moderation', 1, true),
('max_human_mods', 'Max Human Moderators', 'Maximum number of human moderators allowed.', 'integer', '5', '0', '50', 'human_moderation', 2, true),
('mod_election_enabled', 'Moderator Elections', 'Whether moderators are elected by community vote rather than appointed.', 'boolean', 'false', NULL, NULL, 'human_moderation', 3, true),
('mod_term_days', 'Moderator Term (days)', 'How long a moderator term lasts. 0 means indefinite.', 'integer', '0', '0', '365', 'human_moderation', 4, true),
('mod_can_override_ai', 'Mods Can Override AI', 'Whether human moderators can override AI moderation decisions.', 'boolean', 'false', NULL, NULL, 'human_moderation', 5, true),
('mod_actions_public', 'Public Mod Actions', 'Whether human moderator actions appear in the public mod log.', 'boolean', 'true', NULL, NULL, 'human_moderation', 6, false),
('mod_application_required', 'Require Mod Applications', 'Whether aspiring moderators must submit an application.', 'boolean', 'true', NULL, NULL, 'human_moderation', 7, true),

-- =============================================
-- CONTENT (additional)
-- =============================================
('max_post_length', 'Max Post Length', 'Maximum character count for post bodies.', 'integer', '40000', '100', '100000', 'content', 10, true),
('max_title_length', 'Max Title Length', 'Maximum character count for post titles.', 'integer', '300', '10', '500', 'content', 11, true),
('max_comment_length', 'Max Comment Length', 'Maximum character count for comments.', 'integer', '10000', '100', '40000', 'content', 12, true),
('allow_markdown', 'Allow Markdown', 'Whether markdown formatting is enabled in posts and comments.', 'boolean', 'true', NULL, NULL, 'content', 13, false),
('allow_code_blocks', 'Allow Code Blocks', 'Whether code blocks with syntax highlighting are allowed.', 'boolean', 'true', NULL, NULL, 'content', 14, false),
('allow_images_in_comments', 'Images in Comments', 'Whether image URLs in comments render as inline images.', 'boolean', 'false', NULL, NULL, 'content', 15, true),
('allow_video_embeds', 'Video Embeds', 'Whether video URLs (YouTube, etc.) auto-embed in posts.', 'boolean', 'true', NULL, NULL, 'content', 16, true),
('max_links_per_post', 'Max Links Per Post', 'Maximum number of external links allowed in a single post.', 'integer', '10', '0', '50', 'content', 17, true),
('require_post_flair', 'Require Post Flair', 'Whether posts must have a flair/tag when created.', 'boolean', 'false', NULL, NULL, 'content', 18, true),
('allow_polls', 'Allow Polls', 'Whether poll-type posts are enabled.', 'boolean', 'true', NULL, NULL, 'content', 19, true),
('allow_crossposts', 'Allow Crossposts', 'Whether cross-posting content from other campfires is allowed.', 'boolean', 'true', NULL, NULL, 'content', 20, true),
('min_title_length', 'Min Title Length', 'Minimum character count for post titles.', 'integer', '5', '1', '100', 'content', 21, true),
('allow_edits', 'Allow Post Edits', 'Whether posts and comments can be edited after creation.', 'boolean', 'true', NULL, NULL, 'content', 22, false),
('edit_window_minutes', 'Edit Window (minutes)', 'Time window for editing posts after creation. 0 means unlimited.', 'integer', '0', '0', '10080', 'content', 23, true),

-- =============================================
-- ACCESS (additional)
-- =============================================
('invite_only', 'Invite Only', 'Whether this campfire requires an invitation to join.', 'boolean', 'false', NULL, NULL, 'access', 10, true),
('require_email_verification', 'Require Verified Email', 'Whether members must have a verified email to participate.', 'boolean', 'false', NULL, NULL, 'access', 11, true),
('max_members', 'Max Members', 'Maximum number of members allowed. 0 means unlimited.', 'integer', '0', '0', '1000000', 'access', 12, true),
('banned_domains', 'Banned Domains', 'Domains that cannot be linked to (comma-separated list).', 'text', '', NULL, NULL, 'access', 13, true),
('allowed_domains', 'Allowed Domains', 'Only these domains can be linked. Empty means all domains allowed.', 'text', '', NULL, NULL, 'access', 14, true),

-- =============================================
-- RATE LIMITS
-- =============================================
('posts_per_day', 'Posts Per Day', 'Maximum number of posts a member can create per day.', 'integer', '10', '1', '100', 'rate_limits', 1, true),
('comments_per_hour', 'Comments Per Hour', 'Maximum number of comments a member can post per hour.', 'integer', '30', '1', '200', 'rate_limits', 2, true),
('min_time_between_posts', 'Min Time Between Posts (min)', 'Minimum minutes that must pass between creating posts.', 'integer', '1', '0', '1440', 'rate_limits', 3, true),
('new_member_cooldown_hours', 'New Member Cooldown (hours)', 'Hours new members must wait before they can post.', 'integer', '0', '0', '168', 'rate_limits', 4, true),

-- =============================================
-- VOTING
-- =============================================
('allow_downvotes', 'Allow Dousing', 'Whether dousing (downvoting) is enabled in this campfire.', 'boolean', 'true', NULL, NULL, 'voting', 1, true),
('vote_weight_by_glow', 'Weight Votes by Glow', 'Whether votes are weighted by the voter''s glow reputation.', 'boolean', 'false', NULL, NULL, 'voting', 2, true),
('hide_vote_counts', 'Hide Vote Counts', 'Whether spark/douse counts are hidden from users.', 'boolean', 'false', NULL, NULL, 'voting', 3, true),
('min_glow_to_downvote', 'Min Glow to Douse', 'Minimum glow reputation required to douse content.', 'integer', '0', '0', '1000', 'voting', 4, true),
('score_display_mode', 'Score Display Mode', 'How post scores are displayed to users.', 'enum', 'fuzzy', NULL, NULL, 'voting', 5, true),

-- =============================================
-- CHAT
-- =============================================
('chat_enabled', 'Chat Enabled', 'Whether the campfire live chat feature is enabled.', 'boolean', 'true', NULL, NULL, 'chat', 1, true),
('chat_slowmode_seconds', 'Chat Slow Mode (seconds)', 'Minimum seconds between chat messages per user. 0 means no limit.', 'integer', '0', '0', '600', 'chat', 2, true),
('chat_min_glow', 'Chat Min Glow', 'Minimum glow reputation required to use campfire chat.', 'integer', '0', '0', '1000', 'chat', 3, true),
('chat_max_message_length', 'Chat Max Message Length', 'Maximum character count for chat messages.', 'integer', '500', '1', '2000', 'chat', 4, true),

-- =============================================
-- REPUTATION
-- =============================================
('glow_per_spark_received', 'Glow Per Spark', 'Glow points earned when your content receives a spark.', 'integer', '1', '1', '10', 'reputation', 1, true),
('glow_per_douse_received', 'Glow Per Douse', 'Glow points lost when your content receives a douse.', 'integer', '1', '0', '10', 'reputation', 2, true),
('glow_per_post', 'Glow Per Post', 'Glow points earned for creating a post.', 'integer', '0', '0', '5', 'reputation', 3, true),
('glow_per_comment', 'Glow Per Comment', 'Glow points earned for creating a comment.', 'integer', '0', '0', '5', 'reputation', 4, true),
('glow_decay_enabled', 'Glow Decay', 'Whether glow reputation decays over time when inactive.', 'boolean', 'false', NULL, NULL, 'reputation', 5, true),
('glow_decay_days', 'Glow Decay Days', 'Days of inactivity before glow starts decaying.', 'integer', '90', '7', '365', 'reputation', 6, true),

-- =============================================
-- GOVERNANCE (additional)
-- =============================================
('proposal_min_glow', 'Min Glow for Proposals', 'Minimum glow reputation required to create governance proposals.', 'integer', '10', '0', '10000', 'governance', 10, false),
('proposal_cooldown_days', 'Proposal Cooldown (days)', 'Days a member must wait between creating proposals.', 'integer', '7', '0', '90', 'governance', 11, false),
('allow_custom_variable_proposals', 'Custom Variable Proposals', 'Whether members can propose entirely new governance variables.', 'boolean', 'false', NULL, NULL, 'governance', 12, false),
('emergency_vote_threshold', 'Emergency Vote Threshold (%)', 'Vote percentage required for emergency fast-track proposals.', 'integer', '80', '51', '100', 'governance', 13, false),
('emergency_vote_hours', 'Emergency Vote Duration (hours)', 'How many hours an emergency vote stays open.', 'integer', '24', '1', '72', 'governance', 14, false),
('max_active_proposals', 'Max Active Proposals', 'Maximum number of proposals that can be active simultaneously.', 'integer', '10', '1', '50', 'governance', 15, false),

-- =============================================
-- IDENTITY (additional)
-- =============================================
('allow_custom_brands', 'Custom Brands', 'Whether members can set custom brands (flair).', 'boolean', 'true', NULL, NULL, 'identity', 10, true),
('brand_approval_required', 'Brand Approval Required', 'Whether custom brands need moderator or AI approval.', 'boolean', 'false', NULL, NULL, 'identity', 11, true),
('show_member_glow', 'Show Member Glow', 'Whether member glow reputation is visible to others.', 'boolean', 'true', NULL, NULL, 'identity', 12, false),
('show_join_date', 'Show Join Date', 'Whether member join dates are visible on profiles.', 'boolean', 'true', NULL, NULL, 'identity', 13, false),
('anonymous_posting', 'Anonymous Posting', 'Whether members can post anonymously.', 'boolean', 'false', NULL, NULL, 'identity', 14, true),

-- =============================================
-- DISCOVERY
-- =============================================
('searchable', 'Searchable', 'Whether this campfire appears in search results.', 'boolean', 'true', NULL, NULL, 'discovery', 1, true),
('show_in_directory', 'Show in Directory', 'Whether this campfire appears in the campfires browse page.', 'boolean', 'true', NULL, NULL, 'discovery', 2, true),
('recommended_age_rating', 'Age Rating', 'Recommended content age rating for this campfire.', 'enum', 'everyone', NULL, NULL, 'discovery', 3, true)

ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Set allowed_values for new enum types
-- =============================================
UPDATE governance_variables SET allowed_values = ARRAY['strict', 'moderate', 'relaxed', 'minimal']
  WHERE key = 'moderation_style';
UPDATE governance_variables SET allowed_values = ARRAY['off', 'light', 'moderate', 'strict']
  WHERE key = 'profanity_filter';
UPDATE governance_variables SET allowed_values = ARRAY['low', 'medium', 'high', 'zero_tolerance']
  WHERE key = 'hate_speech_sensitivity';
UPDATE governance_variables SET allowed_values = ARRAY['ignore', 'flag', 'label', 'remove']
  WHERE key = 'misinformation_policy';
UPDATE governance_variables SET allowed_values = ARRAY['public', 'author_only', 'mods_only']
  WHERE key = 'ai_explanation_visibility';
UPDATE governance_variables SET allowed_values = ARRAY['exact', 'fuzzy', 'hidden']
  WHERE key = 'score_display_mode';
UPDATE governance_variables SET allowed_values = ARRAY['everyone', '13+', '17+', '18+']
  WHERE key = 'recommended_age_rating';
