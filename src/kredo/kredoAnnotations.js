/**
 * KREDO — Smart Merchant Annotation & Memory Engine
 * Remembers merchant-level annotations (e.g. "chips" for Blinkit/Swiggy)
 * and automatically applies them to all existing and future transactions.
 */

const ANNOTATIONS_STORAGE_KEY = 'kredo_merchant_annotations_v1';
const TX_ANNOTATION_OVERRIDES_KEY = 'kredo_tx_annotation_overrides_v1';

/**
 * Normalizes merchant name for fuzzy matching
 */
export function normalizeMerchantKey(merchantName = '') {
  if (!merchantName) return '';
  return String(merchantName)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Gets all saved merchant annotation rules
 * @returns {Record<string, { annotation: string, updatedAt: number, originalMerchant: string }>}
 */
export function getMerchantAnnotations() {
  try {
    const raw = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to load merchant annotations:', e);
    return {};
  }
}

/**
 * Gets annotation tag for a merchant name
 * @returns {string}
 */
export function getMerchantAnnotation(merchantName) {
  if (!merchantName) return '';
  const key = normalizeMerchantKey(merchantName);
  const current = getMerchantAnnotations();
  if (current[key]) return current[key].annotation;
  return '';
}

/**
 * Saves or updates a merchant annotation rule
 */
export function setMerchantAnnotation(merchantName, annotation) {
  if (!merchantName) return null;
  const key = normalizeMerchantKey(merchantName);
  if (!key) return null;

  const current = getMerchantAnnotations();
  const cleanAnnotation = String(annotation || '').trim();

  if (cleanAnnotation) {
    current[key] = {
      annotation: cleanAnnotation,
      originalMerchant: merchantName.trim(),
      updatedAt: Date.now(),
    };
  } else {
    delete current[key];
  }

  try {
    localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save merchant annotation:', e);
  }

  return current[key] || null;
}

/**
 * Removes a merchant annotation rule
 */
export function removeMerchantAnnotation(merchantName) {
  if (!merchantName) return false;
  const key = normalizeMerchantKey(merchantName);
  const current = getMerchantAnnotations();
  if (current[key]) {
    delete current[key];
    try {
      localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to delete merchant annotation:', e);
    }
    return true;
  }
  return false;
}

/**
 * Gets individual transaction-level annotation overrides
 */
export function getTransactionAnnotationOverrides() {
  try {
    const raw = localStorage.getItem(TX_ANNOTATION_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Sets individual transaction annotation override
 */
export function setTransactionAnnotationOverride(txId, annotation, options = {}) {
  if (!txId) return;
  const current = getTransactionAnnotationOverrides();
  const clean = String(annotation || '').trim();
  if (clean) {
    current[txId] = clean;
  } else if (options.suppressInherited === true) {
    // An explicit empty override means "no tag for this transaction" and
    // prevents a fuzzy merchant-memory rule from immediately reapplying it.
    current[txId] = '';
  } else {
    delete current[txId];
  }
  try {
    localStorage.setItem(TX_ANNOTATION_OVERRIDES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save transaction annotation override:', e);
  }
}

/** Removes a visible transaction tag, optionally suppressing inherited memory. */
export function removeTransactionAnnotation(txId, suppressInherited = true) {
  if (!txId) return false;
  setTransactionAnnotationOverride(txId, '', { suppressInherited });
  return true;
}

/**
 * Resolves the effective annotation for a transaction
 * Priority: 1. Direct TX override -> 2. Merchant Memory Rule -> 3. tx.annotation field
 */
export function resolveTransactionAnnotation(tx) {
  if (!tx) return '';
  const txOverrides = getTransactionAnnotationOverrides();
  if (tx.id && txOverrides[tx.id] !== undefined) {
    return txOverrides[tx.id];
  }

  const merchantRules = getMerchantAnnotations();
  const mKey = normalizeMerchantKey(tx.merchant || tx.title || '');
  
  if (mKey && merchantRules[mKey]) {
    return merchantRules[mKey].annotation;
  }

  // Substring fuzzy matching for common merchant variations (e.g., "Blinkit Instant" -> "blinkit")
  for (const [ruleKey, ruleVal] of Object.entries(merchantRules)) {
    if (mKey.includes(ruleKey) || ruleKey.includes(mKey)) {
      return ruleVal.annotation;
    }
  }

  return tx.annotation || '';
}

/**
 * Decorates an array of transactions with auto-resolved annotations
 */
export function attachAnnotationsToTransactions(transactions = []) {
  const merchantRules = getMerchantAnnotations();
  const txOverrides = getTransactionAnnotationOverrides();

  return transactions.map(tx => {
    if (!tx) return tx;
    let annotation = '';
    if (tx.id && txOverrides[tx.id] !== undefined) {
      annotation = txOverrides[tx.id];
    } else {
      const mKey = normalizeMerchantKey(tx.merchant || tx.title || '');
      if (mKey && merchantRules[mKey]) {
        annotation = merchantRules[mKey].annotation;
      } else {
        for (const [ruleKey, ruleVal] of Object.entries(merchantRules)) {
          if (mKey.includes(ruleKey) || ruleKey.includes(mKey)) {
            annotation = ruleVal.annotation;
            break;
          }
        }
      }
    }

    return {
      ...tx,
      annotation: annotation || tx.annotation || '',
    };
  });
}
