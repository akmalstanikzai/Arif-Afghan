import { translate } from './translations.js';
export function getUserDisplayName(user) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  return typeof name === 'string' && name.trim()
    ? name.trim()
    : user.email?.split('@')[0] || translate("Staff member");
}
