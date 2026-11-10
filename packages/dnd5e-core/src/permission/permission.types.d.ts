/**
 * Carry an explicit permission decision and optional explanation for a caller-owned permission workflow.
 *
 * @example
 * const result: PermissionCheckResult = { allowed: false, reason: 'Owner access required' };
 */
export interface PermissionCheckResult {
    // boolean-name-exempt: Preserve the existing public result contract for consumers.
    allowed: boolean;
    reason?: string;
}
/**
 * Represent the highest effective actor ownership relation using familiar native permission tiers.
 *
 * @example
 * const relation: ActorUserRelation = PermissionUtils.getUserRelation(user, actor);
 */
export type ActorUserRelation = 'owner' | 'observer' | 'limited' | 'none';
