import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockChart } from '@/components/StockChart';
import { SocialFeed } from '@/components/SocialFeed';
import { AIInsights } from '@/components/AIInsights';
import { ThemeToggle } from '@/components/ThemeToggle';
import { analyzeStockData } from '@/lib/openai';

export function Dashboard() {
  const [selectedStock, setSelectedStock] = useState('AAPL');

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
      return analyzeStockData(selectedStock, stockData);
    },
    enabled: !!stockData,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
