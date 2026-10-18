import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
    const { data: searchData, error } = await supabaseAdmin.rpc('mss_search_data');
    if (!error && Array.isArray(searchData) && searchData.length > 0) {
      const allSchemes = searchData.map((item: any) => {
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
          updated_at: item.scheme_record?.identity?.updated_at || new Date().toISOString(),
        };
      });

      totalSchemes = allSchemes.length;
      activePublished = allSchemes.filter((s: any) => s.status === 'PUBLISHED').length;
      draftsPending = allSchemes.filter((s: any) => s.status === 'DRAFT').length;
      recentSchemes = allSchemes.slice(0, 4);
    } else {
      // Direct query fallback from catalog.scheme
      const { data: dbSchemes, error: dbError } = await supabaseAdmin
        .schema('catalog')
        .from('scheme')
        .select('id, scheme_code, name_en, state, scheme_type, status, updated_at')
        .order('updated_at', { ascending: false });

      if (!dbError && Array.isArray(dbSchemes)) {
        totalSchemes = dbSchemes.length;
        activePublished = dbSchemes.filter((s: any) => (s.status || '').toUpperCase() === 'PUBLISHED').length;
        draftsPending = dbSchemes.filter((s: any) => (s.status || '').toUpperCase() === 'DRAFT').length;
        recentSchemes = dbSchemes.slice(0, 4).map((s: any) => ({
          id: s.id,
          scheme_code: s.scheme_code || s.id,
          name_en: s.name_en,
          state: s.state || 'All India',
          scheme_type: s.scheme_type || 'General',
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
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Admin. Here is what is happening today.</p>
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
          <CardHeader className="border-b border-gray-100 pb-4 mb-4 px-6 pt-6">
            <CardTitle className="text-lg font-bold text-gray-900">Recent Schemes</CardTitle>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schemeList.map((scheme: any) => (
                    <tr key={scheme.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{scheme.name_en}</td>
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
                      <td className="px-6 py-4 text-gray-500">{new Date(scheme.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {schemeList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 shrink-0 flex items-center justify-center text-orange-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Review {draftsPending || 0} Drafts</h4>
                  <p className="text-xs text-gray-500 mt-1">Pending approval from content team before publishing.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 shrink-0 flex items-center justify-center text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Publish Catalog v1.34</h4>
                  <p className="text-xs text-gray-500 mt-1">New scheme updates are ready to be synced to mobile clients.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
