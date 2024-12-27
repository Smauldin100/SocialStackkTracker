import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, MessageSquare, BarChart3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SocialMetrics {
  platform: string;
  metrics: {
    posts: number;
    engagements: number;
    sentiment: number;
  };
}

interface TopicTrend {
  topic: string;
  volume: number;
  sentiment: number;
}

interface SocialSnapshotData {
  platforms: SocialMetrics[];
  trending: TopicTrend[];
  insights: string[];
}

interface SocialSnapshotProps {
  onGenerate: () => Promise<void>;
  data: SocialSnapshotData | null;
  isLoading: boolean;
  error: Error | null;
}

export function SocialSnapshot({ onGenerate, data, isLoading, error }: SocialSnapshotProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGenerate = async () => {
    setIsAnimating(true);
    await onGenerate();
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
        <CardTitle className="text-sm font-medium">Social Media Analysis</CardTitle>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isLoading}
          className={isAnimating ? 'animate-spin' : ''}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            'Update Analysis'
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {data ? (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Platform Metrics</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.platforms.map((platform) => (
                    <div
                      key={platform.platform}
                      className="rounded-lg border bg-card p-3"
                    >
                      <div className="text-sm font-medium">{platform.platform}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Posts</div>
                          <div>{platform.metrics.posts}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Engagements</div>
                          <div>{platform.metrics.engagements}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-muted-foreground">Sentiment</div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${platform.metrics.sentiment * 100}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Trending Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.trending.map((topic) => (
                    <motion.span
                      key={topic.topic}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full text-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {topic.topic}
                      <span className="text-xs text-muted-foreground">
                        ({topic.volume})
                      </span>
                    </motion.span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">Key Insights</span>
                </div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {data.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Click "Update Analysis" to analyze social media metrics
          </div>
        )}
      </CardContent>
    </Card>
  );
}