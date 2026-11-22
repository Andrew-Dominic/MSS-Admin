// Shapes of the MSS admin scheme API (API_DOCUMENTATION.txt, entries 03-12, 40).

export type Collection = "central" | "tamil_nadu" | "maharashtra";
export const COLLECTIONS: { value: Collection; label: string; idPrefix: string }[] = [
  { value: "central", label: "Central (All India)", idPrefix: "CEN2026-" },
  { value: "tamil_nadu", label: "Tamil Nadu", idPrefix: "TN2026-" },
  { value: "maharashtra", label: "Maharashtra", idPrefix: "MAH2026-" },
];

export type DraftStatus = "draft" | "approved" | "published" | "discarded";
export type DraftAction = "upsert" | "withdraw";

/** Localized text keyed by language code ("en" required for names). */
export type Localized<T> = Partial<Record<"en" | "hi" | "ta" | "mr", T>>;

/**
 * A scheme in the original master/app dataset format. Only the fields the
 * editor understands are typed; everything else is preserved untouched.
 */
export interface SchemeRecord {
  id: string;
  level?: "central" | "state" | "central_state";
  state?: string;
  name?: Localized<string | null>;
  short_name?: Localized<string | null>;
  authority?: string | null;
  category?: string | null;
  status?: { value?: string; note?: string | null; as_of?: string | null };
  description?: Localized<string[]>;
  benefits?: Localized<string[]>;
  eligibility?: Localized<string[]>;
  how_to_apply?: {
    application_status?: string;
    mode?: string | null;
    steps?: Localized<string[]>;
    documents?: unknown;
    notes?: string[] | null;
    apply_url?: string | null;
    info_url?: string | null;
    guidelines_url?: string | null;
    portal?: string | null;
    fees?: string | null;
    deadline?: string | null;
    prerequisite?: string | null;
    [k: string]: unknown;
  };
  related_ids?: string[];
  [k: string]: unknown;
}

export interface DraftPayload {
  id: string;
  collection: Collection;
  level: string;
  source_state: string | null;
  scope_kind: string;
  scope_states: string[];
  scheme_status: string;
  application_status: string;
  category: string | null;
  localizations: { language: string; content: { name?: string; [k: string]: unknown } }[];
  raw?: SchemeRecord;
  [k: string]: unknown;
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  event: string;
  version: number;
  created_at: string;
}

export interface Draft {
  id: string;
  scheme_id: string;
  version: number;
  action: DraftAction;
  status: DraftStatus;
  payload: DraftPayload | null;
  base_hash?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
  audit?: AuditEvent[];
}

export interface UploadPreview {
  upload_id: string;
  valid: boolean;
  mode: string;
  new: string[];
  changed: string[];
  unchanged: string[];
  invalid: { id?: string; code?: string; [k: string]: unknown }[];
  proposed_withdrawals: string[];
  replayed: boolean;
}

export interface ReleaseInfo {
  release_version: string;
  schema_version: number;
  published_at: string;
}

export interface BroadcastReceipt {
  broadcast_id: string;
  recipients: number;
  created_at: string;
}

export interface PublishResult {
  release_version: string;
  published: number;
  replayed: boolean;
  /** Present when published with `notify: true`; null for withdrawals-only releases. */
  broadcast?: BroadcastReceipt | null;
}

export type NotificationType = "new_schemes" | "reminders" | "updates" | "profile";
export const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: "new_schemes", label: "New schemes" },
  { value: "updates", label: "Updates" },
  { value: "reminders", label: "Reminders" },
  { value: "profile", label: "Profile" },
];

export type BroadcastLanguage = "en" | "ta" | "hi" | "mr";
export const BROADCAST_LANGUAGES: { value: BroadcastLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ta", label: "Tamil" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
];

export interface BroadcastProgress {
  broadcast_id: string;
  recipients: number;
  delivered: number;
  failed: number;
  status: "queued" | "processing" | "completed" | "completed_with_errors";
}

/**
 * The API's internal state codes: lower-case ISO 3166-2:IN subdivision codes,
 * the same 36 the app stores (frontend indian_states.dart).
 */
export const STATES: { code: string; name: string }[] = [
  { code: "an", name: "Andaman and Nicobar Islands" },
  { code: "ap", name: "Andhra Pradesh" },
  { code: "ar", name: "Arunachal Pradesh" },
  { code: "as", name: "Assam" },
  { code: "br", name: "Bihar" },
  { code: "ch", name: "Chandigarh" },
  { code: "ct", name: "Chhattisgarh" },
  { code: "dh", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "dl", name: "Delhi" },
  { code: "ga", name: "Goa" },
  { code: "gj", name: "Gujarat" },
  { code: "hp", name: "Himachal Pradesh" },
  { code: "hr", name: "Haryana" },
  { code: "jh", name: "Jharkhand" },
  { code: "jk", name: "Jammu and Kashmir" },
  { code: "ka", name: "Karnataka" },
  { code: "kl", name: "Kerala" },
  { code: "la", name: "Ladakh" },
  { code: "ld", name: "Lakshadweep" },
  { code: "mh", name: "Maharashtra" },
  { code: "ml", name: "Meghalaya" },
  { code: "mn", name: "Manipur" },
  { code: "mp", name: "Madhya Pradesh" },
  { code: "mz", name: "Mizoram" },
  { code: "nl", name: "Nagaland" },
  { code: "od", name: "Odisha" },
  { code: "pb", name: "Punjab" },
  { code: "py", name: "Puducherry" },
  { code: "rj", name: "Rajasthan" },
  { code: "sk", name: "Sikkim" },
  { code: "tg", name: "Telangana" },
  { code: "tn", name: "Tamil Nadu" },
  { code: "tr", name: "Tripura" },
  { code: "uk", name: "Uttarakhand" },
  { code: "up", name: "Uttar Pradesh" },
  { code: "wb", name: "West Bengal" },
];

export function draftName(d: Draft): string {
  const en = d.payload?.localizations?.find((l) => l.language === "en")?.content?.name;
  return en || (d.payload?.raw?.name?.en ?? "") || d.scheme_id;
}

export function collectionForId(id: string): Collection | null {
  if (/^CEN2026-/i.test(id)) return "central";
  if (/^TN2026-/i.test(id)) return "tamil_nadu";
  if (/^(MAH|MAHUSR|MAHWEB)2026-/i.test(id)) return "maharashtra";
  return null;
}

/** Canonical record ID rule from the API docs. */
export const SCHEME_ID_PATTERN = /^(CEN|TN|MAH|MAHUSR|MAHWEB)2026-\d{3}$/;
