"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface SchemeRow {
  id: string;
  scheme_code: string;
  name_en: string;
  state: string;
  scheme_type: string;
  status: string;
}

interface SchemesTableProps {
  initialSchemes: SchemeRow[];
}

export function SchemesTable({ initialSchemes }: SchemesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialSchemes.forEach((s) => {
      if (s.scheme_type && s.scheme_type !== "N/A") {
        set.add(s.scheme_type);
      }
    });
    return Array.from(set).sort();
  }, [initialSchemes]);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return initialSchemes.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.scheme_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.state.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "ALL" || s.scheme_type === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [initialSchemes, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredSchemes.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSchemes.slice(start, start + pageSize);
  }, [filteredSchemes, currentPage, pageSize]);

  return (
    <div>
      <div className="border-b border-gray-100 pb-4 px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search schemes by name, code, or state..."
            className="flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Filter:</span>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter schemes by category"
            className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <option value="ALL">All Categories ({initialSchemes.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">Scheme Code & Name</th>
              <th className="px-6 py-4 font-medium">Target State</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((scheme) => (
              <tr key={scheme.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 line-clamp-1">{scheme.name_en}</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">{scheme.scheme_code || "N/A"}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{scheme.state || "All India"}</td>
                <td className="px-6 py-4 text-gray-600">{scheme.scheme_type || "General"}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      scheme.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : scheme.status === "DRAFT"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {scheme.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/schemes/new`}>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {filteredSchemes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-medium text-gray-700">No matching schemes found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search query or category filter</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
