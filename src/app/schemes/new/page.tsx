import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { EMPTY_SCHEME, SchemeEditor } from "@/components/schemes/SchemeEditor";

export default function NewSchemePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/schemes" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" /> Schemes
      </Link>
      <PageHeader
        title="New scheme"
        description="Creates a draft. It reaches the app only after it is approved and published."
      />
      <SchemeEditor initial={EMPTY_SCHEME} initialCollection={null} />
    </div>
  );
}
