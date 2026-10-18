"use client";

import { useState, useMemo, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicket, TicketStatus, updateTicketStatus } from "@/app/tickets/actions";

interface TicketsTableProps {
  initialTickets: SupportTicket[];
}

export function TicketsTable({ initialTickets }: TicketsTableProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Realtime Supabase Subscription
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel("realtime-support-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTicket = payload.new as SupportTicket;
            setTickets((prev) => {
              if (prev.some((t) => t.id === newTicket.id)) return prev;
              return [newTicket, ...prev];
            });
            setNotification(`New ticket submitted: "${newTicket.category}" by ${newTicket.contact_email}`);
            setTimeout(() => setNotification(null), 5000);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as SupportTicket;
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setTickets((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update status handler
  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setUpdatingId(ticketId);
    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (activeTicket && activeTicket.id === ticketId) {
      setActiveTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    const res = await updateTicketStatus(ticketId, newStatus);
    setUpdatingId(null);
    if (!res.success) {
      alert(`Failed to update ticket: ${res.error}`);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    return { total, open, inProgress, resolved };
  }, [tickets]);

  // Categories present in tickets
  const categories = useMemo(() => {
    const defaults = [
      "Eligibility Matcher Bug",
      "Wrong Scheme Details",
      "Feature Request",
      "General Inquiry",
    ];
    const fromTickets = tickets.map((t) => t.category).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromTickets])).sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        t.contact_email.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query);

      const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
      const matchesStatus = selectedStatus === "ALL" || t.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [tickets, searchTerm, selectedCategory, selectedStatus]);

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "in_progress":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryBadge = (category: string) => {
    if (category.toLowerCase().includes("bug")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (category.toLowerCase().includes("scheme")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (category.toLowerCase().includes("feature")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-6">
      {/* Real-time live toast alert */}
      {notification && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-900 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-orange-700 hover:text-orange-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Total Reports</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
              #
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-gray-900">{metrics.total}</div>
            <p className="text-xs text-gray-500 mt-1">Submitted from Flutter app</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Open Tickets</CardTitle>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-xs">
              !
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-rose-600">{metrics.open}</div>
            <p className="text-xs text-rose-500 mt-1 font-medium">Require developer review</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs">
              ~
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-amber-600">{metrics.inProgress}</div>
            <p className="text-xs text-gray-500 mt-1">Currently being investigated</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">
              ✓
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-emerald-600">{metrics.resolved}</div>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Fixed & completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
        {/* Filters */}
        <div className="border-b border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email, category, or issue details..."
              className="flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter tickets by category"
                className="h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter tickets by status"
                className="h-9 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Ticket ID & Date</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Contact Email</th>
                <th className="px-6 py-4 font-medium">Issue Description</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors group">
                  {/* ID & Date */}
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-semibold text-gray-900">
                      {ticket.id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(ticket.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryBadge(
                        ticket.category
                      )}`}
                    >
                      {ticket.category}
                    </span>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4">
                    <a
                      href={`mailto:${ticket.contact_email}`}
                      className="text-gray-900 hover:text-orange-600 font-medium hover:underline text-xs flex items-center gap-1.5"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 shrink-0"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      {ticket.contact_email}
                    </a>
                  </td>

                  {/* Description */}
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-6 py-4">
                    <select
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) =>
                        handleStatusChange(ticket.id, e.target.value as TicketStatus)
                      }
                      aria-label="Change ticket status"
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${getStatusBadge(
                        ticket.status
                      )}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTicket(ticket)}
                      className="h-8 px-3 rounded-lg text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
                        ✓
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">No support tickets found</p>
                      <p className="text-xs text-gray-400 max-w-sm">
                        When users submit bugs or questions in the Flutter app via Help & Support,
                        they will automatically appear here in real-time.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filteredTickets.length} of {tickets.length} total report(s)</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Supabase Sync Active
            </span>
          </div>
        </div>
      </Card>

      {/* Ticket Details Inspection Modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                      activeTicket.status
                    )}`}
                  >
                    {activeTicket.status.toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadge(
                      activeTicket.category
                    )}`}
                  >
                    {activeTicket.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mt-2">Ticket Inspection</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {activeTicket.id}</p>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block mb-0.5">Contact Email</span>
                  <a
                    href={`mailto:${activeTicket.contact_email}`}
                    className="font-semibold text-gray-900 hover:text-orange-600 hover:underline"
                  >
                    {activeTicket.contact_email}
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Submitted On</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(activeTicket.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                {activeTicket.user_id && (
                  <div className="col-span-2">
                    <span className="text-gray-400 block mb-0.5">Authenticated User ID</span>
                    <span className="font-mono text-gray-700">{activeTicket.user_id}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-gray-400 block mb-1 font-medium">Issue Description</span>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {activeTicket.description}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-medium text-gray-700">Change Status:</span>
                <div className="flex gap-2">
                  {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((st) => (
                    <Button
                      key={st}
                      variant={activeTicket.status === st ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(activeTicket.id, st)}
                      className={`rounded-xl text-xs capitalize ${
                        activeTicket.status === st
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : ""
                      }`}
                    >
                      {st.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs px-5"
                onClick={() => setActiveTicket(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
