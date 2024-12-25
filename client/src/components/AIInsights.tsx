import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StockAnalysis } from '@/lib/openai';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsProps {
  insights: StockAnalysis;
  isLoading?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function AIInsights({ insights, isLoading }: AIInsightsProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
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
      </motion.div>
    );
  }

  const SentimentIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }[insights.sentiment];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.01 }}
        className="transition-shadow duration-300 hover:shadow-lg"
      >
        <Card>
          <CardHeader>
            <motion.div
              className="flex items-center gap-2"
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Brain className="h-5 w-5" />
              <CardTitle>AI Insights</CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="space-y-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div 
                className="flex items-center gap-2"
                variants={item}
              >
                <SentimentIcon className={`h-5 w-5 ${
                  insights.sentiment === 'positive' ? 'text-green-500' :
                  insights.sentiment === 'negative' ? 'text-red-500' :
                  'text-yellow-500'
                }`} />
                <span className="font-semibold">
                  {insights.sentiment.charAt(0).toUpperCase() + insights.sentiment.slice(1)} Sentiment
                </span>
                <motion.span 
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  ({Math.round(insights.confidence * 100)}% confidence)
                </motion.span>
              </motion.div>

              <motion.div 
                className="prose dark:prose-invert"
                variants={item}
              >
                <h4>Summary</h4>
                <p className="text-sm">{insights.summary}</p>

                <h4>Recommendation</h4>
                <p className="text-sm">{insights.recommendation}</p>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}