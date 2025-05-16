import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Youtube } from 'lucide-react';

export default function AuthPage() {
  const [secretCode, setSecretCode] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { authenticated, loading, verifyCode } = useAuth();
  
  // Redirect to home if already authenticated
  useEffect(() => {
    if (authenticated) {
      setLocation('/');
    }
  }, [authenticated, setLocation]);
  
  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!secretCode) {
      toast({
        title: "Error",
        description: "Please enter the secret code",
        variant: "destructive"
      });
      return;
    }
    
    const success = await verifyCode(secretCode);
    
    if (success) {
      toast({
        title: "Access Granted",
        description: "Welcome to YouTube Schedule Manager!",
      });
      setLocation('/');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Youtube className="h-12 w-12 text-yt-red" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-yt-red">YouTube Schedule Manager</CardTitle>
          <CardDescription className="text-center">Enter the secret code to access your schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-6 mt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-yt-red" />
                <Label htmlFor="secretCode">Secret Code</Label>
              </div>
              <Input 
                id="secretCode" 
                type="password"
                placeholder="Enter the secret code" 
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required 
                className="text-center text-lg py-6"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-yt-red hover:bg-yt-red-dark py-6 text-lg" 
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Access App'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-center text-gray-500">
            Securely manage your YouTube video uploads with our scheduling tools
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
