import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { catalogScheme } from "@/lib/mss/catalog";
import { listAllDrafts } from "@/lib/mss/schemes";
import { Notice, PageHeader } from "@/components/admin/ui";
import { SchemeEditor } from "@/components/schemes/SchemeEditor";

export const dynamic = "force-dynamic";

/** Edit a scheme that is live in the app: saving creates a draft for it. */
export default async function CatalogSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = (
    <Link href="/schemes" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
      <ArrowLeft className="h-4 w-4" /> Schemes
    </Link>
  );
  const drafts = await listAllDrafts().catch(() => []);
  const scheme = await catalogScheme(id, drafts);
  if (!scheme?.source) {
    return <div className="mx-auto max-w-5xl">{back}<Notice tone="error">No live scheme has the ID {id}.</Notice></div>;
  }
  const open = drafts.find((d) => d.scheme_id === id && (d.status === "draft" || d.status === "approved"));

  return (
    <div className="mx-auto max-w-5xl">
      {back}
      <PageHeader title={scheme.name} description={`${id} · live in the app · ${scheme.status}`} />
      {open ? (
        <Notice tone="warn">
          This scheme already has an open draft.{" "}
          <Link href={`/schemes/${open.id}`} className="font-semibold underline">Continue that draft</Link> to edit, approve and publish it.
        </Notice>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <Notice tone="info">
              Edit below and save. That creates a draft; on the next screen you can approve, publish and notify users in one step.
            </Notice>
            {scheme.sourceFrom === "catalogue" && (
              <Notice tone="warn">
                This scheme was never edited here, so the form is filled from the app&apos;s catalogue. Check the documents
                and the apply link before saving: document groups in Hindi and Tamil, and how the documents and apply link
                were sourced, are not in the catalogue and are saved as shown here.
              </Notice>
            )}
          </div>
          <SchemeEditor initial={scheme.source} initialCollection={scheme.collection} lockIdentity />
        </>
      )}
    </div>
  );
}
