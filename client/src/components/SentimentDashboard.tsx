import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  overallMood: number;
  trendingTopics: string[];
}

interface SentimentDashboardProps {
  data: SentimentData;
  isLoading?: boolean;
}

const COLORS = {
  positive: 'hsl(var(--success))',
  neutral: 'hsl(var(--muted))',
  negative: 'hsl(var(--destructive))',
};

export function SentimentDashboard({ data, isLoading }: SentimentDashboardProps) {
  const chartData = [
    { name: 'Positive', value: data.positive },
    { name: 'Neutral', value: data.neutral },
    { name: 'Negative', value: data.negative },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Brain className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
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
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Overall Mood</h3>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${data.overallMood * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Trending Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.trendingTopics.map((topic, index) => (
                      <motion.span
                        key={topic}
                        className="px-2 py-1 bg-primary/10 rounded-full text-sm"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {topic}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
