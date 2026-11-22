import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { DatasetUpload } from "@/components/schemes/DatasetUpload";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/schemes" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> Schemes
      </Link>
      <PageHeader
        title="Upload dataset"
        description="Add or update many schemes at once from a dataset file. Schemes not in the file are left as they are."
      />
      <DatasetUpload />
    </div>
  );
}
