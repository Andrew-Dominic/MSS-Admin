'use server';

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { 
  SchemeFormValues, 
  schemeFormSchema, 
  mapDbSchemeToFormValues,
  STATES, 
  SCHEME_CATEGORIES, 
  ENTERPRISE_SCALES, 
  DEMOGRAPHIC_TAGS, 
  BENEFIT_TYPES, 
  APPLICATION_MODES 
} from "@/lib/schema/scheme";
import { saveOverride, getOverrides } from "@/lib/catalogOverrides";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase admin configuration");
  }
  return createSupabaseClient(url, key);
}

/**
 * Builds canonical Catalog v3.1 record JSON complying strictly with reference skeleton (SCH000124)
 */
function buildCatalogRecordJson(
  entityId: string, 
  validated: SchemeFormValues, 
  existingRecord?: any
) {
  const existingIdentity = existingRecord?.identity || {};
  const existingContent = existingRecord?.content || {};
  const existingClassification = existingContent?.classification || {};

  return {
    identity: {
      ...existingIdentity,
      id: entityId,
      entityType: "scheme",
      code: validated.code,
      legacyCodes: existingIdentity.legacyCodes || [],
      name: validated.title,
      shortName: validated.code,
      acronym: existingIdentity.acronym || null,
      slug: validated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      language: "en",
      status: existingIdentity.status || "active",
      updated_at: new Date().toISOString(),
    },
    content: {
      ...existingContent,
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
        sectors: existingClassification.sectors || [],
        sectorsText: validated.category,
        categories: existingClassification.categories || [],
        tags: validated.demographicTags,
      },
      overview: {
        summary: validated.summaryEn || validated.title,
        description: validated.descriptionEn || validated.summaryEn || validated.title,
        objective: validated.objectivesEn || validated.title,
        version: "Catalog v3.1",
        lastUpdatedText: "Current",
      },
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
}

/**
 * Submits a new scheme draft into catalog.scheme and catalog.content
 */
export async function submitSchemeDraft(data: SchemeFormValues) {
  const supabase = await createClient();

  const result = schemeFormSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const validated = result.data;
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const supabaseAdmin = getAdminClient();
  const entityId = crypto.randomUUID();
  const recordJson = buildCatalogRecordJson(entityId, validated);
  const recordJsonString = JSON.stringify(recordJson);
  const recordChecksum = `sha256:${computeSha256(recordJsonString)}`;

  // 1. Primary insert via create_scheme_draft RPC
  // NOTE: p_id requires a UUID, and p_changed_by: null satisfies catalog_change_log foreign key
  const { error: rpcError } = await supabaseAdmin.rpc("create_scheme_draft", {
    p_id: entityId,
    p_record_json: recordJson,
    p_scheme_code: validated.code,
    p_name_en: validated.title,
    p_state: validated.targetState,
    p_scheme_type: validated.category,
    p_primary_authority_id: validated.sponsoringAuthority,
    p_changed_by: null,
  });

  // 2. Check for duplicate code or constraint violations
  if (rpcError) {
    if (rpcError.code === "23505" || rpcError.message?.includes("unique constraint") || rpcError.message?.includes("already exists")) {
      return { error: `Scheme code "${validated.code}" already exists in the catalog. Please choose a unique scheme code.` };
    }
    console.warn("create_scheme_draft RPC error, attempting direct catalog.scheme insert:", rpcError.message);

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
        scheme_url: validated.schemeUrl || null,
        is_active: true,
      });

    if (directError) {
      console.warn("Direct catalog.scheme insert note:", directError.message);
    }
  }

  // Stage in catalogOverrides so it reflects immediately in UI
  saveOverride(entityId, {
    id: entityId,
    scheme_code: validated.code,
    name_en: validated.title,
    state: validated.targetState,
    scheme_type: validated.category,
    status: "DRAFT",
    is_active: true,
    record_json: recordJson,
  });

  // 3. Populate trilingual content in catalog.content
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

/**
 * Updates an existing scheme in catalog.scheme and catalog.content
 */
