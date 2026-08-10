import { z } from "zod";
import { isValidPhoneNumber, parsePhoneNumberWithError } from "libphonenumber-js";

// Plain logic, no React/DOM — deliberately kept out of react.ts and exported
// from the main index instead, so packages/api (a Node backend with no JSX
// config) can use the exact same rule as the frontend forms without pulling
// in anything React-related.
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  try {
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
}

/**
 * Collapses any valid phone number down to a single canonical E.164 string
 * (e.g. "+92 307 2189005", "+92-307-2189005", and "+923072189005" all become
 * "+923072189005") — MUST be applied both when a phone is first stored
 * (register / admin create-or-edit) and again on every login lookup.
 * Phone/PIN login does an exact-string `findUnique({ where: { phone } })`;
 * without this, two logically-identical numbers typed with different
 * spacing/punctuation are different DB values and login fails with a
 * misleading "Invalid phone or PIN" (the actual root cause of a real
 * lockout — see the incident this comment documents). Falls back to the
 * trimmed raw input if it doesn't parse, so an already-invalid number still
 * surfaces through the normal isValidPhone/phoneNumberSchema check rather
 * than silently vanishing here.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  try {
    return parsePhoneNumberWithError(trimmed).number;
  } catch {
    return trimmed;
  }
}

const PHONE_ERROR = "Enter a valid phone number, including country code";

/** Required phone field, e.g. a booking's customerPhone. */
export const phoneNumberSchema = z.string().min(1, "Phone number is required").refine(isValidPhone, PHONE_ERROR);

/** Optional phone field that, when present, must still be a real number — an empty string/undefined passes. */
export const optionalPhoneNumberSchema = z
  .string()
  .optional()
  .refine((v) => !v || isValidPhone(v), PHONE_ERROR);

/** Same as optionalPhoneNumberSchema but for nullable DB columns (e.g. SiteSettings.whatsappNumber). */
export const nullableOptionalPhoneNumberSchema = z
  .string()
  .nullable()
  .optional()
  .refine((v) => !v || isValidPhone(v), PHONE_ERROR);
