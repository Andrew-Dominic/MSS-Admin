import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { describeError, MssApiError } from "@/lib/mss/api";
import { getDraft } from "@/lib/mss/schemes";
import { draftName, type SchemeRecord } from "@/lib/mss/types";
import { Notice, PageHeader } from "@/components/admin/ui";
import { EMPTY_SCHEME, SchemeEditor } from "@/components/schemes/SchemeEditor";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SchemeDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = (
    <Link href="/schemes" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-700">
      <ArrowLeft className="h-4 w-4" /> Schemes
    </Link>
  );

  if (!UUID.test(id)) {
    return <div className="mx-auto max-w-5xl">{back}<Notice tone="error">Not a valid draft link.</Notice></div>;
  }

  const result = await getDraft(id).then(
    (draft) => ({ draft }),
    (error: unknown) => ({ error }),
  );
  if ("error" in result) {
    const notFound = result.error instanceof MssApiError && result.error.status === 404;
    return (
      <div className="mx-auto max-w-5xl">
        {back}
        <Notice tone="error">
          {notFound ? "This draft doesn't exist." : `Could not load the draft: ${describeError(result.error)}`}
        </Notice>
      </div>
    );
  }

  const { draft } = result;
  const raw: SchemeRecord = draft.payload?.raw ?? { ...EMPTY_SCHEME, id: draft.scheme_id };
  return (
    <div className="mx-auto max-w-5xl">
      {back}
      <PageHeader title={draftName(draft)} description={draft.scheme_id} />
      <SchemeEditor
        initial={raw}
        initialCollection={draft.payload?.collection ?? null}
        draft={{
          id: draft.id,
          version: draft.version,
          status: draft.status,
          action: draft.action,
          reviewNote: draft.review_note,
          updatedAt: draft.updated_at,
          audit: draft.audit,
        }}
      />
    </div>
  );
}
