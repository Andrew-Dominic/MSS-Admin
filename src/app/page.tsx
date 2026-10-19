import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resolveSchemeCategory } from "@/lib/schema/scheme";
import { getOverrides } from "@/lib/catalogOverrides";
import { formatDate } from "@/lib/dateUtils";

export const revalidate = 0; // Disable caching

export default async function DashboardPage() {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch real scheme catalog data via hardened service RPC
  let totalSchemes = 0;
  let activePublished = 0;
  let draftsPending = 0;
  let recentSchemes: any[] = [];

  try {
    const overrides = getOverrides();
    const { data: searchData, error } = await supabaseAdmin.rpc('mss_search_data');
    if (!error && Array.isArray(searchData) && searchData.length > 0) {
      const allSchemes = searchData
        .map((item: any) => {
          const profile = item.search_record?.schemeSearchProfile || {};
          const ov = overrides[item.scheme_id];
          const nameEn = ov?.name_en || item.name_en || profile.name || item.scheme_id;

          // Exclude test records and deleted items from dashboard stats
          if (
            ov?.isDeleted ||
            nameEn.toLowerCase().includes("test scheme") ||
            nameEn.toLowerCase().includes("autonomous e2e")
          ) {
            return null;
          }

          const defaultStatusRaw = (item.scheme_record?.identity?.status || 'active').toUpperCase();
          let status = ov?.status || defaultStatusRaw;
          if (status === 'ACTIVE') status = 'PUBLISHED';
          else if (status === 'INACTIVE') status = 'DISABLED';

          const rawCode = ov?.scheme_code || profile.schemeId || item.scheme_record?.identity?.code || item.scheme_id;
          const schemeCode = (rawCode && !rawCode.includes("-"))
            ? rawCode
            : (rawCode ? `SCH${rawCode.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "SCH000001");

          const schemeType = resolveSchemeCategory(item.scheme_record, profile, ov);

          return {
            id: item.scheme_id,
            scheme_code: schemeCode,
            name_en: nameEn,
            state: ov?.state || profile.districts?.[0] || 'All India',
            scheme_type: schemeType,
            status,
            updated_at: item.scheme_record?.identity?.updated_at || new Date().toISOString(),
          };
        })
        .filter(Boolean) as any[];

      totalSchemes = allSchemes.length;
      activePublished = allSchemes.filter((s: any) => s.status === 'PUBLISHED').length;
      draftsPending = allSchemes.filter((s: any) => s.status === 'DRAFT').length;
      recentSchemes = allSchemes.slice(0, 4);
    } else {
      // Direct query fallback from catalog.scheme
      const { data: dbSchemes, error: dbError } = await supabaseAdmin
        .schema('catalog')
        .from('scheme')
        .select('id, scheme_code, name_en, state, scheme_type, status, updated_at, record_json')
        .order('updated_at', { ascending: false });

      if (!dbError && Array.isArray(dbSchemes)) {
        const filtered = dbSchemes.filter((s: any) => 
          !s.name_en?.toLowerCase().includes("test scheme") &&
          !s.name_en?.toLowerCase().includes("autonomous e2e")
        );
        totalSchemes = filtered.length;
        activePublished = filtered.filter((s: any) => (s.status || '').toUpperCase() === 'PUBLISHED').length;
        draftsPending = filtered.filter((s: any) => (s.status || '').toUpperCase() === 'DRAFT').length;
        recentSchemes = filtered.slice(0, 4).map((s: any) => ({
          id: s.id,
          scheme_code: s.scheme_code || `SCH${s.id.slice(0, 6).toUpperCase()}`,
          name_en: s.name_en,
          state: s.state || 'All India',
          scheme_type: resolveSchemeCategory(s.record_json, null, null, s.scheme_type),
          status: s.status || 'DRAFT',
          updated_at: s.updated_at || new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.error("Dashboard metrics fetch error:", err);
  }

  // Fetch open bug reports / support tickets
  let openTicketsCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    openTicketsCount = count || 0;
  } catch (err) {
    console.error("Failed to query open tickets count:", err);
  }

  const schemeList = recentSchemes;
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Admin. Here is what is happening today.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/schemes/new">
            <Button className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-11 px-6 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Add New Scheme
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Total Schemes</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-gray-900">{totalSchemes || 0}</div>
            <p className="text-xs text-green-500 font-medium mt-1">Live from database</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Active Published</CardTitle>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-gray-900">{activePublished || 0}</div>
            <p className="text-xs text-gray-400 font-medium mt-1">Live in catalog</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
            <CardTitle className="text-sm font-medium text-gray-500">Drafts Pending</CardTitle>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-3xl font-bold text-gray-900">{draftsPending || 0}</div>
            <p className="text-xs text-orange-500 font-medium mt-1">Require review</p>
          </CardContent>
        </Card>

        <Link href="/tickets" className="block group">
          <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl transition-all group-hover:shadow-[0px_10px_40px_rgba(239,68,68,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                Bug Reports
              </CardTitle>
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-bold text-gray-900">{openTicketsCount} Open</div>
              <p className="text-xs text-rose-500 font-medium mt-1">Live from Flutter app</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 pb-4 mb-4 px-6 pt-6 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900">Recent Schemes</CardTitle>
            <Link href="/schemes" className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">
              View all schemes
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Scheme Name</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schemeList.map((scheme: any) => (
                    <tr key={scheme.id} className="hover:bg-orange-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/schemes/${scheme.id}`} className="block group-hover:text-orange-600 transition-colors">
                          <div className="font-semibold text-gray-900 group-hover:text-orange-600 line-clamp-1">{scheme.name_en}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{scheme.scheme_code}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{scheme.scheme_type || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scheme.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                          scheme.status === 'DRAFT' ? 'bg-orange-100 text-orange-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {scheme.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{formatDate(scheme.updated_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/schemes/${scheme.id}`}>
                          <Button size="sm" className="h-8 px-3 rounded-lg bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white border border-orange-200 text-xs font-semibold shadow-none transition-all">
                            Edit →
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {schemeList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No schemes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0px_10px_40px_rgba(0,0,0,0.04)] bg-white rounded-3xl">
          <CardHeader className="border-b border-gray-100 pb-4 mb-4 px-6 pt-6">
            <CardTitle className="text-lg font-bold text-gray-900">Action Items</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-6">
              <Link href="/tickets" className="flex gap-4 group cursor-pointer hover:bg-gray-50/80 p-2 rounded-2xl -mx-2 transition-colors">
                <div className="w-10 h-10 rounded-full bg-rose-50 shrink-0 flex items-center justify-center text-rose-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    Resolve {openTicketsCount} Bug Reports
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">Directly submitted by citizens via Help &amp; Support.</p>
                </div>
              </Link>
              <Link href="/schemes" className="flex gap-4 group cursor-pointer hover:bg-gray-50/80 p-2 rounded-2xl -mx-2 transition-colors">
                <div className="w-10 h-10 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Review {draftsPending || 0} Drafts</h4>
                  <p className="text-xs text-gray-500 mt-1">Pending approval from content team before publishing.</p>
                </div>
              </Link>
              <Link href="/releases" className="flex gap-4 group cursor-pointer hover:bg-gray-50/80 p-2 rounded-2xl -mx-2 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-50 shrink-0 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Publish Catalog v1.34 &rarr;</h4>
                  <p className="text-xs text-gray-500 mt-1">Manage OTA release packages and push updates to mobile devices.</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
