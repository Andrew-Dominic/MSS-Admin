import { Notice, PageHeader } from "@/components/admin/ui";
import { NotifyUserForm } from "@/components/notifications/NotifyUserForm";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Notifications" description="Send a message to a user's in-app inbox and phone." />
      <Notice tone="info">
        The MSS API currently sends notifications to <strong>one user at a time</strong>. Sending to everyone, or to all users
        in a state when a scheme is published, needs a new endpoint on the MSS server.
      </Notice>
      <NotifyUserForm />
    </div>
  );
}
