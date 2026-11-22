import { PageHeader, Notice } from "@/components/admin/ui";
import { AppLockPanel } from "@/components/app-lock/AppLockPanel";
import { describeError } from "@/lib/mss/api";
import { getAppLock } from "@/lib/mss/app-lock";
import { isViewOnly } from "@/lib/mss/role";

export const dynamic = "force-dynamic";

export default async function AppLockPage() {
  const viewOnly = await isViewOnly();
  let state;
  let error: string | null = null;
  try {
    state = await getAppLock();
  } catch (e) {
    error = describeError(e);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="App lock"
        description="Lock the MSS app for every user. While it is locked nobody can open the app, sign in, sign out or create an account; the server refuses them. Admins keep access to this panel."
      />
      {error ? <Notice tone="error">{error}</Notice> : <AppLockPanel initial={state!} viewOnly={viewOnly} />}
    </div>
  );
}
