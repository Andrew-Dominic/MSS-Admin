import { z } from "zod";

export const STATES = [
  "All India", "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
] as const;

export const EDUCATION_LEVELS = [
  "School / No formal education", "Diploma", "Undergraduate", "Postgraduate", "Vocational / ITI"
] as const;

// Aligned with Flutter app kSchemeTypeGroups (frontend/lib/models/scheme_filter.dart)
export const SCHEME_CATEGORIES = [
  "Loans & Credit",
  "Subsidies & Incentives",
  "Grants & Seed Funding",
  "Credit Guarantee",
  "Skill Development & Training",
  "Market Linkage & Export",
  "Infrastructure & Technology",
  "Special Welfare & Assistance"
] as const;

// Aligned with Flutter app enterprise classification
export const ENTERPRISE_SCALES = [
  "Micro",
  "Small",
  "Medium"
] as const;

// Aligned with Flutter app kBeneficiaryOptions (frontend/lib/models/scheme_filter.dart)
export const DEMOGRAPHIC_TAGS = [
  "Women",
  "SC",
  "ST",
  "Differently-abled",
  "Minority",
  "Transgender",
  "Ex-servicemen",
  "General / All"
] as const;

// Aligned with Flutter app benefitTypesList
export const BENEFIT_TYPES = [
  "Capital Subsidy",
  "Term Loan",
  "Working Capital Loan",
  "Credit Guarantee",
  "Interest Subvention",
  "Seed Grant",
  "Margin Money Assistance",
  "Direct Benefit Transfer"
] as const;

export const APPLICATION_MODES = [
  "Online Portal",
  "In-Person / Physical Office",
  "Hybrid (Online + Physical)"
] as const;

export const schemeFormSchema = z.object({
  // Step 1: General Info & Governance
  title: z.string().min(2, "Title is required"),
  code: z.string().min(2, "Code is required (e.g. MSME2526-099 or SCH000256)"),
  category: z.enum(SCHEME_CATEGORIES),
  sponsoringAuthority: z.string().min(2, "Authority or Department is required"),
  ministry: z.string().default("Ministry of Micro, Small & Medium Enterprises"),
  implementingAgency: z.string().optional(),
  targetState: z.enum(STATES).default("All India"),
  isCentral: z.boolean().default(true),
  schemeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  applicationMode: z.enum(APPLICATION_MODES).default("Online Portal"),

  // Step 2: MSME Eligibility Rules
  minAge: z.coerce.number().min(0).max(120).optional(),
  maxAge: z.coerce.number().min(0).max(120).optional(),
  genderTarget: z.enum(["All", "Male", "Female", "Transgender"]).default("All"),
  educationLevel: z.array(z.enum(EDUCATION_LEVELS)).default([]),
  enterpriseScales: z.array(z.enum(ENTERPRISE_SCALES)).default(["Micro", "Small", "Medium"]),
  demographicTags: z.array(z.enum(DEMOGRAPHIC_TAGS)).default([]),
  turnoverCapInr: z.coerce.number().min(0).optional(),
  investmentCapInr: z.coerce.number().min(0).optional(),

  // Step 3: Financial & Subsidy Benefits
  benefitType: z.enum(BENEFIT_TYPES).default("Capital Subsidy"),
  benefitAmountMin: z.coerce.number().min(0).optional(),
  benefitAmountMax: z.coerce.number().min(0).optional(),
  subsidyPercentage: z.coerce.number().min(0).max(100).optional(),
  benefitsSummary: z.string().optional(),

  // Step 4: Trilingual Localization (English, Tamil, Hindi)
  // English (en)
  summaryEn: z.string().min(5, "English summary is required before publishing (minimum 5 characters)"),
  descriptionEn: z.string().optional(),
  objectivesEn: z.string().optional(),
  
  // Tamil (ta)
  titleTa: z.string().optional(),
  summaryTa: z.string().optional(),
  descriptionTa: z.string().optional(),
  benefitsTa: z.string().optional(),

  // Hindi (hi)
  titleHi: z.string().optional(),
  summaryHi: z.string().optional(),
  descriptionHi: z.string().optional(),
  benefitsHi: z.string().optional(),

  // Step 5: Required Documents Checklist
  requiredDocuments: z.array(z.string()).default([
    "Aadhaar Card of Promoters",
    "Udyam Registration Certificate",
    "Detailed Project Report (DPR)",
    "Bank Account Statement (6 Months)"
  ]),
});

