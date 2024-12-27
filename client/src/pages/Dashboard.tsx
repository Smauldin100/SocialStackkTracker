import { useQuery } from '@tanstack/react-query';
import { SocialFeed } from '@/components/SocialFeed';
import { CreatePost } from '@/components/CreatePost';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const { user, logout } = useUser();
  const { toast } = useToast();

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
            Social Feed
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