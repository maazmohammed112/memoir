export const PRIVATE_TOKEN_PATTERN = /\[\[PRIVATE_(\d+)\]\]/g;

export function hasPrivateToken(value) {
  PRIVATE_TOKEN_PATTERN.lastIndex = 0;
  return PRIVATE_TOKEN_PATTERN.test(String(value ?? ''));
}

export function restorePrivateTokens(value, privateValues = {}) {
  const unresolved = [];
  const restored = String(value ?? '').replace(PRIVATE_TOKEN_PATTERN, token => {
    if (Object.prototype.hasOwnProperty.call(privateValues, token)) return String(privateValues[token]);
    unresolved.push(token);
    return token;
  });
  return { value: restored, unresolved };
}

export function cleanLegacyPrivateValue(value, fallback = '') {
  const text = String(value ?? '');
  if (!hasPrivateToken(text)) return text;
  const safeFallback = String(fallback ?? '');
  if (safeFallback && !hasPrivateToken(safeFallback)) return safeFallback;
  return '';
}

export function sanitizeAssistantAction(action, privateValues = {}, existingItem = null) {
  if (!action || !['create', 'update', 'delete'].includes(action.op)) return null;
  const restoreText = (value, fallback = '') => {
    const restored = restorePrivateTokens(value, privateValues);
    if (restored.unresolved.length) return cleanLegacyPrivateValue(fallback);
    return restored.value;
  };
  const existingFields = existingItem?.fields || {};
  const fields = {};
  for (const [rawLabel, rawValue] of Object.entries(action.fields || {})) {
    const labelResult = restorePrivateTokens(rawLabel, privateValues);
    if (labelResult.unresolved.length) continue;
    const label = labelResult.value.trim().slice(0, 100);
    if (!label) continue;
    const previous = existingFields[label] ?? Object.entries(existingFields).find(([key]) => key.toLowerCase() === label.toLowerCase())?.[1] ?? '';
    const valueResult = restorePrivateTokens(rawValue, privateValues);
    if (valueResult.unresolved.length) {
      if (action.op === 'update' && previous !== '' && !hasPrivateToken(previous)) fields[label] = String(previous).slice(0, 4000);
      continue;
    }
    if (hasPrivateToken(valueResult.value)) continue;
    fields[label] = valueResult.value.slice(0, 4000);
  }
  return {
    op: action.op,
    id: String(action.id || ''),
    type: restoreText(action.type, existingItem?.type || '').slice(0, 40),
    title: restoreText(action.title, existingItem?.title || '').slice(0, 160),
    note: restoreText(action.note, existingItem?.note || '').slice(0, 2000),
    fields,
  };
}

export function preferCleanVaultItem(current, candidate) {
  if (!current) return candidate;
  if (!candidate) return current;
  const newer = Number(candidate.updatedAt || 0) >= Number(current.updatedAt || 0) ? candidate : current;
  const older = newer === candidate ? current : candidate;
  const fields = { ...(newer.fields || {}) };
  for (const [label, value] of Object.entries(older.fields || {})) {
    if (!(label in fields) || (hasPrivateToken(fields[label]) && !hasPrivateToken(value))) fields[label] = value;
  }
  return { ...newer, fields };
}

/**
 * Remove any field whose value still contains a [[PRIVATE_N]] placeholder token.
 * Call this as the last safety net before writing to IndexedDB or cloud storage.
 * Returns a new fields object with corrupted entries removed.
 */
export function stripCorruptedFields(fields) {
  if (!fields || typeof fields !== 'object') return {};
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => !hasPrivateToken(value))
  );
}

/**
 * Apply stripCorruptedFields to a complete item record.
 * Returns a new item object; does not mutate the original.
 */
export function sanitizeItemFields(item) {
  if (!item) return item;
  return { ...item, fields: stripCorruptedFields(item.fields || {}) };
}

