import type {
  CommandContext,
  FluxerCommandGuard,
  FluxerGuardDecision,
  FluxerPermissionPolicy
} from "./types.js";

function includes(values: string[] | undefined, value: string): boolean {
  return values?.includes(value) ?? false;
}

export function evaluatePermissionPolicy(
  context: CommandContext,
  policy: FluxerPermissionPolicy
): Promise<FluxerGuardDecision> | FluxerGuardDecision {
  const deniedReason = policy.reason ?? "You do not have permission to use this command.";

  if (includes(policy.denyUserIds, context.message.author.id)) {
    return { allowed: false, reason: deniedReason };
  }

  if (includes(policy.denyChannelIds, context.message.channel.id)) {
    return { allowed: false, reason: deniedReason };
  }

  if (policy.denyChannelTypes?.includes(context.message.channel.type)) {
    return { allowed: false, reason: deniedReason };
  }

  if (policy.allowUserIds && !includes(policy.allowUserIds, context.message.author.id)) {
    return { allowed: false, reason: deniedReason };
  }

  if (policy.allowChannelIds && !includes(policy.allowChannelIds, context.message.channel.id)) {
    return { allowed: false, reason: deniedReason };
  }

  if (
    policy.allowChannelTypes &&
    !policy.allowChannelTypes.includes(context.message.channel.type)
  ) {
    return { allowed: false, reason: deniedReason };
  }

  if (!policy.predicate) {
    return { allowed: true };
  }

  const result = policy.predicate(context);
  if (result instanceof Promise) {
    return result.then((allowed) => ({
      allowed,
      reason: allowed ? undefined : deniedReason
    }));
  }

  return {
    allowed: result,
    reason: result ? undefined : deniedReason
  };
}

export function createPermissionGuard(policy: FluxerPermissionPolicy): FluxerCommandGuard {
  return async (context) => evaluatePermissionPolicy(context, policy);
}
