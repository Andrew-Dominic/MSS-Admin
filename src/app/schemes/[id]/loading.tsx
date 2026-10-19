import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EditSchemeLoading() {
  return (
    <div className="max-w-4xl mx-auto my-8 animate-pulse space-y-4">
      <div className="h-5 w-48 bg-gray-200 rounded-lg" />
      <Card className="border-none bg-white rounded-3xl shadow-[0px_20px_60px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardHeader className="border-b border-gray-100 p-10 bg-gray-50/50 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-32 bg-gray-200 rounded-full" />
                <div className="h-5 w-24 bg-gray-200 rounded-full" />
              </div>
              <div className="h-8 w-64 bg-gray-200 rounded-xl" />
              <div className="h-4 w-96 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-xl" />
          </div>
          <div className="flex justify-between pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gray-200" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-10 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 h-11 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-100 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-11 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-28 bg-gray-100 rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}
