import { SchemeWizard } from "@/components/schemes/SchemeWizard";

export default async function NewSchemePage() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Add New Scheme
        </h1>
        <p className="text-gray-500">
          Construct and validate government schemes before publishing.
        </p>
      </div>
      
      <SchemeWizard />
    </div>
  );
}
