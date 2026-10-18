export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <div className="relative flex flex-col items-center p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-[0px_10px_40px_rgba(0,0,0,0.04)] border border-gray-100">
        {/* Animated Double Ring Spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-orange-200 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]"></div>
        </div>
        
        {/* Text and Status */}
        <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Content</h3>
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <span>Fetching latest data</span>
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce"></span>
          </span>
        </p>
      </div>
    </div>
  );
}
