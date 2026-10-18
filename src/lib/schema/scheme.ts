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
