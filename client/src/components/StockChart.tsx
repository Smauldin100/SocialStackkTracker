import { useEffect, useState } from 'react';
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface StockChartProps {
  symbol: string;
  data: {
    timestamp: string;
    price: number;
    volume: number;
  }[];
  isLoading?: boolean;
}

export function StockChart({ symbol, data, isLoading }: StockChartProps) {
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    setChartData(data);
  }, [data]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="backdrop-blur-xl bg-card/80 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle><Skeleton className="h-4 w-[100px]" /></CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.01 }}
        className="transition-all duration-300"
      >
        <Card className="backdrop-blur-xl bg-card/80 border-primary/20 shadow-lg hover:shadow-primary/20 hover:border-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">{symbol}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="h-[300px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }}
                    wrapperStyle={{
                      outline: 'none'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    filter="url(#glow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}