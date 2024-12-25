import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockChart } from '@/components/StockChart';
import { SocialFeed } from '@/components/SocialFeed';
import { AIInsights } from '@/components/AIInsights';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Share2, Bell } from 'lucide-react';

export function Dashboard() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const { user, logout } = useUser();

  const { data: stockData, isLoading: isLoadingStock } = useQuery({
    queryKey: ['/api/stocks', selectedStock],
    queryFn: () => fetch(`/api/stocks/${selectedStock}`).then(r => r.json()),
  });

  const { data: socialPosts, isLoading: isLoadingSocial } = useQuery({
    queryKey: ['/api/social/feed'],
    queryFn: () => fetch('/api/social/feed').then(r => r.json()),
  });

  const { data: aiInsights, isLoading: isLoadingAI } = useQuery({
    queryKey: ['/api/ai/insights', selectedStock],
    queryFn: async () => {
      if (!stockData) return null;
      return fetch(`/api/ai/insights/${selectedStock}`).then(r => r.json());
    },
    enabled: !!stockData,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Financial Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
            <ThemeToggle />
            <Button variant="outline" onClick={() => logout()}>Logout</Button>
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

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {plannedFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border">
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

          <div>
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