import { createClient } from "@/lib/supabase/server";

export async function logAdminAction(actionType: string, metadata: any = {}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fire-and-forget: do not await/block the main thread or throw errors to user
    supabase
      .from('audit_logs')
      .insert({
        user_id: user?.id || null,
        actor_type: 'admin',
        action_type: actionType,
        metadata: metadata,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to insert admin audit log", error);
        }
      });
  } catch (error) {
    console.error("Exception in logAdminAction", error);
  }
}
