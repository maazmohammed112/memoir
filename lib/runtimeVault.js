const vaults = new Map();
const actionQueues = new Map();
const deliveredReminders = new Map();

function ownerVault(uid) {
  if (!vaults.has(uid)) vaults.set(uid, new Map());
  return vaults.get(uid);
}

export function putRuntimeItem(uid, item) {
  if (!uid || !item?.id) return;
  ownerVault(uid).set(item.id, structuredClone(item));
}

export function removeRuntimeItem(uid, id) { ownerVault(uid).delete(id); }
export function listRuntimeItems(uid) { return [...ownerVault(uid).values()].map(item => structuredClone(item)); }
export const getRuntimeItems = listRuntimeItems;

export function replaceRuntimeItems(uid, items) {
  const vault = ownerVault(uid); vault.clear();
  (Array.isArray(items) ? items : []).forEach(item => { if (item?.id) vault.set(item.id, structuredClone(item)); });
}

export function queueRuntimeActions(uid, actions, source = 'telegram') {
  if (!actionQueues.has(uid)) actionQueues.set(uid, []);
  const queued = (Array.isArray(actions) ? actions : []).map(action => ({
    queueId: crypto.randomUUID(), source, createdAt: Date.now(), action: structuredClone(action),
  }));
  actionQueues.get(uid).push(...queued);
  return queued;
}

export function pullRuntimeActions(uid) { return (actionQueues.get(uid) || []).map(item => structuredClone(item)); }
export function acknowledgeRuntimeActions(uid, ids) {
  const acknowledged = new Set(Array.isArray(ids) ? ids : []);
  actionQueues.set(uid, (actionQueues.get(uid) || []).filter(item => !acknowledged.has(item.queueId)));
}

export function reminderWasDelivered(key) { return deliveredReminders.has(key); }
export function markReminderDelivered(key, deliveredAt = Date.now()) { deliveredReminders.set(key, deliveredAt); }
