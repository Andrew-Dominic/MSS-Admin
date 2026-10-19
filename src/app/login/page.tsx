import { login } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ error?: string; redirectTo?: string }> 
}) {
  const params = await searchParams;
  const error = params?.error;
  const redirectTo = params?.redirectTo || '/';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F7F9] relative overflow-hidden font-sans p-4">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />

      <Card className="z-10 w-full max-w-md border-none bg-white/95 backdrop-blur-xl shadow-[0px_20px_60px_rgba(0,0,0,0.08)] rounded-3xl">
        <CardHeader className="space-y-2 text-center pb-8 pt-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 mb-4 shadow-lg shadow-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">
            Admin Portal
          </CardTitle>
          <CardDescription className="text-gray-500 font-medium">
            Sign in to manage MSME Schemes
          </CardDescription>
        </CardHeader>
        
        <form action={login}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <CardContent className="space-y-6 px-10">
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 text-center font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email Address</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="admin@example.com"
                required 
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-orange-500 rounded-xl h-12 px-4 shadow-sm" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">Password</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password"
                placeholder="••••••••" 
                required 
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-orange-500 rounded-xl h-12 px-4 shadow-sm" 
              />
            </div>
          </CardContent>
          
          <CardFooter className="pt-4 pb-10 px-10">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30">
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
