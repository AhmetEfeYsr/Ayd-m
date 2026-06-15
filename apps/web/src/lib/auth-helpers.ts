/**
 * Generates a prefixed email address for Firebase Auth to prevent multi-tenant/multi-role conflicts.
 * Format: [cleanTenantId]_[cleanRole]_[localPart]@[domain]
 */
export function getFirebaseEmail(email: string, tenantId: string | null, role: string): string {
  if (!email) return email;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  
  const [localPart, domain] = parts;
  const cleanTenantId = tenantId ? tenantId.replace(/-/g, '').toLowerCase() : 'global';
  const cleanRole = role.toLowerCase();
  
  return `${cleanTenantId}_${cleanRole}_${localPart}@${domain}`;
}

/**
 * Extracts the real email address from a prefixed Firebase email.
 */
export function getRealEmail(prefixedEmail: string): string {
  if (!prefixedEmail) return prefixedEmail;
  const parts = prefixedEmail.split('@');
  if (parts.length !== 2) return prefixedEmail;
  
  const [prefixedLocalPart, domain] = parts;
  const subParts = prefixedLocalPart.split('_');
  if (subParts.length < 3) return prefixedEmail; // Not prefixed
  
  const realLocalPart = subParts.slice(2).join('_');
  return `${realLocalPart}@${domain}`;
}
