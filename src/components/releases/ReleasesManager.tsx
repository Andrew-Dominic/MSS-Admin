"use client";

import { useState } from "react";
import { CatalogRelease, publishCatalogRelease } from "@/app/releases/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatDate } from "@/lib/dateUtils";
import { 
  Package, 
  CheckCircle2, 
  UploadCloud, 
  ShieldCheck, 
  Layers, 
  Hash, 
  Clock, 
  HardDrive,
  FileCode,
  Loader2,
  X,
  ExternalLink
} from "lucide-react";

interface ReleasesManagerProps {
  currentRelease: CatalogRelease | null;
  history: CatalogRelease[];
}

export function ReleasesManager({ currentRelease, history: initialHistory }: ReleasesManagerProps) {
  const [history, setHistory] = useState<CatalogRelease[]>(initialHistory);
  const [activeCurrent, setActiveCurrent] = useState<CatalogRelease | null>(currentRelease);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [versionTag, setVersionTag] = useState("1.34.0");
  const [notes, setNotes] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setFeedback(null);

    try {
      const res = await publishCatalogRelease({ versionTag, notes });
      if (!res.success || !res.release) {
        setFeedback({ type: "error", message: res.error || "Failed to publish catalog release." });
      } else {
        setFeedback({
          type: "success",
          message: `Catalog Release v${versionTag} published successfully! Mobile clients will sync automatically.`
        });
        setActiveCurrent(res.release);
        setHistory((prev) => [res.release!, ...prev.filter((r) => r.id !== res.release!.id)]);
        setIsPublishModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsPublishing(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-sm font-medium flex items-center justify-between shadow-xs ${
          feedback.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
            : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero: Active Live Release Card */}
      <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-gradient-to-br from-white via-orange-50/20 to-white rounded-3xl overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Current Live Release
              </span>
              <span className="text-xs text-gray-500 font-mono">
                Schema v{activeCurrent?.schema_version || 3}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                v{activeCurrent?.release_version || "1.33.0"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Canonical offline bundle actively served to citizens via the Flutter mobile app and Saarthi Voice AI.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 block font-medium">Package Size</span>
                <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                  {formatBytes(activeCurrent?.package_byte_size)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 block font-medium">Published Date</span>
                <span className="text-sm font-bold text-gray-900 mt-0.5 block font-mono" suppressHydrationWarning>
                  {formatDate(activeCurrent?.published_at)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 block font-medium">Catalog Schemes</span>
                <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                  {activeCurrent?.record_counts?.schemes || 306}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 block font-medium">Security Checksum</span>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> SHA-256
                </span>
              </div>
            </div>

            {activeCurrent?.package_sha256 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-600 break-all select-all flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{activeCurrent.package_sha256}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Button
              onClick={() => setIsPublishModalOpen(true)}
              className="h-12 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <UploadCloud className="w-5 h-5" />
              Publish Catalog Release
            </Button>
          </div>
        </div>
      </Card>

      {/* Historical Releases Table */}
      <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-4 px-6 sm:px-8 pt-6 sm:pt-8 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-500" /> Release History & Manifests
          </CardTitle>
          <span className="text-xs text-gray-400 font-medium">
            {history.length} release(s) recorded
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Release Tag</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Package Size</th>
                  <th className="px-6 py-4 font-semibold">SHA-256 Checksum</th>
                  <th className="px-6 py-4 font-semibold text-right">Published At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No release history found. Click "Publish Catalog Release" to create a release.
                    </td>
                  </tr>
                ) : (
                  history.map((rel, idx) => (
                    <tr key={rel.id || rel.release_version || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-500" />
                          <span>v{rel.release_version}</span>
                          {rel.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              CURRENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          rel.status === "published" || rel.is_current
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}>
                          {rel.status || (rel.is_current ? "published" : "archived")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {formatBytes(rel.package_byte_size)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs max-w-xs truncate" title={rel.package_sha256}>
                        {rel.package_sha256 ? `${rel.package_sha256.slice(0, 16)}...` : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 text-xs font-mono" suppressHydrationWarning>
                        {formatDateTime(rel.published_at || rel.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Publish New Release Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-200">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-gray-100 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Publish Catalog Release</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Bundle all published schemes and OTA updates for mobile sync.</p>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <form onSubmit={handlePublish}>
              <CardContent className="space-y-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="versionTag" className="text-gray-700 font-semibold text-xs">
                    Release Version Tag <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="versionTag"
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    placeholder="1.34.0"
                    required
                    className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm font-mono"
                  />
                  <p className="text-[11px] text-gray-400">Semantic versioning matching release specification (e.g. 1.34.0).</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-gray-700 font-semibold text-xs">
                    Release Changelog / Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Added Maharashtra regional MSME incentives, updated subsidy caps, and refreshed English/Hindi translations."
                    rows={3}
                    className="rounded-xl bg-gray-50 border-gray-200 text-xs resize-none"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-800 space-y-1">
                  <span className="font-bold block">Mobile Client Impact:</span>
                  <span>Once published, all Flutter mobile apps will download this bundle on next launch verified by SHA-256.</span>
                </div>
              </CardContent>

              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPublishing}
                  className="rounded-xl h-10 px-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Publishing...
                    </>
                  ) : (
                    "Confirm & Publish"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
