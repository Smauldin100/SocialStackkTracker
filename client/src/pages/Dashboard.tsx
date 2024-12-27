import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2, MessageSquare, BarChart3, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialFeed } from '@/components/SocialFeed';
import { CreatePost } from '@/components/CreatePost';

export function Dashboard() {
  const { user, logout } = useUser();
  const { toast } = useToast();

  const { data: socialMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/social-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/social-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch social metrics');
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
            Social Media Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Engagement Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="flex items-center justify-center h-[100px]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{socialMetrics?.totalEngagements || 0}</p>
                  <p className="text-sm text-muted-foreground">Total engagements today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audience Growth Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{socialMetrics?.totalFollowers || 0}</p>
                <p className="text-sm text-muted-foreground">Total followers</p>
              </div>
            </CardContent>
          </Card>

          {/* Post Performance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{socialMetrics?.averageEngagement || '0%'}</p>
                <p className="text-sm text-muted-foreground">Avg. engagement rate</p>
              </div>
            </CardContent>
          </Card>

          {/* Posting Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{socialMetrics?.scheduledPosts || 0}</p>
                <p className="text-sm text-muted-foreground">Scheduled posts</p>
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