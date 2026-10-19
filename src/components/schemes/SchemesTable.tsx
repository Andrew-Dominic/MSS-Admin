"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toggleSchemeStatus, deleteScheme, quickUpdateScheme } from "@/app/schemes/actions";
import { STATES, SCHEME_CATEGORIES } from "@/lib/schema/scheme";
import { 
  Pencil, 
  Trash2, 
  Power, 
  PowerOff, 
  AlertTriangle, 
  Check, 
  X, 
  Loader2, 
  Filter, 
  Search,
  ExternalLink,
  SlidersHorizontal
} from "lucide-react";

export interface SchemeRow {
  id: string;
  scheme_code: string;
  name_en: string;
  state: string;
  scheme_type: string;
  status: string;
  is_active?: boolean;
}

interface SchemesTableProps {
  initialSchemes: SchemeRow[];
}

export function SchemesTable({ initialSchemes }: SchemesTableProps) {
  const [schemes, setSchemes] = useState<SchemeRow[]>(initialSchemes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal & feedback state
  const [schemeToDelete, setSchemeToDelete] = useState<SchemeRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Quick Edit state
  const [schemeToQuickEdit, setSchemeToQuickEdit] = useState<SchemeRow | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<{
    name_en: string;
    scheme_code: string;
    state: string;
    scheme_type: string;
    status: string;
  }>({
    name_en: "",
    scheme_code: "",
    state: "All India",
    scheme_type: "Subsidies & Incentives",
    status: "PUBLISHED",
  });
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const handleOpenQuickEdit = (scheme: SchemeRow) => {
    setSchemeToQuickEdit(scheme);
    setQuickEditForm({
      name_en: scheme.name_en,
      scheme_code: scheme.scheme_code,
      state: scheme.state,
      scheme_type: scheme.scheme_type,
      status: scheme.status,
    });
  };

  const handleQuickSave = async () => {
    if (!schemeToQuickEdit) return;
    setIsQuickSaving(true);
    setFeedback(null);
    try {
      const res = await quickUpdateScheme(schemeToQuickEdit.id, quickEditForm);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to update scheme." });
      } else {
        setSchemes((prev) =>
          prev.map((s) =>
            s.id === schemeToQuickEdit.id
              ? {
                  ...s,
                  name_en: quickEditForm.name_en,
                  scheme_code: quickEditForm.scheme_code,
                  state: quickEditForm.state,
                  scheme_type: quickEditForm.scheme_type,
                  status: quickEditForm.status,
                  is_active: quickEditForm.status !== "DISABLED",
                }
              : s
          )
        );
        setFeedback({
          type: "success",
          message: `Scheme "${quickEditForm.name_en}" successfully updated!`,
        });
        setSchemeToQuickEdit(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsQuickSaving(false);
    }
  };

  const [isPending, startTransition] = useTransition();

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    schemes.forEach((s) => {
      if (s.scheme_type && s.scheme_type !== "N/A") {
        set.add(s.scheme_type);
      }
    });
    return Array.from(set).sort();
  }, [schemes]);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.scheme_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.state.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" || s.scheme_type === selectedCategory;

      const matchesStatus =
        selectedStatus === "ALL" || s.status.toUpperCase() === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [schemes, searchTerm, selectedCategory, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredSchemes.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSchemes.slice(start, start + pageSize);
  }, [filteredSchemes, currentPage, pageSize]);

  // Handle status toggle (e.g. PUBLISHED, DRAFT, DISABLED)
  const handleStatusChange = async (schemeId: string, newStatus: string) => {
    setStatusUpdatingId(schemeId);
    setFeedback(null);

    // Optimistic local update
    const previousSchemes = [...schemes];
    setSchemes((prev) =>
      prev.map((s) =>
        s.id === schemeId
          ? { ...s, status: newStatus, is_active: newStatus !== "DISABLED" }
          : s
      )
    );

    try {
      const res = await toggleSchemeStatus(schemeId, newStatus);
      if (!res.success) {
        setSchemes(previousSchemes);
        setFeedback({ type: "error", message: res.error || "Failed to update status." });
      } else {
        setFeedback({
          type: "success",
          message: `Scheme status updated to ${newStatus}.`,
        });
      }
    } catch (err: any) {
      setSchemes(previousSchemes);
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Handle delete confirmed
  const handleConfirmDelete = async () => {
    if (!schemeToDelete) return;
    setIsDeleting(true);
    setFeedback(null);

    const schemeId = schemeToDelete.id;
    const schemeTitle = schemeToDelete.name_en;

    try {
      const res = await deleteScheme(schemeId);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to delete scheme." });
      } else {
        setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        setFeedback({
          type: "success",
          message: `Scheme "${schemeTitle}" successfully removed from catalog.`,
        });
        setSchemeToDelete(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-6 p-4 rounded-2xl flex items-center justify-between text-sm transition-all duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="border-b border-gray-100 pb-4 px-6 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search schemes by name, code, or state..."
            className="flex h-10 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter schemes by status"
              className="h-10 rounded-xl border border-gray-200 bg-gray-50/70 px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter schemes by category"
              className="h-10 rounded-xl border border-gray-200 bg-gray-50/70 px-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-[200px]"
            >
              <option value="ALL">All Categories ({schemes.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Scheme Code & Name</th>
              <th className="px-6 py-4 font-semibold">Target State</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Status Control</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((scheme) => {
              const isUpdating = statusUpdatingId === scheme.id;
              const isDraft = scheme.status === "DRAFT";
              const isPublished = scheme.status === "PUBLISHED" || scheme.status === "ACTIVE";
              const isDisabled = scheme.status === "DISABLED" || scheme.is_active === false;

              return (
                <tr key={scheme.id} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-6 py-4 max-w-sm">
                    <div className="font-semibold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {scheme.name_en}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        {scheme.scheme_code || scheme.id}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                      scheme.state === "All India" 
                        ? "bg-blue-50 text-blue-700 border border-blue-200" 
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}>
                      {scheme.state || "All India"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    <span className="text-xs text-gray-700 font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                      {scheme.scheme_type || "General"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Status Dropdown / Quick Switcher */}
                    <div className="flex items-center gap-2">
                      <select
                        value={scheme.status}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(scheme.id, e.target.value)}
                        className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : isDraft
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                            : "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200"
                        }`}
                      >
                        <option value="PUBLISHED">Published (Active)</option>
                        <option value="DRAFT">Draft (Under Review)</option>
                        <option value="DISABLED">Disabled (Hidden)</option>
                      </select>

                      {isUpdating && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Quick Enable/Disable toggle button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() =>
                          handleStatusChange(
                            scheme.id,
                            isDisabled ? "PUBLISHED" : "DISABLED"
                          )
                        }
                        title={isDisabled ? "Activate Scheme" : "Disable Scheme"}
                        className={`h-9 w-9 p-0 rounded-xl transition-colors ${
                          isDisabled
                            ? "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                            : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        {isDisabled ? (
                          <Power className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <PowerOff className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Quick Edit Modal Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenQuickEdit(scheme)}
                        title="Quick Edit Scheme"
                        className="h-9 w-9 p-0 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </Button>

                      {/* Full Edit Scheme Button */}
                      <Link href={`/schemes/${scheme.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Full Scheme Editor (Rules & Translations)"
                          className="h-9 w-9 p-0 rounded-xl text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>

                      {/* Delete Scheme Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSchemeToDelete(scheme)}
                        title="Delete Scheme from Catalog"
                        className="h-9 w-9 p-0 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredSchemes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-gray-800">No matching schemes found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search keyword, category, or status filter</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {filteredSchemes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredSchemes.length)} of {filteredSchemes.length} scheme(s)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 mr-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {schemeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Scheme</h3>
                <p className="text-xs text-gray-500">This action removes the scheme from the catalog.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                {schemeToDelete.name_en}
              </p>
              <p className="text-xs font-mono text-gray-500">
                Code: {schemeToDelete.scheme_code || schemeToDelete.id}
              </p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Are you sure you want to permanently delete this scheme? Its localized text in English, Tamil, and Hindi will also be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setSchemeToDelete(null)}
                className="rounded-xl border-gray-200 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Scheme
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {schemeToQuickEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Quick Edit Scheme</h3>
                  <p className="text-xs text-gray-500">Edit primary parameters or open the full 5-step wizard.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchemeToQuickEdit(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Scheme Title</label>
                <input
                  type="text"
                  value={quickEditForm.name_en}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, name_en: e.target.value })}
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Scheme Code</label>
                  <input
                    type="text"
                    value={quickEditForm.scheme_code}
                    onChange={(e) => setQuickEditForm({ ...quickEditForm, scheme_code: e.target.value })}
                    className="w-full text-xs font-mono rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
                  <select
                    value={quickEditForm.status}
                    onChange={(e) => setQuickEditForm({ ...quickEditForm, status: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  >
                    <option value="PUBLISHED">Published (Active)</option>
                    <option value="DRAFT">Draft (Under Review)</option>
                    <option value="DISABLED">Disabled (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Target State</label>
                  <select
                    value={quickEditForm.state}
                    onChange={(e) => setQuickEditForm({ ...quickEditForm, state: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
                  <select
                    value={quickEditForm.scheme_type}
                    onChange={(e) => setQuickEditForm({ ...quickEditForm, scheme_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {SCHEME_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <Link
                href={`/schemes/${schemeToQuickEdit.id}`}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
              >
                Open Full 5-Step Editor <ExternalLink className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isQuickSaving}
                  onClick={() => setSchemeToQuickEdit(null)}
                  className="rounded-xl border-gray-200 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isQuickSaving}
                  onClick={handleQuickSave}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  {isQuickSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
