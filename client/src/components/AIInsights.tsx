import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StockAnalysis } from '@/lib/openai';

interface AIInsightsProps {
  insights: StockAnalysis;
  isLoading?: boolean;
}

export function AIInsights({ insights, isLoading }: AIInsightsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const SentimentIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[insights.sentiment];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SentimentIcon className={`h-5 w-5 ${
              insights.sentiment === 'positive' ? 'text-green-500' :
              insights.sentiment === 'negative' ? 'text-red-500' :
              'text-yellow-500'
            }`} />
            <span className="font-semibold">
              {insights.sentiment.charAt(0).toUpperCase() + insights.sentiment.slice(1)} Sentiment
            </span>
            <span className="text-sm text-muted-foreground">
              ({Math.round(insights.confidence * 100)}% confidence)
            </span>
          </div>

          <div className="prose dark:prose-invert">
            <h4>Summary</h4>
            <p className="text-sm">{insights.summary}</p>

            <h4>Recommendation</h4>
            <p className="text-sm">{insights.recommendation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
