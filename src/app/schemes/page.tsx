import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SchemesTable, SchemeRow } from "@/components/schemes/SchemesTable";
import { getOverrides } from "@/lib/catalogOverrides";

export const revalidate = 0; // Disable caching for this page

export default async function SchemesPage() {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let schemeList: SchemeRow[] = [];

  try {
    const overrides = getOverrides();
    const { data: searchData, error } = await supabaseAdmin.rpc("mss_search_data");

    if (!error && Array.isArray(searchData) && searchData.length > 0) {
      schemeList = searchData
        .map((item: any) => {
          const profile = item.search_record?.schemeSearchProfile || {};
          const ov = overrides[item.scheme_id];

          // Exclude deleted schemes
          if (ov?.isDeleted) {
            return null;
          }

          const defaultStatusRaw = (item.scheme_record?.identity?.status || "active").toUpperCase();
          let status = ov?.status || defaultStatusRaw;
          if (status === "ACTIVE") status = "PUBLISHED";
          else if (status === "INACTIVE") status = "DISABLED";

          return {
            id: item.scheme_id,
            scheme_code: ov?.scheme_code || profile.schemeId || item.scheme_id,
            name_en: ov?.name_en || item.name_en || profile.name || item.scheme_id,
            state: ov?.state || profile.districts?.[0] || "All India",
            scheme_type: ov?.scheme_type || profile.sector || "General",
            status,
            is_active: ov?.is_active !== undefined ? ov.is_active : status !== "DISABLED",
          };
        })
        .filter(Boolean) as SchemeRow[];

      // Prepend any newly drafted schemes from overrides that aren't yet in searchData
      for (const [id, ov] of Object.entries(overrides)) {
        if (!ov.isDeleted && !schemeList.some((s) => s.id === id)) {
          schemeList.unshift({
            id,
            scheme_code: ov.scheme_code || id,
            name_en: ov.name_en || "Draft Scheme",
            state: ov.state || "All India",
            scheme_type: ov.scheme_type || "Subsidies & Incentives",
            status: ov.status || "DRAFT",
            is_active: ov.is_active !== undefined ? ov.is_active : true,
          });
        }
      }
    } else if (error) {
      console.warn("mss_search_data RPC error:", error.message);
    }
  } catch (err) {
    console.error("SchemesPage fetch error:", err);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Schemes</h1>
          <p className="text-gray-500">Manage, edit, disable, and publish government schemes in the catalog.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/schemes/new">
            <Button className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-11 px-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add New Scheme
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <SchemesTable initialSchemes={schemeList} />
        </CardContent>
      </Card>
    </div>
  );
}
