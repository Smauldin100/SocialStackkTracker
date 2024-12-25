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

export async function analyzeStockData(symbol: string, data: any): Promise<StockAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst. Analyze the stock data and provide insights in JSON format with the following structure: { sentiment: 'positive' | 'neutral' | 'negative', summary: string, recommendation: string, confidence: number }",
        },
        {
          role: "user",
          content: `Analyze this stock data for ${symbol}: ${JSON.stringify(data)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to analyze stock data');
  }
}

export interface SocialMediaInsight {
  trending: string[];
  sentiment: number;
  suggestions: string[];
}

export async function analyzeSocialMedia(posts: any[]): Promise<SocialMediaInsight> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze social media posts and provide insights in JSON format with the following structure: { trending: string[], sentiment: number, suggestions: string[] }",
        },
        {
          role: "user",
          content: `Analyze these social media posts: ${JSON.stringify(posts)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to analyze social media data');
  }
}
