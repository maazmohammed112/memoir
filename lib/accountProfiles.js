export const ACCOUNT_PROFILES = Object.freeze([
  Object.freeze({ code: '2002', uid: 'uQE6xqhWhQWhOlGmfT2br5HnCEq2', email: 'maaz@memo.com', name: 'Maaz', initials: 'MM' }),
  Object.freeze({ code: '2005', uid: 'GQ4lxeAWoPTlyJ4W1jxU8bxk6qS2', email: 'deepti@memo.com', name: 'Deepti', initials: 'DM' }),
]);

export function accountProfileByCode(code) {
  const normalized = String(code || '').replace(/\D/g, '');
  return ACCOUNT_PROFILES.find(profile => profile.code === normalized) || null;
}

export function accountProfileByUid(uid) {
  return ACCOUNT_PROFILES.find(profile => profile.uid === String(uid || '')) || null;
}

export function accountProfileByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return ACCOUNT_PROFILES.find(profile => profile.email === normalized) || null;
}

export function profileMatchesUser(profile, user) {
  return Boolean(profile && user
    && profile.uid === String(user.uid || '')
    && profile.email === String(user.email || '').trim().toLowerCase());
}
