export const passwordExpirySettingKey = "password_expiry_days";
export const defaultPasswordExpiryDays = 90;

export function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parsePasswordExpiryDays(value?: string | null) {
  const days = Number(value ?? defaultPasswordExpiryDays);
  return Number.isInteger(days) && days >= 0 && days <= 3650 ? days : defaultPasswordExpiryDays;
}

export function passwordChangeRequired(input: { passwordChangedAt?: Date | null; passwordResetRequired?: boolean | null }, expiryDays: number) {
  if (input.passwordResetRequired) return true;
  if (!expiryDays || !input.passwordChangedAt) return false;
  return Date.now() - input.passwordChangedAt.getTime() >= expiryDays * 24 * 60 * 60 * 1000;
}
