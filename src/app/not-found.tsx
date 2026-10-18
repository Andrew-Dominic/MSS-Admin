import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <h2 className="text-4xl font-bold text-gray-900">404</h2>
      <p className="text-gray-500 text-lg">This page could not be found.</p>
      <Link href="/">
        <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
