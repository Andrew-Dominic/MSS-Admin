import { fetchCurrentRelease, fetchReleaseHistory } from "@/app/releases/actions";
import { ReleasesManager } from "@/components/releases/ReleasesManager";

export const revalidate = 0; // Disable caching

export default async function ReleasesPage() {
  const [currentRes, historyRes] = await Promise.all([
    fetchCurrentRelease(),
    fetchReleaseHistory(),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Catalog Releases & OTA Sync
        </h1>
        <p className="text-gray-500">
          Manage, verify, and publish canonical offline catalog bundles synchronized to citizen mobile clients.
        </p>
      </div>

      <ReleasesManager 
        currentRelease={currentRes.data} 
        history={historyRes.data || []} 
      />
    </div>
  );
}
