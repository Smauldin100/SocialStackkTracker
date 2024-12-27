import { useToast } from '@/hooks/use-toast';

interface SocialMediaPost {
  content: string;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  timestamp: string;
  author: {
    name: string;
    id: string;
    profileUrl?: string;
  };
}

class SocialMediaService {
  private static instance: SocialMediaService;

  private constructor() {}

  static getInstance(): SocialMediaService {
    if (!SocialMediaService.instance) {
      SocialMediaService.instance = new SocialMediaService();
    }
    return SocialMediaService.instance;
  }
}

export const socialMediaService = SocialMediaService.getInstance();
export type { SocialMediaPost };