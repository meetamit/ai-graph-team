import type { Graph } from './db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphVisibility = 'private' | 'unlisted' | 'listed';

export type UserRole = 'normal' | 'admin';

export type GraphCapabilities = {
  canView: boolean;
  canEdit: boolean;
  canRun: boolean;
};

/**
 * Minimal user info needed for authorization checks.
 * Matches what's available in the session.
 */
export type AuthUser = {
  id: string;
  role: 'admin' | null;
};

/**
 * Context for graph access evaluation.
 * 
 * Keeps the policy function signature extensible via `ctx` so later we can add:
 * - GraphPermissionGrant (per-user sharing / ACLs)
 * - team membership
 * - run tokens
 * - moderator role
 * - run result visibility
 * 
 * e.g.
 * grantSubjects?: ...
 * runToken?: ...
 */
export type GraphAccessContext = {
  // Reserved for future expansion
};

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Central authorization policy for graph access.
 * 
 * All route handlers should use this function rather than implementing
 * their own authorization checks.
 * 
 * @param user - The current user (null for anonymous/unauthenticated)
 * @param graph - The graph being accessed
 * @param ctx - Future-extensible context for additional permissions
 * @returns The capabilities the user has for this graph
 */
export function getGraphCapabilities(args: {
  user: AuthUser | null;
  graph: Graph;
  ctx?: GraphAccessContext;
}): GraphCapabilities {
  const { user, graph } = args;

  // Default: no access
  let canView = false;
  let canEdit = false;
  let canRun = false;

  // 1. Admin override: admins can do everything
  if (user?.role === 'admin') {
    return { canView: true, canEdit: true, canRun: true };
  }

  // 2. Owner: full access
  if (user && user.id === graph.ownerId) {
    return { canView: true, canEdit: true, canRun: true };
  }

  // 3. Public view (unlisted or listed with public_view_enabled)
  if (graph.publicViewEnabled && (graph.visibility === 'listed' || graph.visibility === 'unlisted')) {
    canView = true;
  }

  // 4. Public run (unlisted or listed with public_run_enabled)
  if (graph.publicRunEnabled && (graph.visibility === 'listed' || graph.visibility === 'unlisted')) {
    canRun = true;
  }

  // 5. Edit is never granted publicly (already false by default)

  // 6. canEdit implies canView (not applicable here since edit is false for public)
  if (canEdit) {
    canView = true;
  }

  return { canView, canEdit, canRun };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the effective role for a user.
 * Returns 'normal' if user is null or has no role set.
 */
export function getUserRole(user: AuthUser | null): UserRole {
  if (user?.role === 'admin') {
    return 'admin';
  }
  return 'normal';
}

/**
 * Check if a user is an admin.
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

