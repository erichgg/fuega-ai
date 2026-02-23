import { z } from "zod";

const SOCIAL_PLATFORMS = [
  "twitter",
  "github",
  "discord",
  "mastodon",
  "bluesky",
  "youtube",
  "twitch",
  "linkedin",
] as const;

export const socialLinksSchema = z
  .record(z.enum(SOCIAL_PLATFORMS), z.string().max(100).optional())
  .default({});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .max(50, "Display name must be 50 characters or less")
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .optional()
    .nullable(),
  website: z
    .string()
    .max(255, "Website must be 255 characters or less")
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  socialLinks: socialLinksSchema.optional(),
  brandText: z
    .string()
    .max(50, "Brand text must be 50 characters or less")
    .optional()
    .nullable(),
});

export const updatePrivacySchema = z.object({
  profileVisible: z.boolean(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
