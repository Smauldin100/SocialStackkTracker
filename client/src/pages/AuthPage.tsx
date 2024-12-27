import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/lib/appwrite";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { SiTiktok } from "react-icons/si";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { login } = useUser();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.createEmailSession(email, password);
      await login({ username: email, password });
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to login with Google",
        variant: "destructive",
      });
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await authService.signInWithFacebook();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to login with Facebook",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-w-md mx-4 backdrop-blur-sm bg-background/95 border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Social Media Hub
          </CardTitle>
          <CardDescription>
            Manage all your social media accounts in one place
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full gap-2"
            >
              <FcGoogle className="w-5 h-5" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={handleFacebookLogin}
              className="w-full gap-2"
            >
              <FaFacebook className="w-5 h-5 text-blue-600" />
              Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Don't have an account? Contact your administrator</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}