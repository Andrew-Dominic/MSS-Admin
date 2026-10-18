"use client";

import { useState } from "react";
import { Plus, Trash2, Megaphone, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromoAlert, createPromoAlert, deletePromoAlert } from "@/app/notifications/actions";
import { STATES } from "@/lib/schema/scheme";

interface PromoAlertsManagerProps {
  initialAlerts: PromoAlert[];
}

export function PromoAlertsManager({ initialAlerts }: PromoAlertsManagerProps) {
  const [alerts, setAlerts] = useState<PromoAlert[]>(initialAlerts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [badgeText, setBadgeText] = useState("NEW SCHEME");
  const [btnText, setBtnText] = useState("View Details");
  const [targetRoute, setTargetRoute] = useState("schemes");
  const [targetState, setTargetState] = useState("All India");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !badgeText.trim()) return;

    setIsSubmitting(true);
    const res = await createPromoAlert({
      title: title.trim(),
      badge_text: badgeText.trim(),
      btn_text: btnText.trim(),
      target_route: targetRoute,
      target_state: targetState,
    });
    setIsSubmitting(false);

    if (res.success) {
      setAlerts((prev) => [
        {
          id: `temp-${Date.now()}`,
          title: title.trim(),
          badge_text: badgeText.trim(),
          btn_text: btnText.trim(),
          target_route: targetRoute,
          target_state: targetState === "All India" ? null : targetState,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle("");
      setShowAddModal(false);
    } else {
      alert(`Error creating banner: ${res.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this promo alert from the mobile home screen?")) return;
    setDeletingId(id);
    const res = await deletePromoAlert(id);
    setDeletingId(null);
    if (res.success) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert(`Error removing banner: ${res.error}`);
    }
  };

  return (
    <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-gray-100 pb-6 px-8 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-500" /> Mobile Home Carousel Banners
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Configure the prominent promo banner carousel on the mobile app&apos;s home screen.
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(!showAddModal)}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 px-4 h-10 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Home Banner
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        {/* New Banner Form Modal/Card */}
        {showAddModal && (
          <form
            onSubmit={handleCreate}
            className="p-6 rounded-2xl bg-orange-50/40 border border-orange-200/80 space-y-4 animate-in fade-in-50 duration-200"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-600" /> Create New Home Carousel Banner
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-gray-400 hover:text-gray-700 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="banner-title" className="text-xs font-semibold text-gray-700">
                  Banner Headline
                </Label>
                <Input
                  id="banner-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Special 100% Guarantee under CGTMSE for MSEs"
                  className="h-10 rounded-xl bg-white border-gray-200 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-badge" className="text-xs font-semibold text-gray-700">
                  Badge Pill Text
                </Label>
                <Input
                  id="banner-badge"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. NEW SCHEME or CLOSING SOON"
                  className="h-10 rounded-xl bg-white border-gray-200 text-sm uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="btn-text" className="text-xs font-semibold text-gray-700">
                  Action Button Label
                </Label>
                <Input
                  id="btn-text"
                  value={btnText}
                  onChange={(e) => setBtnText(e.target.value)}
                  placeholder="View Details"
                  className="h-10 rounded-xl bg-white border-gray-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-route" className="text-xs font-semibold text-gray-700">
                  Target In-App Route
                </Label>
                <select
                  id="target-route"
                  value={targetRoute}
                  onChange={(e) => setTargetRoute(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm"
                >
                  <option value="schemes">Schemes Discovery Catalog</option>
                  <option value="notifications">Notifications Center</option>
                  <option value="categories">Categories & Calculators</option>
                  <option value="profile">Profile & Assessment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-state" className="text-xs font-semibold text-gray-700">
                  Target State (or All India)
                </Label>
                <select
                  id="banner-state"
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm"
                >
                  {STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-6 h-10 text-xs font-semibold"
              >
                {isSubmitting ? "Publishing Banner..." : "Publish to Mobile Home"}
              </Button>
            </div>
          </form>
        )}

        {/* List of Active Home Banners */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-gray-600">No active home screen banners</p>
              <p className="text-xs mt-1">Click &ldquo;Add Home Banner&rdquo; to broadcast an alert banner to mobile users.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white border border-orange-100 flex items-center justify-between gap-4 group hover:shadow-sm transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white">
                      {alert.badge_text}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Scope: {alert.target_state || "Pan-India"}
                    </span>
                    <span className="text-xs text-gray-400">• Route: {alert.target_route || "schemes"}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 truncate">{alert.title}</h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 flex items-center gap-1">
                    {alert.btn_text || "View"} <ExternalLink className="w-3 h-3 text-gray-400" />
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === alert.id}
                    onClick={() => handleDelete(alert.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
