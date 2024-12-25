import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BsTwitterX, BsLinkedin, BsFacebook } from 'react-icons/bs';

interface SocialPost {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook';
  author: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  engagement: {
    likes: number;
    shares: number;
  };
}

interface SocialFeedProps {
  posts: SocialPost[];
  isLoading?: boolean;
}

const platformIcons = {
  twitter: BsTwitterX,
  linkedin: BsLinkedin,
  facebook: BsFacebook,
};

export function SocialFeed({ posts, isLoading }: SocialFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Social Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {posts.map((post) => {
              const PlatformIcon = platformIcons[post.platform];

              return (
                <div key={post.id} className="flex items-start space-x-4 p-4 rounded-lg bg-card">
                  <Avatar>
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{post.author.name}</span>
                        <PlatformIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm">{post.content}</p>

                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {post.engagement.likes} likes
                      </Badge>
                      <Badge variant="secondary">
                        {post.engagement.shares} shares
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}