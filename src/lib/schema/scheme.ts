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
  summaryEn: z.string().optional(),
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

  let category: any = dbScheme.scheme_type || content.classification?.schemeTypeText || "Subsidies & Incentives";
  if (!(SCHEME_CATEGORIES as readonly string[]).includes(category)) {
    const catLower = (category || "").toLowerCase();
    if (catLower.includes("loan") || catLower.includes("credit")) category = "Loans & Credit";
    else if (catLower.includes("subsidy") || catLower.includes("incentive")) category = "Subsidies & Incentives";
    else if (catLower.includes("grant") || catLower.includes("seed")) category = "Grants & Seed Funding";
    else if (catLower.includes("guarantee")) category = "Credit Guarantee";
    else if (catLower.includes("skill") || catLower.includes("train")) category = "Skill Development & Training";
    else if (catLower.includes("market") || catLower.includes("export")) category = "Market Linkage & Export";
    else if (catLower.includes("infra") || catLower.includes("tech")) category = "Infrastructure & Technology";
    else category = "Special Welfare & Assistance";
  }

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
    summaryEn: enContent?.summary || loc.en?.summary || overview.summary || "",
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

