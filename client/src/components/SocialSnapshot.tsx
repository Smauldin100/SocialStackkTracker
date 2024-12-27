import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, MessageCircle, BarChart3, RefreshCw } from 'lucide-react';
import type { SocialMediaSnapshot } from '@/lib/openai';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialSnapshotProps {
  symbol: string;
  onGenerate: (symbol: string) => Promise<void>;
  snapshot: SocialMediaSnapshot | null;
  isLoading: boolean;
  error: Error | null;
}

export function SocialSnapshot({ symbol, onGenerate, snapshot, isLoading, error }: SocialSnapshotProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGenerate = async () => {
    setIsAnimating(true);
    await onGenerate(symbol);
    setIsAnimating(false);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Social Media Snapshot</CardTitle>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isLoading}
          className={isAnimating ? 'animate-spin' : ''}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            'Generate Snapshot'
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {snapshot ? (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${
                    snapshot.overallSentiment === 'positive' ? 'text-green-500' :
                    snapshot.overallSentiment === 'negative' ? 'text-red-500' :
                    'text-yellow-500'
                  }`} />
                  <span className="font-medium">Overall Sentiment</span>
                </div>
                <span className="text-sm">
                  {snapshot.overallSentiment} ({Math.round(snapshot.confidence * 100)}%)
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-medium">Trending Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {snapshot.trendingTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Key Insights</span>
                </div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {snapshot.keyInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {snapshot.recentMentions.map((mention, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{mention.platform}</span>
                    <span className="font-medium">{mention.count} mentions</span>
                    <span className={`text-xs ${
                      mention.sentiment > 0.6 ? 'text-green-500' :
                      mention.sentiment < 0.4 ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {Math.round(mention.sentiment * 100)}% positive
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Click "Generate Snapshot" to analyze social media sentiment
          </div>
        )}
      </CardContent>
    </Card>
  );
}
