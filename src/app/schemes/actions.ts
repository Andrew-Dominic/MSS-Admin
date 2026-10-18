'use server'

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SchemeFormValues, schemeFormSchema } from "@/lib/schema/scheme";
import { revalidatePath } from "next/cache";

export async function submitSchemeDraft(data: SchemeFormValues) {
  const supabase = await createClient();
  
  // Admin client to bypass RLS for inserts
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Validate data
  const result = schemeFormSchema.safeParse(data);
  if (!result.success) {
    return { error: "Validation failed" };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  // 1. Insert into catalog.scheme as DRAFT
  // 2. Add an entry to admin.catalog_change_log
  
  // Generate a random UUID for the entity
  const entityId = crypto.randomUUID();

  // Create record JSON according to canonical MSS Entity specification for database & Flutter compatibility
  const recordJson = {
    identity: {
      id: entityId,
      entityType: "scheme",
      code: data.code,
      name: data.title,
      status: "active",
      language: "en",
    },
    content: {
      classification: {
        government: {
          level: data.isCentral ? "central" : "state",
          levelText: data.isCentral ? "Central" : "State",
          country: "IN",
          states: data.isCentral ? [] : [data.targetState],
          statesText: data.targetState,
          departmentText: data.sponsoringAuthority,
          implementingAgencyText: data.sponsoringAuthority,
        },
        schemeTypeText: data.category,
        sectorsText: data.category,
      },
      overview: {
        summary: data.title,
        description: data.title,
      },
      objectives: data.title,
      targetBeneficiaries: {
        description: `Targeting: ${data.demographicTags.join(", ") || "MSMEs & Enterprises"}`,
      },
      eligibility: {
        structured: {
          age: {
            minYears: data.minAge || null,
            maxYears: data.maxAge || null,
          },
          gender: {
            values: data.genderTarget === "All" ? [] : [data.genderTarget],
          },
          enterprise: {
            applies: true,
            types: ["micro", "small", "medium"],
          },
          specialCategory: {
            values: data.demographicTags,
          },
          turnover: {
            maxInr: data.incomeCap || null,
          },
        },
        narrative: {
          criteria: `Eligible for ${data.demographicTags.join(", ") || "eligible enterprises"} in ${data.targetState}.`,
        },
      },
      benefits: {
        summary: `${data.benefitType} assistance`,
        benefitTypes: [data.benefitType],
        capitalSubsidy: {
          minAmountInr: data.benefitAmountMin || null,
          maxAmountInr: data.benefitAmountMax || null,
          maxAmountText: data.benefitAmountMax ? `₹${data.benefitAmountMax}` : null,
          description: `${data.benefitType} up to ₹${data.benefitAmountMax || "N/A"}`,
        },
      },
      requiredDocuments: data.requiredDocuments.map((doc, idx) => ({
        documentId: `${entityId}-DOC${idx + 1}`,
        name: doc,
        mandatory: "required",
        mandatoryText: "Yes",
        description: `Required submission document: ${doc}`,
      })),
      applicationProcess: {
        onlineUrl: data.applicationUrl || null,
        modeText: data.applicationUrl ? "Online" : "Offline",
      },
      resources: {
        officialWebsiteUrl: data.applicationUrl || null,
      },
    },
    localization: {
      en: {
        name: data.title,
        summary: data.title,
        description: data.title,
        benefitsText: `${data.benefitType} assistance up to ₹${data.benefitAmountMax || "N/A"}`,
      },
      ta: {
        name: data.spokenTitleTa || data.title,
        summary: data.spokenSummaryTa || data.title,
        description: data.spokenSummaryTa || data.title,
      },
      hi: {
        name: data.spokenTitleHi || data.title,
        summary: data.spokenSummaryHi || data.title,
        description: data.spokenSummaryHi || data.title,
      },
    },
  };

  const { error: rpcError } = await supabaseAdmin.rpc('create_scheme_draft', {
    p_id: entityId,
    p_record_json: recordJson,
    p_scheme_code: data.code,
    p_name_en: data.title,
    p_state: data.targetState,
    p_scheme_type: data.category,
    p_primary_authority_id: data.sponsoringAuthority,
    p_changed_by: userId
  });

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    return { error: `Failed to insert scheme: ${rpcError.message}` };
  }

  revalidatePath('/schemes');
  
  // Log the action
  import("@/lib/logger").then(({ logAdminAction }) => {
    logAdminAction('CREATE_SCHEME_DRAFT', { entityId, scheme_code: data.code });
  });

  return { success: true };
}
