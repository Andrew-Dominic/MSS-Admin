import { z } from "zod";

export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "All India"
] as const;

export const EDUCATION_LEVELS = [
  "School", "Diploma", "Undergraduate", "Postgraduate", "Illiterate"
] as const;

export const SCHEME_CATEGORIES = [
  "Agriculture", "Education", "Finance", "Healthcare", "Housing", "Social Welfare"
] as const;

export const BENEFIT_TYPES = [
  "Direct Benefit Transfer", "Subsidy", "Loan", "Tax Exemption", "Other"
] as const;

export const DEMOGRAPHIC_TAGS = [
  "SC/ST", "Women", "MSME", "Farmer", "Student", "Differently Abled", "Minority"
] as const;

export const schemeFormSchema = z.object({
  // Step 1: General Info
  title: z.string().min(2, "Title is required"),
  code: z.string().min(2, "Code is required"),
  category: z.enum(SCHEME_CATEGORIES),
  sponsoringAuthority: z.string().min(2, "Authority is required"),
  targetState: z.enum(STATES),
  isCentral: z.boolean().default(false),

  // Step 2: Eligibility Rules
  minAge: z.coerce.number().min(0).max(120).optional(),
  maxAge: z.coerce.number().min(0).max(120).optional(),
  genderTarget: z.enum(["All", "Male", "Female", "Transgender"]).default("All"),
  educationLevel: z.array(z.enum(EDUCATION_LEVELS)).default([]),
  incomeCap: z.coerce.number().min(0).optional(),
  demographicTags: z.array(z.enum(DEMOGRAPHIC_TAGS)).default([]),

  // Step 3: Financial & Tax Benefits
  benefitType: z.enum(BENEFIT_TYPES).default("Direct Benefit Transfer"),
  benefitAmountMin: z.coerce.number().min(0).optional(),
  benefitAmountMax: z.coerce.number().min(0).optional(),
  applicationUrl: z.string().url().optional().or(z.literal("")),

  // Step 4: Voice & Regional Localization
  spokenTitleTa: z.string().optional(),
  spokenSummaryTa: z.string().optional(),
  spokenTitleHi: z.string().optional(),
  spokenSummaryHi: z.string().optional(),

  // Step 5: Required Documents Checklist
  requiredDocuments: z.array(z.string()).default([]),
});

export type SchemeFormValues = z.infer<typeof schemeFormSchema>;
