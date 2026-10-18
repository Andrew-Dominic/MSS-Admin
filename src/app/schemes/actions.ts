'use server';

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SchemeFormValues, schemeFormSchema } from "@/lib/schema/scheme";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export async function submitSchemeDraft(data: SchemeFormValues) {
  const supabase = await createClient();

  // Validate form data against schema
  const result = schemeFormSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const validated = result.data;
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  // Admin client bypasses RLS using service_role key
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate canonical entity ID
  const entityId = `SCH${Date.now().toString().slice(-6)}`;

  // Create record JSON adhering strictly to Catalog v3.1 reference skeleton (SCH000124)
  const recordJson = {
    identity: {
      id: entityId,
      entityType: "scheme",
      code: validated.code,
      legacyCodes: [],
      name: validated.title,
      shortName: validated.code,
      acronym: null,
      slug: validated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      language: "en",
      status: "active",
      updated_at: new Date().toISOString(),
    },
    content: {
      classification: {
        government: {
          level: validated.isCentral ? "central" : "state",
          levelText: validated.isCentral ? "Central" : "State",
          country: "IN",
          states: validated.isCentral ? [] : [validated.targetState],
          statesText: validated.isCentral ? "Pan-India" : validated.targetState,
          ministryText: validated.ministry,
          departmentText: validated.sponsoringAuthority,
          implementingAgencyText: validated.implementingAgency || validated.sponsoringAuthority,
        },
        schemeType: validated.category.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        schemeTypeText: validated.category,
        sectors: [],
        sectorsText: validated.category,
        categories: [],
        tags: validated.demographicTags,
      },
      overview: {
        summary: validated.summaryEn || validated.title,
        description: validated.descriptionEn || validated.summaryEn || validated.title,
        objective: validated.objectivesEn || validated.title,
        version: "Catalog v3.1",
        lastUpdatedText: "Current",
      },
      // Catalog v3.1 Contract: objectives MUST be an array of strings
      objectives: [validated.objectivesEn || validated.title],
      targetBeneficiaries: {
        description: `Targeting ${validated.enterpriseScales.join(", ")} enterprises: ${
          validated.demographicTags.join(", ") || "General applicants"
        }`,
        beneficiaryTypes: [],
        enterpriseTypes: validated.enterpriseScales.map((s) => s.toLowerCase()),
        businessStages: [],
        specialCategories: validated.demographicTags,
      },
      eligibility: {
        structured: {
          age: {
            minYears: validated.minAge || null,
            maxYears: validated.maxAge || null,
            text: validated.minAge || validated.maxAge
              ? `${validated.minAge || 18} to ${validated.maxAge || 65} years`
              : null,
          },
          gender: {
            values: validated.genderTarget === "All" ? [] : [validated.genderTarget],
          },
          enterprise: {
            applies: true,
            types: validated.enterpriseScales.map((s) => s.toLowerCase()),
          },
          specialCategory: {
            values: validated.demographicTags,
          },
          turnover: {
            maxInr: validated.turnoverCapInr || null,
          },
          investment: {
            maxInr: validated.investmentCapInr || null,
          },
        },
        narrative: {
          criteria: `Eligible for ${validated.enterpriseScales.join(", ")} MSMEs in ${validated.targetState}.`,
        },
      },
      benefits: {
        summary: validated.benefitsSummary || `${validated.benefitType} financial assistance`,
        benefitTypes: [validated.benefitType],
        capitalSubsidy: {
          minAmountInr: validated.benefitAmountMin || null,
          maxAmountInr: validated.benefitAmountMax || null,
          maxAmountText: validated.benefitAmountMax ? `₹${validated.benefitAmountMax.toLocaleString("en-IN")}` : null,
          subsidyPercentage: validated.subsidyPercentage || null,
          description: validated.benefitsSummary || `${validated.benefitType} up to ₹${validated.benefitAmountMax || "N/A"}`,
        },
      },
      requiredDocuments: validated.requiredDocuments.map((doc, idx) => ({
        documentId: `${entityId}-DOC${String(idx + 1).padStart(3, "0")}`,
        name: doc,
        mandatory: "required",
        mandatoryText: "Yes",
        description: `Required submission document: ${doc}`,
      })),
      applicationProcess: {
        onlineUrl: validated.schemeUrl || null,
        modeText: validated.applicationMode,
      },
      schemeUrl: validated.schemeUrl || null,
      resources: {
        officialWebsiteUrl: validated.schemeUrl || null,
      },
      // Trilingual Localization: en, ta, hi
      localization: {
        en: {
          name: validated.title,
          summary: validated.summaryEn || validated.title,
          description: validated.descriptionEn || validated.summaryEn || validated.title,
          benefitsText: validated.benefitsSummary || `${validated.benefitType} financial assistance`,
        },
        ta: {
          name: validated.titleTa || validated.title,
          summary: validated.summaryTa || validated.summaryEn || validated.title,
          description: validated.descriptionTa || validated.descriptionEn || validated.title,
          benefitsText: validated.benefitsTa || validated.benefitsSummary || `${validated.benefitType} நிதி உதவி`,
        },
        hi: {
          name: validated.titleHi || validated.title,
          summary: validated.summaryHi || validated.summaryEn || validated.title,
          description: validated.descriptionHi || validated.descriptionEn || validated.title,
          benefitsText: validated.benefitsHi || validated.benefitsSummary || `${validated.benefitType} वित्तीय सहायता`,
        },
      },
    },
  };

  const recordJsonString = JSON.stringify(recordJson);
  const recordChecksum = `sha256:${computeSha256(recordJsonString)}`;

  // 1. Attempt insertion via create_scheme_draft RPC
  const { error: rpcError } = await supabaseAdmin.rpc("create_scheme_draft", {
    p_id: entityId,
    p_record_json: recordJson,
    p_scheme_code: validated.code,
    p_name_en: validated.title,
    p_state: validated.targetState,
    p_scheme_type: validated.category,
    p_primary_authority_id: validated.sponsoringAuthority,
    p_changed_by: userId,
  });

  // 2. If RPC fails or has different parameters, fallback to direct schema insert
  if (rpcError) {
    console.warn("RPC create_scheme_draft error, attempting direct catalog.scheme insert:", rpcError.message);

    const { error: directError } = await supabaseAdmin
      .schema("catalog")
      .from("scheme")
      .insert({
        id: entityId,
        version: "1.36.0-alpha",
        status: "DRAFT",
        checksum: recordChecksum,
        record_json: recordJson,
        scheme_code: validated.code,
        name_en: validated.title,
        name_ta: validated.titleTa || null,
        government_level: validated.isCentral ? "central" : "state",
        scheme_type: validated.category,
        state: validated.targetState,
        ministry: validated.ministry,
        department: validated.sponsoringAuthority,
        search_keywords: `${validated.title} ${validated.category} ${validated.enterpriseScales.join(" ")}`,
        primary_authority_id: validated.sponsoringAuthority,
        minimum_funding_amount: validated.benefitAmountMin || null,
        maximum_funding_amount: validated.benefitAmountMax || null,
        is_active: true,
      });

    if (directError) {
      console.error("Direct catalog.scheme insert error:", directError);
      return { error: `Failed to insert scheme: ${directError.message}` };
    }
  }

  // 3. Populate trilingual content in catalog.content if table is accessible
  try {
    const contentRows = [
      {
        entity_type: "scheme",
        entity_id: entityId,
        lang: "en",
        name: validated.title,
        summary: validated.summaryEn || validated.title,
        description: validated.descriptionEn || validated.summaryEn || validated.title,
        benefits_text: validated.benefitsSummary || `${validated.benefitType} financial assistance`,
        origin: "human",
        verified: true,
      },
      {
        entity_type: "scheme",
        entity_id: entityId,
        lang: "ta",
        name: validated.titleTa || validated.title,
        summary: validated.summaryTa || validated.summaryEn || validated.title,
        description: validated.descriptionTa || validated.descriptionEn || validated.title,
        benefits_text: validated.benefitsTa || validated.benefitsSummary || `${validated.benefitType} நிதி உதவி`,
        origin: "human",
        verified: !!validated.titleTa,
      },
      {
        entity_type: "scheme",
        entity_id: entityId,
        lang: "hi",
        name: validated.titleHi || validated.title,
        summary: validated.summaryHi || validated.summaryEn || validated.title,
        description: validated.descriptionHi || validated.descriptionEn || validated.title,
        benefits_text: validated.benefitsHi || validated.benefitsSummary || `${validated.benefitType} वित्तीय सहायता`,
        origin: "human",
        verified: !!validated.titleHi,
      },
    ];

    await supabaseAdmin
      .schema("catalog")
      .from("content")
      .upsert(contentRows, { onConflict: "entity_type,entity_id,lang" });
  } catch (contentErr) {
    console.warn("Could not insert to catalog.content (non-fatal):", contentErr);
  }

  // 4. Log admin audit action
  try {
    await supabaseAdmin
      .schema("admin")
      .from("catalog_change_log")
      .insert({
        entity: "scheme",
        entity_id: entityId,
        field_path: "record_json",
        new_value: recordJson,
        reason: `Admin drafted scheme "${validated.title}" (${validated.code}) via Admin Panel`,
        changed_by: userId,
      });
  } catch (logErr) {
    console.warn("Could not log to admin.catalog_change_log:", logErr);
  }

  revalidatePath("/schemes");
  revalidatePath("/");

  return { success: true, entityId, code: validated.code };
}
