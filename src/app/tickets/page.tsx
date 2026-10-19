import { fetchSupportTickets } from "@/app/tickets/actions";
import { TicketsTable } from "@/components/tickets/TicketsTable";

export const revalidate = 0; // Fresh on every request

export default async function TicketsPage() {
  const { data: initialTickets, error } = await fetchSupportTickets();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
            Support Tickets & Bug Reports
          </h1>
          <p className="text-gray-500">
            Real-time feed of issues, bugs, and inquiries submitted by users through the Flutter app.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm">
          Notice: {error}
        </div>
      )}

      <TicketsTable initialTickets={initialTickets || []} />
    </div>
  );
}
