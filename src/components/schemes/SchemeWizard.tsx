"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight } from "lucide-react";
import { 
  schemeFormSchema, 
  SchemeFormValues, 
  STATES, 
  SCHEME_CATEGORIES, 
  EDUCATION_LEVELS, 
  DEMOGRAPHIC_TAGS, 
  BENEFIT_TYPES 
} from "@/lib/schema/scheme";
import { submitSchemeDraft } from "@/app/schemes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  { id: 1, name: "General Info" },
  { id: 2, name: "Eligibility Rules" },
  { id: 3, name: "Benefits" },
  { id: 4, name: "Localization" },
  { id: 5, name: "Documents" },
];

export function SchemeWizard() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm({
    resolver: zodResolver(schemeFormSchema),
    defaultValues: {
      title: "",
      code: "",
      category: "Social Welfare",
      sponsoringAuthority: "",
      targetState: "All India",
      isCentral: false,
      genderTarget: "All",
      educationLevel: [],
      demographicTags: [],
      benefitType: "Direct Benefit Transfer",
      requiredDocuments: [],
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await submitSchemeDraft(data);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        alert("Draft submitted successfully!");
        form.reset();
        setStep(1);
      }
    } catch (error) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["title", "code", "category", "sponsoringAuthority", "targetState", "isCentral"];
    if (step === 2) fieldsToValidate = ["minAge", "maxAge", "genderTarget", "educationLevel", "incomeCap", "demographicTags"];
    if (step === 3) fieldsToValidate = ["benefitType", "benefitAmountMin", "benefitAmountMax", "applicationUrl"];
    if (step === 4) fieldsToValidate = ["spokenTitleTa", "spokenSummaryTa", "spokenTitleHi", "spokenSummaryHi"];
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep((s) => s + 1);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 border-none bg-white rounded-3xl shadow-[0px_20px_60px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-8 mb-6 px-10 pt-10 bg-gray-50/50">
        <div className="flex items-center justify-between mb-8">
          <CardTitle className="text-2xl font-bold text-gray-900">Add New Scheme</CardTitle>
          <span className="text-sm font-semibold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">Step {step} of 5</span>
        </div>

        {/* Progress Tracker */}
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {STEPS.map((s, stepIdx) => (
              <li key={s.name} className={`relative ${stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`${
                    s.id < step ? 'bg-orange-500' : s.id === step ? 'border-2 border-orange-500 bg-white' : 'border-2 border-gray-200 bg-white'
                  } h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300`}>
                    {s.id < step ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <span className={`${s.id === step ? 'text-orange-500 font-bold' : 'text-gray-400 font-medium'}`}>{s.id}</span>
                    )}
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-4 left-10 -ml-px mt-0.5 w-16 h-0.5 bg-gray-200" aria-hidden="true">
                      <div className={`h-0.5 bg-orange-500 transition-all duration-500 ${s.id < step ? 'w-full' : 'w-0'}`} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </CardHeader>

      <CardContent className="px-10 pb-10">
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">General Information</h3>
                <p className="text-gray-500 text-sm">Provide the foundational details for the new scheme.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Scheme Title</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 transition-all" placeholder="e.g. Stand-Up India" {...form.register("title")} />
                  {form.formState.errors.title && <p className="text-red-500 text-sm font-medium">{form.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Reference Code</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 transition-all" placeholder="e.g. IN003" {...form.register("code")} />
                  {form.formState.errors.code && <p className="text-red-500 text-sm font-medium">{form.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Category</Label>
                  <select {...form.register("category")} className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-all cursor-pointer">
                    {SCHEME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Target State</Label>
                  <select {...form.register("targetState")} className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-all cursor-pointer">
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-gray-700 font-semibold">Sponsoring Authority</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 transition-all" placeholder="e.g. Ministry of MSME" {...form.register("sponsoringAuthority")} />
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2">
                  <Checkbox 
                    id="isCentral" 
                    checked={form.watch("isCentral")} 
                    onCheckedChange={(c) => form.setValue("isCentral", !!c)} 
                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 h-5 w-5"
                  />
                  <div className="leading-none">
                    <Label htmlFor="isCentral" className="text-gray-900 font-semibold text-base cursor-pointer">Is Central Scheme?</Label>
                    <p className="text-sm text-gray-500 mt-1">Check this if the scheme is sponsored by the central government.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Eligibility Rules</h3>
                <p className="text-gray-500 text-sm">Define who can apply for this scheme.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Min Age</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="number" placeholder="e.g. 18" {...form.register("minAge")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Max Age</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="number" placeholder="e.g. 60" {...form.register("maxAge")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Income Cap (INR)</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="number" placeholder="e.g. 800000" {...form.register("incomeCap")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Gender Target</Label>
                  <select {...form.register("genderTarget")} className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer">
                    <option value="All">All</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-gray-700 font-semibold">Education Levels (Hold Ctrl/Cmd to multi-select)</Label>
                  <select multiple {...form.register("educationLevel")} className="flex w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                    {EDUCATION_LEVELS.map(e => <option key={e} value={e} className="py-1">{e}</option>)}
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-gray-700 font-semibold">Demographic Tags</Label>
                  <select multiple {...form.register("demographicTags")} className="flex w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                    {DEMOGRAPHIC_TAGS.map(t => <option key={t} value={t} className="py-1">{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Financial Benefits</h3>
                <p className="text-gray-500 text-sm">Specify the type and range of financial assistance provided.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Benefit Type</Label>
                  <select {...form.register("benefitType")} className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer">
                    {BENEFIT_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Application URL</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="url" placeholder="https://" {...form.register("applicationUrl")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Min Benefit Amount (INR)</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="number" {...form.register("benefitAmountMin")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Max Benefit Amount (INR)</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" type="number" {...form.register("benefitAmountMax")} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Voice & Localization</h3>
                <p className="text-gray-500 text-sm">Optimize how the AI agent reads this scheme to users.</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Spoken Title (Tamil)</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" {...form.register("spokenTitleTa")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Spoken Summary (Tamil)</Label>
                  <Textarea className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 min-h-[120px] p-4" {...form.register("spokenSummaryTa")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Spoken Title (Hindi)</Label>
                  <Input className="rounded-xl h-12 bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0" {...form.register("spokenTitleHi")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Spoken Summary (Hindi)</Label>
                  <Textarea className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 min-h-[120px] p-4" {...form.register("spokenSummaryHi")} />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Documents Checklist</h3>
                <p className="text-gray-500 text-sm">List all necessary prerequisites for the application.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Required Documents (comma separated)</Label>
                <Textarea className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-orange-500 focus-visible:ring-offset-0 min-h-[150px] p-4 text-base" 
                  placeholder="e.g. Aadhaar Card, PAN Card, Income Certificate, Passport Size Photo" 
                  onChange={(e) => {
                    const docs = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                    form.setValue("requiredDocuments", docs);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 border-t border-gray-100 mt-10">
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-12 px-8 font-semibold transition-all" 
              onClick={() => setStep(s => Math.max(1, s - 1))} 
              disabled={step === 1}
            >
              Previous Step
            </Button>
            
            {step < 5 ? (
              <Button 
                type="button" 
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 h-12 px-8 font-semibold transition-all group" 
                onClick={nextStep}
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 h-12 px-8 font-semibold transition-all" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving Draft..." : "Submit Scheme Draft"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
