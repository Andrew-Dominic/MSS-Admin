"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Check, 
  ChevronRight, 
  Globe2, 
  Building2, 
  ShieldCheck, 
  Coins, 
  FileText, 
  Languages, 
  ExternalLink,
  Sparkles,
  Plus,
  Trash2
} from "lucide-react";
import { 
  schemeFormSchema, 
  SchemeFormValues, 
  STATES, 
  SCHEME_CATEGORIES, 
  ENTERPRISE_SCALES, 
  DEMOGRAPHIC_TAGS, 
  BENEFIT_TYPES,
  APPLICATION_MODES,
  EDUCATION_LEVELS
} from "@/lib/schema/scheme";
import { submitSchemeDraft } from "@/app/schemes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  { id: 1, name: "General Info", icon: Building2 },
  { id: 2, name: "MSME Eligibility", icon: ShieldCheck },
  { id: 3, name: "Benefits", icon: Coins },
  { id: 4, name: "Localization", icon: Languages },
  { id: 5, name: "Preview & Submit", icon: FileText },
];

export function SchemeWizard() {
  const [step, setStep] = useState(1);
  const [activeLangTab, setActiveLangTab] = useState<"en" | "ta" | "hi">("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [customDocInput, setCustomDocInput] = useState("");

  const form = useForm({
    resolver: zodResolver(schemeFormSchema) as any,
    defaultValues: {
      title: "",
      code: "",
      category: "Subsidies & Incentives",
      sponsoringAuthority: "",
      ministry: "Ministry of Micro, Small & Medium Enterprises",
      implementingAgency: "",
      targetState: "All India",
      isCentral: true,
      schemeUrl: "",
      applicationMode: "Online Portal",
      genderTarget: "All",
      educationLevel: [],
      enterpriseScales: ["Micro", "Small", "Medium"],
      demographicTags: ["Women", "SC", "ST", "General / All"],
      minAge: undefined as number | undefined,
      maxAge: undefined as number | undefined,
      turnoverCapInr: undefined as number | undefined,
      investmentCapInr: undefined as number | undefined,
      benefitType: "Capital Subsidy",
      benefitAmountMin: undefined as number | undefined,
      benefitAmountMax: undefined as number | undefined,
      subsidyPercentage: undefined as number | undefined,
      benefitsSummary: "",
      summaryEn: "",
      descriptionEn: "",
      objectivesEn: "",
      titleTa: "",
      summaryTa: "",
      descriptionTa: "",
      benefitsTa: "",
      titleHi: "",
      summaryHi: "",
      descriptionHi: "",
      benefitsHi: "",
      requiredDocuments: [
        "Aadhaar Card of Promoters",
        "Udyam Registration Certificate",
        "Detailed Project Report (DPR)",
        "Bank Account Statement (6 Months)"
      ],
    },
  });

  const { register, watch, setValue, trigger } = form;
  const formValues = watch();

  const handleAddDocument = () => {
    if (!customDocInput.trim()) return;
    const currentDocs = formValues.requiredDocuments || [];
    if (!currentDocs.includes(customDocInput.trim())) {
      setValue("requiredDocuments", [...currentDocs, customDocInput.trim()]);
    }
    setCustomDocInput("");
  };

  const handleRemoveDocument = (docToRemove: string) => {
    const currentDocs = formValues.requiredDocuments || [];
    setValue("requiredDocuments", currentDocs.filter((d) => d !== docToRemove));
  };

  const toggleEnterpriseScale = (scale: "Micro" | "Small" | "Medium") => {
    const current = formValues.enterpriseScales || [];
    if (current.includes(scale)) {
      if (current.length > 1) {
        setValue("enterpriseScales", current.filter((s) => s !== scale));
      }
    } else {
      setValue("enterpriseScales", [...current, scale]);
    }
  };

  const toggleDemographicTag = (tag: typeof DEMOGRAPHIC_TAGS[number]) => {
    const current = formValues.demographicTags || [];
    if (current.includes(tag)) {
      setValue("demographicTags", current.filter((t) => t !== tag));
    } else {
      setValue("demographicTags", [...current, tag]);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["title", "code", "category", "sponsoringAuthority", "ministry", "targetState", "schemeUrl"];
    if (step === 2) fieldsToValidate = ["enterpriseScales", "genderTarget", "minAge", "maxAge", "turnoverCapInr", "investmentCapInr"];
    if (step === 3) fieldsToValidate = ["benefitType", "benefitAmountMin", "benefitAmountMax", "subsidyPercentage", "benefitsSummary"];
    if (step === 4) fieldsToValidate = ["summaryEn", "descriptionEn", "titleTa", "titleHi"];

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep((s) => Math.min(5, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await submitSchemeDraft(data);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Scheme draft "${data.title}" (${data.code}) successfully saved to Supabase Catalog!`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 border-none bg-white rounded-3xl shadow-[0px_20px_60px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-8 px-10 pt-10 bg-gradient-to-r from-orange-50/50 via-white to-blue-50/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                Catalog v3.1 Compliant
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                Trilingual (en/ta/hi)
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Add New Scheme Draft</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Draft official government schemes structured for the Flutter mobile discovery engine.
            </p>
          </div>
          <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
            Step {step} of 5
          </span>
        </div>

        {/* Progress Tracker */}
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center justify-between w-full">
            {STEPS.map((s, stepIdx) => {
              const Icon = s.icon;
              const isPast = s.id < step;
              const isCurrent = s.id === step;
              return (
                <li key={s.name} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={() => s.id < step && setStep(s.id)}
                      disabled={s.id > step}
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                        isPast
                          ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                          : isCurrent
                          ? "border-2 border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                          : "border border-gray-200 bg-white text-gray-400"
                      }`}
                    >
                      {isPast ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5" />}
                    </button>
                    <span className={`text-xs mt-2 font-medium ${isCurrent ? "text-orange-600 font-semibold" : "text-gray-500"}`}>
                      {s.name}
                    </span>
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className={`h-[2px] w-full max-w-[40px] -mt-5 transition-colors ${isPast ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </CardHeader>

      <CardContent className="p-10">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="font-medium">{successMsg}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.reset();
                setStep(1);
                setSuccessMsg("");
              }}
              className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            >
              Draft Another Scheme
            </Button>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1: General Info & Governance */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-gray-700 font-semibold">
                    Scheme Title (English) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Prime Minister's Employment Generation Programme (PMEGP)"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("title")}
                  />
                  {form.formState.errors.title && (
                    <p className="text-xs text-rose-500">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code" className="text-gray-700 font-semibold">
                    Scheme Code <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g. MSME2526-099"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200 uppercase font-mono text-sm"
                    {...register("code")}
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-rose-500">{form.formState.errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700 font-semibold">
                    Category (Matches Mobile Facet Filter) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="category"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50/70 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    {...register("category")}
                  >
                    {SCHEME_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ministry" className="text-gray-700 font-semibold">
                    Nodal Ministry
                  </Label>
                  <Input
                    id="ministry"
                    placeholder="e.g. Ministry of Micro, Small & Medium Enterprises"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("ministry")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sponsoringAuthority" className="text-gray-700 font-semibold">
                    Sponsoring Authority / Department <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="sponsoringAuthority"
                    placeholder="e.g. KVIC, Coir Board, DC-MSME"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("sponsoringAuthority")}
                  />
                  {form.formState.errors.sponsoringAuthority && (
                    <p className="text-xs text-rose-500">{form.formState.errors.sponsoringAuthority.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="implementingAgency" className="text-gray-700 font-semibold">
                    Implementing Agency
                  </Label>
                  <Input
                    id="implementingAgency"
                    placeholder="e.g. District Industries Centres (DIC) / State KVIC"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("implementingAgency")}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isCentral"
                    className="h-5 w-5 rounded-lg border-gray-300 text-orange-500 focus:ring-orange-400"
                    {...register("isCentral")}
                  />
                  <div>
                    <Label htmlFor="isCentral" className="text-sm font-semibold text-gray-800 cursor-pointer">
                      Central Scheme (Pan-India)
                    </Label>
                    <p className="text-xs text-gray-500">Applicable across all states</p>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="targetState" className="text-xs font-semibold text-gray-600">
                    Target State (Ignored if Pan-India)
                  </Label>
                  <select
                    id="targetState"
                    disabled={formValues.isCentral}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm disabled:opacity-50"
                    {...register("targetState")}
                  >
                    {STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="schemeUrl" className="text-gray-700 font-semibold flex items-center gap-2">
                    Official Portal / Apply URL <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </Label>
                  <Input
                    id="schemeUrl"
                    placeholder="https://www.kviconline.gov.in/pmegpep/"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("schemeUrl")}
                  />
                  {form.formState.errors.schemeUrl && (
                    <p className="text-xs text-rose-500">{form.formState.errors.schemeUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationMode" className="text-gray-700 font-semibold">
                    Application Mode
                  </Label>
                  <select
                    id="applicationMode"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50/70 border border-gray-200 text-sm"
                    {...register("applicationMode")}
                  >
                    {APPLICATION_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MSME Eligibility Rules */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-3">
                <Label className="text-gray-800 font-semibold block">
                  Applicable Enterprise Scales (Matches Mobile Onboarding) <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  {ENTERPRISE_SCALES.map((scale) => {
                    const isChecked = formValues.enterpriseScales?.includes(scale);
                    return (
                      <div
                        key={scale}
                        onClick={() => toggleEnterpriseScale(scale)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isChecked
                            ? "border-orange-500 bg-orange-50/50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{scale}</span>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              isChecked ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {scale === "Micro" && "Inv < ₹1 Cr | Turnover < ₹5 Cr"}
                          {scale === "Small" && "Inv < ₹10 Cr | Turnover < ₹50 Cr"}
                          {scale === "Medium" && "Inv < ₹50 Cr | Turnover < ₹250 Cr"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-gray-800 font-semibold block">
                  Target Beneficiary Categories (Mobile Intelligent Scheme Search Tags)
                </Label>
                <div className="flex flex-wrap gap-2.5">
                  {DEMOGRAPHIC_TAGS.map((tag) => {
                    const isSelected = formValues.demographicTags?.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleDemographicTag(tag)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="genderTarget" className="text-gray-700 font-semibold">
                    Gender Requirement
                  </Label>
                  <select
                    id="genderTarget"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50/70 border border-gray-200 text-sm"
                    {...register("genderTarget")}
                  >
                    <option value="All">All Genders</option>
                    <option value="Female">Women Only</option>
                    <option value="Male">Male</option>
                    <option value="Transgender">Transgender Only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAge" className="text-gray-700 font-semibold">
                    Minimum Age (Years)
                  </Label>
                  <Input
                    id="minAge"
                    type="number"
                    placeholder="18"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("minAge")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAge" className="text-gray-700 font-semibold">
                    Maximum Age (Years)
                  </Label>
                  <Input
                    id="maxAge"
                    type="number"
                    placeholder="65"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("maxAge")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="turnoverCapInr" className="text-gray-700 font-semibold">
                    Turnover Cap (₹ INR, optional)
                  </Label>
                  <Input
                    id="turnoverCapInr"
                    type="number"
                    placeholder="e.g. 50000000 (5 Crores)"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("turnoverCapInr")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investmentCapInr" className="text-gray-700 font-semibold">
                    Max Investment Cap (₹ INR, optional)
                  </Label>
                  <Input
                    id="investmentCapInr"
                    type="number"
                    placeholder="e.g. 10000000 (1 Crore)"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("investmentCapInr")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Financial Benefits & Subsidies */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="benefitType" className="text-gray-700 font-semibold">
                    Benefit Classification <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="benefitType"
                    className="w-full h-11 px-3 rounded-xl bg-gray-50/70 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    {...register("benefitType")}
                  >
                    {BENEFIT_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subsidyPercentage" className="text-gray-700 font-semibold">
                    Subsidy Rate / Percentage (% optional)
                  </Label>
                  <Input
                    id="subsidyPercentage"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 35"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("subsidyPercentage")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="benefitAmountMin" className="text-gray-700 font-semibold">
                    Minimum Benefit / Project Cost (₹ INR)
                  </Label>
                  <Input
                    id="benefitAmountMin"
                    type="number"
                    placeholder="e.g. 100000"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("benefitAmountMin")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefitAmountMax" className="text-gray-700 font-semibold">
                    Maximum Benefit / Subsidy Ceiling (₹ INR)
                  </Label>
                  <Input
                    id="benefitAmountMax"
                    type="number"
                    placeholder="e.g. 5000000 (50 Lakhs)"
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                    {...register("benefitAmountMax")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefitsSummary" className="text-gray-700 font-semibold">
                  Benefits Narrative (Displayed on Mobile Scheme Detail Card)
                </Label>
                <Textarea
                  id="benefitsSummary"
                  rows={3}
                  placeholder="e.g. 15% to 35% margin money subsidy on project cost up to ₹50 Lakhs for manufacturing units and ₹20 Lakhs for service units."
                  className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                  {...register("benefitsSummary")}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Trilingual Localization (en, ta, hi) */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex border-b border-gray-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLangTab("en")}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    activeLangTab === "en"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  English (Primary)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab("ta")}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    activeLangTab === "ta"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  தமிழ் (Tamil)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab("hi")}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    activeLangTab === "hi"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
              </div>

              {/* English Tab */}
              {activeLangTab === "en" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="summaryEn" className="text-gray-700 font-semibold">
                      English Summary (Short 1-2 sentence overview)
                    </Label>
                    <Textarea
                      id="summaryEn"
                      rows={2}
                      placeholder="e.g. Credit-linked subsidy scheme promoting micro-enterprises in rural and urban areas."
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("summaryEn")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn" className="text-gray-700 font-semibold">
                      Full Description & Guidelines
                    </Label>
                    <Textarea
                      id="descriptionEn"
                      rows={4}
                      placeholder="Comprehensive description of the scheme's scope, assistance mechanisms, and participating financial institutions."
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("descriptionEn")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objectivesEn" className="text-gray-700 font-semibold">
                      Key Objective (Catalog v3.1 requirement)
                    </Label>
                    <Input
                      id="objectivesEn"
                      placeholder="e.g. Generate continuous and sustainable employment opportunities in rural and urban areas."
                      className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                      {...register("objectivesEn")}
                    />
                  </div>
                </div>
              )}

              {/* Tamil Tab */}
              {activeLangTab === "ta" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleTa" className="text-gray-700 font-semibold">
                      திட்டத்தின் பெயர் (Tamil Scheme Title)
                    </Label>
                    <Input
                      id="titleTa"
                      placeholder="எ.கா. பிரதம மந்திரி வேலைவாய்ப்பு உருவாக்கும் திட்டம்"
                      className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                      {...register("titleTa")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="summaryTa" className="text-gray-700 font-semibold">
                      சுருக்கம் (Tamil Summary)
                    </Label>
                    <Textarea
                      id="summaryTa"
                      rows={2}
                      placeholder="கிராமப்புற மற்றும் நகர்ப்புறங்களில் குறுந்தொழில்களை ஊக்குவிக்கும் மானியத் திட்டம்."
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("summaryTa")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefitsTa" className="text-gray-700 font-semibold">
                      நன்மைகள் விவரம் (Tamil Benefits Text)
                    </Label>
                    <Textarea
                      id="benefitsTa"
                      rows={2}
                      placeholder="திட்ட மதிப்பீட்டில் 15% முதல் 35% வரை மானியம் வழங்கப்படுகிறது."
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("benefitsTa")}
                    />
                  </div>
                </div>
              )}

              {/* Hindi Tab */}
              {activeLangTab === "hi" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titleHi" className="text-gray-700 font-semibold">
                      योजना का नाम (Hindi Scheme Title)
                    </Label>
                    <Input
                      id="titleHi"
                      placeholder="उदा. प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP)"
                      className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                      {...register("titleHi")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="summaryHi" className="text-gray-700 font-semibold">
                      संक्षिप्त विवरण (Hindi Summary)
                    </Label>
                    <Textarea
                      id="summaryHi"
                      rows={2}
                      placeholder="ग्रामीण एवं शहरी क्षेत्रों में सूक्ष्म उद्यमों को बढ़ावा देने वाली ऋण-संबद्ध सब्सिडी योजना।"
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("summaryHi")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefitsHi" className="text-gray-700 font-semibold">
                      लाभ विवरण (Hindi Benefits Text)
                    </Label>
                    <Textarea
                      id="benefitsHi"
                      rows={2}
                      placeholder="परियोजना लागत पर 15% से 35% तक मार्जिन मनी सब्सिडी।"
                      className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
                      {...register("benefitsHi")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Required Documents Checklist & Preview */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-3">
                <Label className="text-gray-800 font-semibold block">Required Application Documents Checklist</Label>
                <div className="flex gap-2">
                  <Input
                    value={customDocInput}
                    onChange={(e) => setCustomDocInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDocument())}
                    placeholder="Add a required document (e.g. GST Registration Certificate)..."
                    className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
                  />
                  <Button
                    type="button"
                    onClick={handleAddDocument}
                    className="rounded-xl bg-gray-900 hover:bg-black text-white px-5 h-11 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Document
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formValues.requiredDocuments?.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      {doc}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc)}
                        className="hover:text-rose-500 ml-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Mobile Card Preview */}
              <div className="border border-orange-200/80 rounded-3xl p-6 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Mobile App Scheme Card Preview
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {formValues.code || "SCH_CODE"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {formValues.title || "Untitled Government Scheme"}
                </h3>

                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {formValues.summaryEn || formValues.descriptionEn || "No summary provided yet."}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {formValues.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {formValues.isCentral ? "Pan-India" : formValues.targetState}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {formValues.enterpriseScales?.join(", ")}
                  </span>
                  {formValues.benefitAmountMax && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Up to ₹{Number(formValues.benefitAmountMax).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="rounded-xl border-gray-200 h-11 px-6 font-semibold"
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-11 px-8 font-semibold flex items-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25 h-11 px-8 font-semibold flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>Saving to Supabase...</>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Submit Scheme Draft
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
