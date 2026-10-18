import { fetchRecentBroadcasts, fetchPromoAlerts } from "@/app/notifications/actions";
import { BroadcastForm } from "@/components/notifications/BroadcastForm";
import { PromoAlertsManager } from "@/components/notifications/PromoAlertsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, History, Users } from "lucide-react";

export const revalidate = 0; // Disable caching

export default async function NotificationsPage() {
  const [broadcastsRes, promoRes] = await Promise.all([
    fetchRecentBroadcasts(),
    fetchPromoAlerts(),
  ]);

  const recentBroadcasts = broadcastsRes.data || [];
  const promoAlerts = promoRes.data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Announcements & Mobile Alerts
        </h1>
        <p className="text-gray-500">
          Broadcast push notifications to the Flutter mobile app and manage Home Carousel banners.
        </p>
      </div>

      {/* Broadcast Dispatcher */}
      <BroadcastForm />

      {/* Home Screen Promo Carousel Manager */}
      <PromoAlertsManager initialAlerts={promoAlerts} />

      {/* Recent Dispatches History */}
      <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-4 px-8 pt-8">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" /> Recent Dispatch History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Notification Headline</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Recipients</th>
                  <th className="px-6 py-4 font-medium">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBroadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      No recent broadcasts found in database.
                    </td>
                  </tr>
                ) : (
                  recentBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 line-clamp-1">{b.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{b.message}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {b.notification_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {b.recipient_count} user(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(b.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
