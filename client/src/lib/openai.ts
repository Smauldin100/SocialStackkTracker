import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface StockAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  recommendation: string;
  confidence: number;
}

export interface SocialMediaInsight {
  trending: string[];
  sentiment: number;
  suggestions: string[];
}

export interface SocialMediaSnapshot {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  trendingTopics: string[];
  keyInsights: string[];
  volume: number;
  recentMentions: {
    platform: string;
    count: number;
    sentiment: number;
  }[];
}

export async function analyzeStockData(symbol: string, data: any): Promise<StockAnalysis> {
  try {
    const response = await fetch(`/api/ai/insights/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch AI insights');
    }
    return response.json();
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error('Failed to analyze stock data');
  }
}

export async function analyzeSocialMedia(posts: any[]): Promise<SocialMediaInsight> {
  try {
    const response = await fetch('/api/social/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ posts }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch social media insights');
    }

    return response.json();
  } catch (error) {
    console.error('Social media analysis error:', error);
    throw new Error('Failed to analyze social media data');
  }
}

export async function generateSocialSnapshot(symbol: string): Promise<SocialMediaSnapshot> {
  try {
    const response = await fetch(`/api/social/snapshot/${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to generate social media snapshot');
    }
    return response.json();
  } catch (error) {
    console.error('Social snapshot error:', error);
    throw new Error('Failed to generate social media snapshot');
  }
}