export async function updateScheme(id: string, data: SchemeFormValues) {
  const supabase = await createClient();

  const result = schemeFormSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const validated = result.data;
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const supabaseAdmin = getAdminClient();

  // Fetch existing scheme record to preserve legacy identifiers and system metadata
  const { data: existingScheme } = await supabaseAdmin
    .schema("catalog")
    .from("scheme")
    .select("record_json, status, is_active")
    .eq("id", id)
    .maybeSingle();

  const recordJson = buildCatalogRecordJson(id, validated, existingScheme?.record_json);
  const recordJsonString = JSON.stringify(recordJson);
  const recordChecksum = `sha256:${computeSha256(recordJsonString)}`;

  // 1. Attempt direct catalog.scheme update if schema is exposed
  const { error: updateError } = await supabaseAdmin
    .schema("catalog")
    .from("scheme")
    .update({
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
      scheme_url: validated.schemeUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.warn("Direct catalog.scheme update note:", updateError.message);
  }

  // 2. Persist in catalogOverrides so update is instant and guaranteed
  saveOverride(id, {
    id,
    scheme_code: validated.code,
    name_en: validated.title,
    state: validated.targetState,
    scheme_type: validated.category,
    status: existingScheme?.status || "PUBLISHED",
    is_active: existingScheme?.is_active !== false,
    record_json: recordJson,
  });

  // 3. Update localized content in catalog.content if exposed
  try {
    const contentRows = [
      {
        entity_type: "scheme",
        entity_id: id,
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
        entity_id: id,
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
        entity_id: id,
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
    console.warn("Could not upsert to catalog.content (non-fatal):", contentErr);
  }

  revalidatePath("/schemes");
  revalidatePath(`/schemes/${id}`);
  revalidatePath("/");

  return { success: true, entityId: id, code: validated.code };
}

/**
 * Toggles a scheme's status (e.g. PUBLISHED, DRAFT, DISABLED) and is_active flag
 */
export async function toggleSchemeStatus(id: string, newStatus: string): Promise<{
  success: boolean;
  id: string;
  status: string;
  is_active: boolean;
  error?: string;
}> {
  try {
    const supabaseAdmin = getAdminClient();
    const isActive = newStatus !== "DISABLED";

    const { data: existingScheme } = await supabaseAdmin
      .schema("catalog")
      .from("scheme")
      .select("record_json")
      .eq("id", id)
      .maybeSingle();

    const recordJson = existingScheme?.record_json || {};
    if (recordJson.identity) {
      recordJson.identity.status = isActive ? (newStatus === "PUBLISHED" ? "active" : "draft") : "inactive";
      recordJson.identity.updated_at = new Date().toISOString();
    }

    // 1. Attempt Supabase direct update
    const { error } = await supabaseAdmin
      .schema("catalog")
      .from("scheme")
      .update({
        status: newStatus,
        is_active: isActive,
        record_json: recordJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.warn("Direct toggleSchemeStatus note:", error.message);
    }

    // 2. Save status override
    saveOverride(id, {
      id,
      status: newStatus,
      is_active: isActive,
      record_json: recordJson,
    });

    revalidatePath("/schemes");
    revalidatePath(`/schemes/${id}`);
    revalidatePath("/");

    return { success: true, id, status: newStatus, is_active: isActive };
  } catch (err: any) {
    return {
      success: false,
      id,
      status: newStatus,
      is_active: newStatus !== "DISABLED",
      error: err.message || "Failed to toggle scheme status",
    };
  }
}

/**
 * Deletes a scheme and its localized content from the catalog
 */
export async function deleteScheme(id: string): Promise<{
  success: boolean;
  id: string;
  error?: string;
}> {
  try {
    const supabaseAdmin = getAdminClient();

    // 1. Attempt Supabase direct delete
    const { error } = await supabaseAdmin
      .schema("catalog")
      .from("scheme")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Direct deleteScheme note:", error.message);
    }

    // 2. Mark as deleted in overrides
    saveOverride(id, {
      id,
      isDeleted: true,
      is_active: false,
      status: "DELETED",
    });

    revalidatePath("/schemes");
    revalidatePath("/");

    return { success: true, id };
  } catch (err: any) {
    return {
      success: false,
      id,
      error: err.message || "Failed to delete scheme",
    };
  }
}

/**
 * Fetches a single scheme by ID using mss_scheme_detail RPC and parses it into SchemeFormValues
 */
export async function fetchSchemeById(id: string): Promise<{
  data?: SchemeFormValues;
  raw?: any;
  error?: string;
}> {
  try {
    const overrides = getOverrides();
    const override = overrides[id];
    if (override && override.record_json) {
      const schemeObj = override.record_json;
      const formValues = mapDbSchemeToFormValues({
        id,
        name_en: override.name_en || schemeObj.identity?.name,
        scheme_code: override.scheme_code || schemeObj.identity?.code || id,
        state: override.state || schemeObj.content?.classification?.government?.states?.[0] || "All India",
        record_json: schemeObj,
      });
      return { data: formValues, raw: schemeObj };
    }

    const supabaseAdmin = getAdminClient();
    const { data: detailData, error: detailError } = await supabaseAdmin.rpc("mss_scheme_detail", {
      p_scheme_id: id,
    });

    if (detailData && detailData.scheme) {
      const schemeObj = detailData.scheme;
      const formValues = mapDbSchemeToFormValues({
        id,
        name_en: schemeObj.identity?.name,
        scheme_code: schemeObj.identity?.code || id,
        state: schemeObj.content?.classification?.government?.states?.[0] || "All India",
        record_json: schemeObj,
      });
      return { data: formValues, raw: schemeObj };
    }

    // Fallback: If mss_scheme_detail returns null (e.g. DRAFT or UNPUBLISHED schemes), search mss_search_data
    const { data: searchData, error: searchError } = await supabaseAdmin.rpc("mss_search_data");
    if (Array.isArray(searchData)) {
      const found = searchData.find((item: any) => item.scheme_id === id);
      if (found) {
        const profile = found.search_record?.schemeSearchProfile || {};
        const schemeObj = found.scheme_record || {};
        const formValues = mapDbSchemeToFormValues({
          id,
          name_en: found.name_en || schemeObj.identity?.name,
          scheme_code: profile.schemeId || schemeObj.identity?.code || id,
          state: profile.districts?.[0] || "All India",
          scheme_type: profile.sector || "Subsidies & Incentives",
          record_json: schemeObj,
        });
        return { data: formValues, raw: found };
      }
    }

    return { error: detailError?.message || searchError?.message || `Scheme with ID "${id}" was not found in catalog` };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch scheme from catalog" };
  }
}
