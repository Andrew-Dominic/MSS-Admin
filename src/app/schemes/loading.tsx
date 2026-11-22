export default function SchemesLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100/80 shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading schemes...</span>
            </div>
          </div>
          <div className="h-4 w-72 bg-gray-200/70 rounded-lg animate-pulse" />
        </div>
        <div className="h-11 w-36 bg-blue-200 rounded-xl animate-pulse" />
      </div>

      {/* Main Table Card Skeleton */}
      <div className="bg-white rounded-3xl shadow-[0px_10px_40px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100/60 p-6 space-y-6">
        {/* Search & Filter Bar Skeletons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-gray-100">
          <div className="h-10 w-full sm:w-80 bg-gray-100 rounded-xl animate-pulse" />
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-10 w-28 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-4 h-3 bg-gray-100 rounded animate-pulse" />
            <div className="col-span-3 h-3 bg-gray-100 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-100 rounded animate-pulse" />
            <div className="col-span-2 h-3 bg-gray-100 rounded animate-pulse" />
            <div className="col-span-1 h-3 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Skeleton Rows */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 items-center px-4 py-4 rounded-2xl bg-gray-50/50 border border-gray-100/80 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="col-span-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                <div className="h-3 bg-gray-100 rounded-md w-1/2" />
              </div>
              <div className="col-span-3">
                <div className="h-3.5 bg-gray-200 rounded-md w-2/3" />
              </div>
              <div className="col-span-2">
                <div className="h-6 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="col-span-2">
                <div className="h-6 bg-blue-100/60 rounded-full w-24" />
              </div>
              <div className="col-span-1 flex justify-end">
                <div className="h-8 w-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