export type SchemeFormValues = z.infer<typeof schemeFormSchema>;

/**
 * Normalizes any category string to a canonical SCHEME_CATEGORIES value
 */
export function normalizeCategory(category?: string): string {
  if (!category) return "Subsidies & Incentives";
  if ((SCHEME_CATEGORIES as readonly string[]).includes(category as any)) {
    return category;
  }
  const catLower = category.toLowerCase();
  if (catLower.includes("loan") || catLower.includes("credit")) return "Loans & Credit";
  if (catLower.includes("subsidy") || catLower.includes("incentive")) return "Subsidies & Incentives";
  if (catLower.includes("grant") || catLower.includes("seed")) return "Grants & Seed Funding";
  if (catLower.includes("guarantee")) return "Credit Guarantee";
  if (catLower.includes("skill") || catLower.includes("train")) return "Skill Development & Training";
  if (catLower.includes("market") || catLower.includes("export")) return "Market Linkage & Export";
  if (catLower.includes("infra") || catLower.includes("tech")) return "Infrastructure & Technology";
  return "Subsidies & Incentives";
}

/**
 * Consistently resolves category across Dashboard, Schemes list, and Editor
 */
export function resolveSchemeCategory(schemeRecord?: any, profile?: any, ov?: any, dbSchemeType?: string): string {
  if (ov?.scheme_type) return normalizeCategory(ov.scheme_type);
  
  const classification = schemeRecord?.content?.classification || {};
  if (classification.schemeTypeText) return normalizeCategory(classification.schemeTypeText);
  if (classification.schemeType) return normalizeCategory(classification.schemeType);
  if (classification.categories && Array.isArray(classification.categories) && classification.categories[0]) {
    return normalizeCategory(classification.categories[0]);
  }
  if (dbSchemeType && dbSchemeType !== "General") return normalizeCategory(dbSchemeType);
  if (profile?.sector && profile.sector !== "General") return normalizeCategory(profile.sector);
  
  return "Subsidies & Incentives";
}

/**
 * Maps database catalog.scheme row and localized content into SchemeFormValues
 */
