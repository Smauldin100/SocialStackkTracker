import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2, TrendingUp, MessageSquare, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SocialFeed } from '@/components/SocialFeed';
import { CreatePost } from '@/components/CreatePost';

// Mock data for demonstration
const marketData = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
  value: Math.random() * 100 + 50
})).reverse();

export function Dashboard() {
  const { user, logout } = useUser();
  const { toast } = useToast();

  const { data: marketInsights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['/api/market-insights'],
    queryFn: async () => {
      const response = await fetch('/api/market-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch market insights');
      }
      return response.json();
    },
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json();
    },
  });


  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            Financial Intelligence Platform
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={() => {
                logout().catch(error => {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to logout. Please try again.',
                  });
                });
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Market Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={marketData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Social Sentiment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Social Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInsights ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Analyzing social media trends and sentiment...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Analysis Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Real-time market analysis and insights...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          <CreatePost />
          <SocialFeed 
            posts={posts || []}
            isLoading={isLoadingPosts}
          />
        </div>
      </main>
    </div>
  );
}