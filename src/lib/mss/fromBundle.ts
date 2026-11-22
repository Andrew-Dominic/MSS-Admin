// Rebuilds an editable source record from one item of the app's catalogue
// bundle (scheme_catalog.json). The API builds that item from the published
// rows (mss-backend src/schemes/catalog.js, project()); this is the reverse, so
// that schemes which never went through an admin draft can still be edited.
//
// What the bundle can't give back: research/verification notes, the original
// state text (rebuilt from the scope), document groups outside English, and
// documents_basis / apply_url_basis / procedure_checked_on. None of these are
// stored in the published rows either, except the three application details.
// Values that only the catalogue supplement fills in show up as normal text.
import type { SchemeRecord } from "./types";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
/** The bundle joins every list with "\n"; "" means empty or missing. */
const lines = (v: unknown): string[] | null => (typeof v === "string" ? (v === "" ? [] : v.split("\n")) : null);
/** Document names: plain strings, or rich supplement objects with `name.<lang>`. */
const docNames = (v: unknown, lang: string): string[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((d) => (typeof d === "string" ? d : str(obj(obj(d).name)[lang]) ?? str(obj(d).name)))
    .filter((x): x is string => !!x);
  return out.length ? out : null;
};

/** State codes (lower case) and names, as in mss-backend src/schemes/states.js. */
const STATES: Record<string, string> = {
  an: "Andaman and Nicobar Islands", ap: "Andhra Pradesh", ar: "Arunachal Pradesh", as: "Assam",
  br: "Bihar", ch: "Chandigarh", cg: "Chhattisgarh", dn: "Dadra and Nagar Haveli and Daman and Diu",
  dl: "Delhi", ga: "Goa", gj: "Gujarat", hr: "Haryana", hp: "Himachal Pradesh", jk: "Jammu and Kashmir",
  jh: "Jharkhand", ka: "Karnataka", kl: "Kerala", la: "Ladakh", ld: "Lakshadweep", mp: "Madhya Pradesh",
  mh: "Maharashtra", mn: "Manipur", ml: "Meghalaya", mz: "Mizoram", nl: "Nagaland", od: "Odisha",
  py: "Puducherry", pb: "Punjab", rj: "Rajasthan", sk: "Sikkim", tn: "Tamil Nadu", ts: "Telangana",
  tr: "Tripura", up: "Uttar Pradesh", uk: "Uttarakhand", wb: "West Bengal",
};

export function recordFromBundle(item: unknown): SchemeRecord | null {
  const b = obj(item);
  const identity = obj(b.identity);
  const content = obj(b.content);
  const loc = obj(b.localization);
  const en = obj(loc.en);
  const id = str(identity.id);
  const gov = obj(obj(content.classification).government);
  const level = str(gov.level) as SchemeRecord["level"] | null;
  if (!id || !level || !str(en.name)) return null;

  const langs = Object.keys(loc);
  const each = <T>(f: (l: Obj, lang: string) => T) => Object.fromEntries(langs.map((lang) => [lang, f(obj(loc[lang]), lang)]));

  // Scope: the bundle has the state codes ("IN-TN"); the source has a state text.
  const codes = (strings(gov.states) ?? []).map((s) => s.replace(/^IN-/, "").toLowerCase());
  let state: string;
  let geographic_scope: { kind: "states"; states: string[] } | undefined;
  if (gov.appliesNationally === true || !codes.length) state = "All India";
  else if (codes.length === 1 && level !== "central") state = STATES[codes[0]] ?? str(gov.statesText) ?? codes[0];
  else {
    state = str(gov.statesText) ?? codes.join(", ");
    geographic_scope = { kind: "states", states: codes };
  }

  const ap = obj(content.applicationProcess);
  const res = obj(content.resources);

  // English documents keep their groups in requiredDocuments[].remarks.
  const required = Array.isArray(content.requiredDocuments) ? content.requiredDocuments.map(obj) : [];
  let documents: unknown = docNames(en.documents, "en");
  if (required.length && required.every((d) => typeof d.name === "string" && typeof d.remarks === "string")) {
    const groups: Record<string, string[]> = {};
    for (const d of required) (groups[d.remarks as string] ??= []).push(d.name as string);
    documents = groups;
  }

  const how: Obj = {
    application_status: str(ap.applicationStatus) ?? "unknown",
    procedure_type: ap.procedureType ?? null,
    status_checked_on: ap.statusCheckedOn ?? null,
    mode: str(en.mode),
    steps: each((l) => lines(l.applicationText)),
    documents,
    notes: strings(en.notes),
    apply_url: str(ap.onlineUrl),
    info_url: str(res.officialWebsiteUrl),
    guidelines_url: str(res.guidelinesPdfUrl),
    portal: str(ap.portal),
    fees: str(ap.applicationFeeText),
    deadline: ap.deadline ?? null,
    prerequisite: ap.prerequisite ?? null,
  };
  const translations: Record<string, Obj> = {};
  for (const lang of langs) {
    if (lang === "en") continue;
    const l = obj(loc[lang]);
    how[`notes_${lang}`] = strings(l.notes);
    how[`documents_${lang}`] = docNames(l.documents, lang);
    translations[lang] = {
      authority: str(l.authority),
      category: str(l.category),
      status: { note: str(l.statusNote) },
      how_to_apply: { mode: str(l.mode) },
      contacts: { address: str(obj(l.contacts).address) },
      alt_names: strings(l.altNames),
    };
  }

  const c = obj(content.contacts);
  const address = str(obj(en.contacts).address);
  const contacts = content.contacts || address ? { email: str(c.email), phone: str(c.phone), address } : null;
  const alias = (Array.isArray(identity.legacyCodes) ? identity.legacyCodes : [])
    .map(obj)
    .find((x) => x.system === "scheme_alias");
  const related = (Array.isArray(obj(b.relationships).references) ? (obj(b.relationships).references as unknown[]) : [])
    .map((r) => str(obj(r).targetId))
    .filter((x): x is string => !!x);

  return {
    id,
    level,
    state,
    ...(geographic_scope ? { geographic_scope } : {}),
    name: each((l) => str(l.name)),
    short_name: each((l) => str(l.shortName)),
    alt_names: strings(en.altNames) ?? [],
    authority: str(en.authority),
    category: str(en.category) ?? str(obj(content.classification).schemeTypeText),
    status: {
      value: str(identity.status) ?? "unknown",
      note: str(en.statusNote),
      as_of: (obj(content.status).asOf as string | null) ?? null,
    },
    description: each((l) => lines(l.description)) as SchemeRecord["description"],
    benefits: each((l) => lines(l.benefitsText)) as SchemeRecord["benefits"],
    eligibility: each((l) => lines(l.eligibilityText)) as SchemeRecord["eligibility"],
    how_to_apply: how as SchemeRecord["how_to_apply"],
    contacts,
    benefit_facts: content.benefitFacts ?? null,
    related_ids: related,
    ...(alias && str(alias.code) ? { source_scheme_id: alias.code as string } : {}),
    translations,
  };
}
