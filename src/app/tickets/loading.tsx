export default function TicketsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-60 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium border border-orange-100/80 shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading tickets...</span>
            </div>
          </div>
          <div className="h-4 w-80 bg-gray-200/70 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100/80 shadow-xs space-y-3 animate-pulse">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-16 bg-gray-300 rounded" />
          </div>
        ))}
      </div>

      {/* Table Card Skeleton */}
      <div className="bg-white rounded-3xl shadow-[0px_10px_40px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100/60 p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-50/70 rounded-2xl border border-gray-100/60 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
