/**
 * Re-export useAuth from the AuthContext for convenience.
 * Hooks directory provides a single import point for all hooks.
 */
export { useAuth } from "@/lib/contexts/auth-context";
export type { AuthUser } from "@/lib/contexts/auth-context";
