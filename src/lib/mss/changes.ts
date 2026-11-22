import type { Collection, NotificationType, SchemeRecord } from "./types";

// Human summary of what a draft changes compared with the live scheme, used
// to prefill the "scheme updated" notification.

/** Keys that only describe how a record was made, not what users see. */
const META_KEYS = new Set(["translation_meta", "name_source", "_meta", "meta", "source_meta", "last_verified", "verified_at", "updated_at"]);
const OTHER_LANGS = ["hi", "ta", "mr"];

/** null, "", [] and {} all mean "not set". */
function norm(v: unknown): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() === "" ? undefined : v.trim();
  if (Array.isArray(v)) {
    const a = v.map(norm).filter((x) => x !== undefined);
    return a.length ? a : undefined;
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      if (META_KEYS.has(k)) continue;
      const x = norm((v as Record<string, unknown>)[k]);
      if (x !== undefined) out[k] = x;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const get = (o: unknown, k: string): unknown => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined);
const omit = (o: unknown, keys: string[]): unknown => {
  if (!o || typeof o !== "object") return o;
  const c = { ...(o as Record<string, unknown>) };
  keys.forEach((k) => delete c[k]);
  return c;
};

/** Localized field: English change → [label]; another language → Translations. */
function localized(a: unknown, b: unknown, label: string, out: Set<string>) {
  if (!same(get(a, "en"), get(b, "en"))) out.add(label);
  if (OTHER_LANGS.some((l) => !same(get(a, l), get(b, l)))) out.add("Translations");
}

const HOW_TO_APPLY: [string, string][] = [
  ["documents", "Documents"],
  ["apply_url", "Apply link"],
  ["info_url", "Information link"],
  ["deadline", "Deadline"],
  ["fees", "Fees"],
  ["application_status", "Application status"],
];

const TOP: [string, string][] = [
  ["status", "Scheme status/note"],
  ["authority", "Authority"],
  ["category", "Category"],
  ["benefit_facts", "Benefit amounts"],
];

/** Labels of the user-visible fields that differ between the live scheme and the draft. */
export function changedFields(live: SchemeRecord, draft: SchemeRecord): string[] {
  const out = new Set<string>();
  localized(live.name, draft.name, "Name", out);
  localized(live.short_name, draft.short_name, "Short name", out);
  localized(live.description, draft.description, "Description", out);
  localized(live.benefits, draft.benefits, "Benefits", out);
  localized(live.eligibility, draft.eligibility, "Eligibility", out);
  const ha = live.how_to_apply, hb = draft.how_to_apply;
  localized(get(ha, "steps"), get(hb, "steps"), "How to apply steps", out);
  for (const [k, label] of HOW_TO_APPLY) if (!same(get(ha, k), get(hb, k))) out.add(label);
  for (const [k, label] of TOP) if (!same(get(live, k), get(draft, k))) out.add(label);
  if (!same(get(live, "translations"), get(draft, "translations")) || !same(get(live, "localization"), get(draft, "localization"))) out.add("Translations");

  // Anything else that changed (mode, portal, notes, related schemes, ...).
  const known = ["id", "name", "short_name", "description", "benefits", "eligibility", "how_to_apply", "translations", "localization", ...TOP.map(([k]) => k)];
  const restHa = ["steps", ...HOW_TO_APPLY.map(([k]) => k)];
  if (!same(omit(live, known), omit(draft, known)) || !same(omit(ha, restHa), omit(hb, restHa))) out.add("Other details");
  return [...out];
}

export interface NotificationDraft {
  title: string;
  message: string;
  type: NotificationType;
  /** Who gets it: everyone, or the users in one state. */
  audienceLabel: string;
}

/** API state codes for a collection's audience; empty = everyone. */
export function audienceStates(collection: Collection | null | undefined): string[] {
  if (collection === "tamil_nadu") return ["tn"];
  if (collection === "maharashtra") return ["mh"];
  return [];
}

export function audienceLabel(collection: Collection | null | undefined): string {
  if (collection === "tamil_nadu") return "Users in Tamil Nadu";
  if (collection === "maharashtra") return "Users in Maharashtra";
  return "All users";
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);

/** Default notification for publishing [name]; [changes] is null for a brand-new scheme. */
export function defaultNotification(name: string, changes: string[] | null, collection: Collection | null | undefined): NotificationDraft {
  if (!changes) {
    return {
      title: clip(`New scheme: ${name}`, 200),
      message: `${name} is now in the MSS app. Open the app to see the details and how to apply.`,
      type: "new_schemes",
      audienceLabel: audienceLabel(collection),
    };
  }
  return {
    title: clip(`Scheme updated: ${name}`, 200),
    message: `Updated: ${changes.length ? changes.join(", ") : "scheme details"}. Open the MSS app to see the latest details.`,
    type: "updates",
    audienceLabel: audienceLabel(collection),
  };
}
