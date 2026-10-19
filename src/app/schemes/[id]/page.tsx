import { fetchSchemeById } from "@/app/schemes/actions";
import { SchemeWizard } from "@/components/schemes/SchemeWizard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const revalidate = 0;

interface EditSchemePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSchemePage({ params }: EditSchemePageProps) {
  const { id } = await params;
  const { data: initialData, error } = await fetchSchemeById(id);

  if (error || !initialData) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
        <Link
          href="/schemes"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Schemes Catalog
        </Link>

        <Card className="border-none shadow-[0px_20px_50px_rgba(0,0,0,0.06)] bg-white rounded-3xl p-10 text-center">
          <CardContent className="flex flex-col items-center justify-center p-0 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Scheme Not Found</h2>
            <p className="text-sm text-gray-500 max-w-md">
              {error || `The scheme with ID "${id}" could not be located in the catalog.`}
            </p>
            <Link href="/schemes">
              <Button className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold mt-2">
                Return to Schemes Table
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <SchemeWizard 
        initialData={initialData} 
        schemeId={id} 
        isEdit={true} 
      />
    </div>
  );
}
