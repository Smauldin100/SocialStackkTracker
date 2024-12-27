import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { StockChart } from '@/components/StockChart';
import { SocialFeed } from '@/components/SocialFeed';
import { AIInsights } from '@/components/AIInsights';
import { SocialSnapshot } from '@/components/SocialSnapshot';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SentimentDashboard } from '@/components/SentimentDashboard';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Share2, Bell, Loader2 } from 'lucide-react';
import { CreatePost } from '@/components/CreatePost';
import { useToast } from '@/hooks/use-toast';
import { generateSocialSnapshot } from '@/lib/openai';

export function Dashboard() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const { user, logout } = useUser();
  const { toast } = useToast();

  const { data: stockData, isLoading: isLoadingStock, error: stockError } = useQuery({
    queryKey: ['/api/stocks', selectedStock],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${selectedStock}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      return response.json();
    },
  });

  const { data: socialPosts, isLoading: isLoadingSocial, error: socialError } = useQuery({
    queryKey: ['/api/social/feed'],
    queryFn: async () => {
      const response = await fetch('/api/social/feed');
      if (!response.ok) {
        throw new Error('Failed to fetch social feed');
      }
      return response.json();
    },
  });

  const { data: sentimentData, isLoading: isLoadingSentiment, error: sentimentError } = useQuery({
    queryKey: ['/api/social/insights'],
    queryFn: async () => {
      if (!socialPosts) return null;
      const response = await fetch('/api/social/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: socialPosts }),
      });
      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }
      return response.json();
    },
    enabled: !!socialPosts,
  });

  const { data: aiInsights, isLoading: isLoadingAI, error: aiError } = useQuery({
    queryKey: ['/api/ai/insights', selectedStock],
    queryFn: async () => {
      if (!stockData) return null;
      const response = await fetch(`/api/ai/insights/${selectedStock}`);
      if (!response.ok) {
        throw new Error('Failed to generate AI insights');
      }
      return response.json();
    },
    enabled: !!stockData,
  });

  useEffect(() => {
    const errors = [
      { error: stockError, message: 'Failed to load stock data' },
      { error: socialError, message: 'Failed to load social feed' },
      { error: sentimentError, message: 'Failed to analyze sentiment' },
      { error: aiError, message: 'Failed to generate AI insights' },
    ];

    errors.forEach(({ error, message }) => {
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
      }
    });
  }, [stockError, socialError, sentimentError, aiError, toast]);

  const plannedFeatures = [
    {
      title: "Advanced AI Analysis",
      description: "Get deeper insights with our advanced AI-powered stock predictions",
      icon: Sparkles,
      status: "Coming Soon"
    },
    {
      title: "Social Media Scheduling",
      description: "Schedule and automate your social media posts",
      icon: Share2,
      status: "In Development"
    },
    {
      title: "Custom Alerts",
      description: "Set up personalized stock price alerts",
      icon: Bell,
      status: "Planned"
    },
    {
      title: "Automated Trading",
      description: "Connect your trading account for automated trades",
      icon: TrendingUp,
      status: "Planned"
    }
  ];

  const { mutateAsync: generateSnapshot, isLoading: isGeneratingSnapshot, error: snapshotError } = useMutation({
    mutationFn: generateSocialSnapshot,
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate social media snapshot',
      });
    },
  });

  const [socialSnapshot, setSocialSnapshot] = useState(null);

  const handleGenerateSnapshot = async () => {
    try {
      const snapshot = await generateSnapshot(selectedStock);
      setSocialSnapshot(snapshot);
    } catch (error) {
      console.error('Failed to generate snapshot:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            Financial Dashboard
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <StockChart 
              symbol={selectedStock}
              data={stockData?.prices || []}
              isLoading={isLoadingStock}
            />

            <AIInsights 
              insights={aiInsights || {
                sentiment: 'neutral',
                summary: '',
                recommendation: '',
                confidence: 0,
              }}
              isLoading={isLoadingAI}
            />

            <SocialSnapshot
              symbol={selectedStock}
              onGenerate={handleGenerateSnapshot}
              snapshot={socialSnapshot}
              isLoading={isGeneratingSnapshot}
              error={snapshotError}
            />

            <SentimentDashboard
              data={sentimentData || {
                positive: 0.33,
                neutral: 0.34,
                negative: 0.33,
                overallMood: 0.5,
                trendingTopics: [],
              }}
              isLoading={isLoadingSentiment}
            />

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {plannedFeatures.map((feature, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-card/80 backdrop-blur-sm border border-border hover:border-primary/50 transition-colors"
                    >
                      <feature.icon className="h-6 w-6 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{feature.title}</h3>
                          <Badge variant="secondary">{feature.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <CreatePost />
            <SocialFeed 
              posts={socialPosts || []}
              isLoading={isLoadingSocial}
            />
          </div>
        </div>
      </main>
    </div>
  );
}