"use client";

import { useState } from "react";
import { Send, Bell, Sparkles, Check, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATES } from "@/lib/schema/scheme";
import { dispatchBroadcastNotification, NotificationType } from "@/app/notifications/actions";

const NOTIFICATION_TYPES: { id: NotificationType; label: string; description: string; badgeColor: string }[] = [
  {
    id: "new_schemes",
    label: "New Scheme Alert",
    description: "Alert users about newly added central/state schemes",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "reminders",
    label: "Deadline Reminder",
    description: "Upcoming subsidy or financial year intake cutoffs",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    id: "updates",
    label: "Policy & Guideline Update",
    description: "Eligibility amendments or revised subsidy rates",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    id: "profile",
    label: "Profile & Udyam Notice",
    description: "Prompt users to update business stage or documents",
    badgeColor: "bg-purple-100 text-purple-800",
  },
];

export function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationType>("new_schemes");
  const [targetState, setTargetState] = useState("All India");
  const [targetGender, setTargetGender] = useState("All");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setStatusMsg({ type: "error", text: "Please enter both a title and message." });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const res = await dispatchBroadcastNotification({
      title: title.trim(),
      message: message.trim(),
      notificationType,
      targetState,
      targetGender,
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: `Broadcast delivered successfully to ${res.recipientsCount} registered mobile user(s)!`,
      });
      setTitle("");
      setMessage("");
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to dispatch notification.",
      });
    }
  };

  const selectedTypeObj = NOTIFICATION_TYPES.find((t) => t.id === notificationType);

  return (
    <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
      <CardHeader className="border-b border-gray-100 pb-6 px-8 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-500" /> Dispatch Mobile Notification
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Broadcast push notifications directly to the Flutter app&apos;s live notification feed.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">
            Realtime Stream
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl text-sm flex items-center gap-3 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {statusMsg.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="font-medium">{statusMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Notification Category */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold block">Notification Category</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {NOTIFICATION_TYPES.map((t) => {
                const isSelected = notificationType === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setNotificationType(t.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{t.label}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{t.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title" className="text-gray-700 font-semibold">
                Announcement Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New 35% Capital Subsidy Scheme Open for Women Entrepreneurs"
                className="h-11 rounded-xl bg-gray-50/70 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-message" className="text-gray-700 font-semibold">
                Message Body <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="notif-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Provide clear details, eligibility pointers, or application deadlines for MSME owners..."
                className="rounded-xl bg-gray-50/70 border-gray-200 resize-none"
              />
            </div>
          </div>

          {/* Demographic Targeting */}
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="target-state" className="text-xs font-semibold text-gray-700">
                Geographic Scope (Target State)
              </Label>
              <select
                id="target-state"
                value={targetState}
                onChange={(e) => setTargetState(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-gender" className="text-xs font-semibold text-gray-700">
                Demographic Filter (Gender)
              </Label>
              <select
                id="target-gender"
                value={targetGender}
                onChange={(e) => setTargetGender(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="All">All Registered Users</option>
                <option value="Female">Women Business Owners Only</option>
                <option value="Male">Male Entrepreneurs</option>
              </select>
            </div>
          </div>

          {/* Live Mobile Notification Preview */}
          <div className="border border-orange-200/80 rounded-2xl p-4 bg-gradient-to-br from-orange-50/30 to-amber-50/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Flutter Mobile Feed Preview
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedTypeObj?.badgeColor}`}>
                {selectedTypeObj?.label}
              </span>
            </div>

            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 leading-tight">
                  {title || "Notification headline appears here"}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {message || "The detailed announcement message body will be displayed here for the mobile app user."}
                </p>
                <span className="text-[10px] text-gray-400 font-medium mt-1.5 block">Just now • {targetState}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-11 px-8 font-semibold flex items-center gap-2"
            >
              {isSubmitting ? (
                <>Dispatching to Users...</>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
