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

export interface PublishResult {
  release_version: string;
  published: number;
  replayed: boolean;
}

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