export function mapDbSchemeToFormValues(dbScheme: any, contentRows: any[] = []): SchemeFormValues {
  const rj = dbScheme.record_json || {};
  const content = rj.content || {};
  const gov = content.classification?.government || {};
  const overview = content.overview || {};
  const structured = content.eligibility?.structured || {};
  const benefits = content.benefits || {};
  const capSubsidy = benefits.capitalSubsidy || {};
  const loan = benefits.loan || {};
  const loc = content.localization || {};

  const enContent = contentRows.find((r) => r.lang === "en");
  const taContent = contentRows.find((r) => r.lang === "ta");
  const hiContent = contentRows.find((r) => r.lang === "hi");

  const rawState = dbScheme.state || gov.states?.[0] || gov.statesText || "All India";
  const targetState = (STATES as readonly string[]).includes(rawState) ? (rawState as any) : "All India";
  const isCentral = dbScheme.government_level === "central" || gov.level === "central" || targetState === "All India";

  const category: any = resolveSchemeCategory(rj, null, null, dbScheme.scheme_type);

  let benefitType: any = benefits.benefitTypes?.[0] || "Capital Subsidy";
  if (!(BENEFIT_TYPES as readonly string[]).includes(benefitType)) {
    benefitType = "Capital Subsidy";
  }

  const rawMode = content.applicationProcess?.modeText || "Online Portal";
  const applicationMode = (APPLICATION_MODES as readonly string[]).includes(rawMode)
    ? (rawMode as any)
    : "Online Portal";

  const rawScales = structured.enterprise?.types || [];
  const enterpriseScales = rawScales.length > 0
    ? rawScales.map((s: string) => {
        const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        return (ENTERPRISE_SCALES as readonly string[]).includes(cap) ? cap : "Micro";
      })
    : ["Micro", "Small", "Medium"];

  const rawTags = content.classification?.tags || structured.specialCategory?.values || [];
  const demographicTags = rawTags.filter((t: string) => (DEMOGRAPHIC_TAGS as readonly string[]).includes(t as any));

  const rawDocs = content.requiredDocuments || [];
  const requiredDocuments = rawDocs.length > 0
    ? rawDocs.map((d: any) => (typeof d === "string" ? d : d.name || "Required Document"))
    : [
        "Aadhaar Card of Promoters",
        "Udyam Registration Certificate",
        "Detailed Project Report (DPR)",
        "Bank Account Statement (6 Months)"
      ];

  return {
    title: dbScheme.name_en || rj.identity?.name || "",
    code: dbScheme.scheme_code || rj.identity?.code || dbScheme.id || "",
    category,
    sponsoringAuthority: dbScheme.department || gov.departmentText || "Ministry of MSME",
    ministry: dbScheme.ministry || gov.ministryText || "Ministry of Micro, Small & Medium Enterprises",
    implementingAgency: gov.implementingAgencyText || "",
    targetState,
    isCentral,
    schemeUrl: dbScheme.scheme_url || content.schemeUrl || content.applicationProcess?.onlineUrl || "",
    applicationMode,
    genderTarget: structured.gender?.values?.[0] || "All",
    educationLevel: [],
    enterpriseScales,
    demographicTags: demographicTags.length > 0 ? demographicTags : ["General / All"],
    minAge: structured.age?.minYears || structured.age?.min || undefined,
    maxAge: structured.age?.maxYears || structured.age?.max || undefined,
    turnoverCapInr: structured.turnover?.maxInr || structured.turnover?.maxAmountInr || undefined,
    investmentCapInr: structured.investment?.maxInr || structured.investment?.maxAmountInr || undefined,
    benefitType,
    benefitAmountMin: capSubsidy.minAmountInr || loan.minAmountInr || dbScheme.minimum_funding_amount || undefined,
    benefitAmountMax: capSubsidy.maxAmountInr || loan.maxAmountInr || dbScheme.maximum_funding_amount || undefined,
    subsidyPercentage: capSubsidy.percentage || capSubsidy.subsidyPercentage || undefined,
    benefitsSummary: benefits.summary || capSubsidy.description || "",
    summaryEn: enContent?.summary || loc.en?.summary || overview.summary || overview.description?.slice(0, 180) || content.objectives?.[0] || dbScheme.name_en || "",
    descriptionEn: enContent?.description || loc.en?.description || overview.description || "",
    objectivesEn: loc.en?.objective || overview.objective || content.objectives?.[0] || "",
    titleTa: taContent?.name || loc.ta?.name || dbScheme.name_ta || "",
    summaryTa: taContent?.summary || loc.ta?.summary || "",
    descriptionTa: taContent?.description || loc.ta?.description || "",
    benefitsTa: taContent?.benefits_text || loc.ta?.benefitsText || "",
    titleHi: hiContent?.name || loc.hi?.name || "",
    summaryHi: hiContent?.summary || loc.hi?.summary || "",
    descriptionHi: hiContent?.description || loc.hi?.description || "",
    benefitsHi: hiContent?.benefits_text || loc.hi?.benefitsText || "",
    requiredDocuments,
  };
}

