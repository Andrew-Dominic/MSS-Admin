import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SchemesTable, SchemeRow } from "@/components/schemes/SchemesTable";

export const revalidate = 0; // Disable caching for this page

export default async function SchemesPage() {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let schemeList: SchemeRow[] = [];

  try {
    const { data: searchData, error } = await supabaseAdmin.rpc('mss_search_data');
    if (!error && Array.isArray(searchData)) {
      schemeList = searchData.map((item: any) => {
        const profile = item.search_record?.schemeSearchProfile || {};
        const statusRaw = (item.scheme_record?.identity?.status || 'active').toUpperCase();
        const status = statusRaw === 'ACTIVE' ? 'PUBLISHED' : statusRaw;
        
        return {
          id: item.scheme_id,
          scheme_code: item.scheme_id,
          name_en: item.name_en || profile.name || item.scheme_id,
          state: profile.districts?.[0] || 'All India',
          scheme_type: profile.sector || 'General',
          status,
        };
      });
    } else if (error) {
      console.error("Failed to fetch schemes via RPC:", error);
    }
  } catch (err) {
    console.error("SchemesPage fetch error:", err);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Schemes</h1>
          <p className="text-gray-500">Manage, edit, and publish government schemes in the catalog.</p>
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
