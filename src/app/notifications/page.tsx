import { PageHeader } from "@/components/admin/ui";
import { BroadcastForm } from "@/components/notifications/BroadcastForm";
import { broadcastsSupported } from "@/lib/mss/schemes";
import { NotifyUserForm } from "@/components/notifications/NotifyUserForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ broadcast?: string | string[] }>;
}) {
  const [{ broadcast }, supported] = await Promise.all([searchParams, broadcastsSupported()]);
  const id = typeof broadcast === "string" && UUID.test(broadcast) ? broadcast : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description="Send messages to users' in-app inbox and phones. Publishing schemes with “Notify users” sends a New schemes notification automatically."
      />
      <BroadcastForm initialBroadcastId={id} supported={supported} />
      <NotifyUserForm />
    </div>
  );
}
