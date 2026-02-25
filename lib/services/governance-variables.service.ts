import { query, queryOne, queryAll } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";

// ─── Types ───────────────────────────────────────────────────

export interface GovernanceVariable {
  id: string;
  key: string;
  display_name: string;
  description: string;
  data_type: "boolean" | "integer" | "string" | "text" | "enum" | "multi_enum";
  default_value: string;
  min_value: string | null;
  max_value: string | null;
  allowed_values: string[] | null;
  level: "campfire" | "platform";
  category: string;
  sort_order: number;
  is_active: boolean;
  requires_proposal: boolean;
  created_at: string;
}

export interface CampfireSetting {
  id: string;
  campfire_id: string;
  variable_key: string;
  value: string;
  set_by: string | null;
  set_via: string;
  proposal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolvedSetting {
  key: string;
  display_name: string;
  description: string;
  data_type: string;
  value: string;
  is_default: boolean;
  category: string;
  allowed_values: string[] | null;
  min_value: string | null;
  max_value: string | null;
}

// ─── List Variables ──────────────────────────────────────────

export async function listGovernanceVariables(
  activeOnly: boolean = true
): Promise<GovernanceVariable[]> {
  const condition = activeOnly ? "WHERE is_active = TRUE" : "";
  return queryAll<GovernanceVariable>(
    `SELECT * FROM governance_variables ${condition} ORDER BY category, sort_order`
  );
}

// ─── Get Resolved Settings for a Campfire ────────────────────

export async function getResolvedSettings(
  campfireId: string
): Promise<ResolvedSetting[]> {
  const variables = await listGovernanceVariables();
  const overrides = await queryAll<CampfireSetting>(
    `SELECT * FROM campfire_settings WHERE campfire_id = $1`,
    [campfireId]
  );

  const overrideMap = new Map(overrides.map((o) => [o.variable_key, o.value]));

  return variables.map((v) => ({
    key: v.key,
    display_name: v.display_name,
    description: v.description,
    data_type: v.data_type,
    value: overrideMap.get(v.key) ?? v.default_value,
    is_default: !overrideMap.has(v.key),
    category: v.category,
    allowed_values: v.allowed_values,
    min_value: v.min_value,
    max_value: v.max_value,
  }));
}

// ─── Get Single Setting Value ────────────────────────────────

export async function getSettingValue(
  campfireId: string,
  key: string
): Promise<string> {
  const override = await queryOne<CampfireSetting>(
    `SELECT value FROM campfire_settings WHERE campfire_id = $1 AND variable_key = $2`,
    [campfireId, key]
  );
  if (override) return override.value;

  const variable = await queryOne<GovernanceVariable>(
    `SELECT default_value FROM governance_variables WHERE key = $1 AND is_active = TRUE`,
    [key]
  );
  if (!variable) throw new ServiceError(`Unknown governance variable: ${key}`, "INVALID_VARIABLE", 400);
  return variable.default_value;
}

// ─── Update Setting ──────────────────────────────────────────

export async function updateSetting(
  campfireId: string,
  key: string,
  value: string,
  userId: string,
  setVia: "manual" | "proposal" | "system" = "manual",
  proposalId?: string,
  changeReason?: string
): Promise<CampfireSetting> {
  // Validate variable exists
  const variable = await queryOne<GovernanceVariable>(
    `SELECT * FROM governance_variables WHERE key = $1 AND is_active = TRUE`,
    [key]
  );
  if (!variable) {
    throw new ServiceError(`Unknown governance variable: ${key}`, "INVALID_VARIABLE", 400);
  }

  // Validate value against constraints
  validateValue(variable, value);

  // Get old value for audit trail
  const oldSetting = await queryOne<CampfireSetting>(
    `SELECT value FROM campfire_settings WHERE campfire_id = $1 AND variable_key = $2`,
    [campfireId, key]
  );
  const oldValue = oldSetting?.value ?? variable.default_value;

  // Upsert the setting
  const setting = await queryOne<CampfireSetting>(
    `INSERT INTO campfire_settings (campfire_id, variable_key, value, set_by, set_via, proposal_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (campfire_id, variable_key)
     DO UPDATE SET value = $3, set_by = $4, set_via = $5, proposal_id = $6
     RETURNING *`,
    [campfireId, key, value, userId, setVia, proposalId ?? null]
  );

  if (!setting) {
    throw new ServiceError("Failed to update setting", "INTERNAL_ERROR", 500);
  }

  // Audit trail
  await query(
    `INSERT INTO campfire_settings_history
     (campfire_id, variable_key, old_value, new_value, changed_by, change_reason, proposal_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [campfireId, key, oldValue, value, userId, changeReason ?? null, proposalId ?? null]
  );

  return setting;
}

// ─── Get Settings History ────────────────────────────────────

export async function getSettingsHistory(
  campfireId: string,
  limit: number = 50
): Promise<{
  variable_key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}[]> {
  return queryAll(
    `SELECT h.*, u.username AS changed_by_username
     FROM campfire_settings_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.campfire_id = $1
     ORDER BY h.created_at DESC
     LIMIT $2`,
    [campfireId, limit]
  );
}

// ─── Validation ──────────────────────────────────────────────

function validateValue(variable: GovernanceVariable, value: string): void {
  switch (variable.data_type) {
    case "boolean":
      if (value !== "true" && value !== "false") {
        throw new ServiceError(`${variable.display_name} must be true or false`, "INVALID_VALUE", 400);
      }
      break;

    case "integer": {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        throw new ServiceError(`${variable.display_name} must be a number`, "INVALID_VALUE", 400);
      }
      if (variable.min_value !== null && num < parseInt(variable.min_value, 10)) {
        throw new ServiceError(`${variable.display_name} minimum is ${variable.min_value}`, "INVALID_VALUE", 400);
      }
      if (variable.max_value !== null && num > parseInt(variable.max_value, 10)) {
        throw new ServiceError(`${variable.display_name} maximum is ${variable.max_value}`, "INVALID_VALUE", 400);
      }
      break;
    }

    case "enum":
      if (variable.allowed_values && !variable.allowed_values.includes(value)) {
        throw new ServiceError(
          `${variable.display_name} must be one of: ${variable.allowed_values.join(", ")}`,
          "INVALID_VALUE",
          400
        );
      }
      break;

    case "multi_enum": {
      const values = value.split(",").map((v) => v.trim()).filter(Boolean);
      if (variable.allowed_values) {
        const invalid = values.filter((v) => !variable.allowed_values!.includes(v));
        if (invalid.length > 0) {
          throw new ServiceError(
            `Invalid values for ${variable.display_name}: ${invalid.join(", ")}`,
            "INVALID_VALUE",
            400
          );
        }
      }
      break;
    }

    case "string":
      if (value.length > 200) {
        throw new ServiceError(`${variable.display_name} is too long (max 200 chars)`, "INVALID_VALUE", 400);
      }
      break;

    case "text":
      if (value.length > 2000) {
        throw new ServiceError(`${variable.display_name} is too long (max 2000 chars)`, "INVALID_VALUE", 400);
      }
      break;
  }
}
