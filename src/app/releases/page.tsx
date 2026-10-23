import { describeError } from "@/lib/mss/api";
import { broadcastsSupported, latestRelease, listAllDrafts } from "@/lib/mss/schemes";
import { draftName } from "@/lib/mss/types";
import { Notice, PageHeader, formatDate } from "@/components/admin/ui";
import { ReleasesManager, type OpenDraft } from "@/components/releases/ReleasesManager";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  let drafts: OpenDraft[] = [];
  let error: string | null = null;
  const [release, notifySupported] = await Promise.all([latestRelease().catch(() => null), broadcastsSupported()]);
  try {
    drafts = (await listAllDrafts())
      .filter((d) => d.status === "draft" || d.status === "approved")
      .map((d) => ({ id: d.id, schemeId: d.scheme_id, name: draftName(d), status: d.status, action: d.action, version: d.version }))
      .sort((a, b) => a.schemeId.localeCompare(b.schemeId));
  } catch (e) {
    error = describeError(e);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Releases"
        description={
          release
            ? `Live release ${release.release_version}, published ${formatDate(release.published_at)}.`
            : "No scheme release has been published yet."
        }
      />
      {error ? <Notice tone="error">Could not load drafts: {error}</Notice> : <ReleasesManager drafts={drafts} notifySupported={notifySupported} />}
    </div>
  );
}
