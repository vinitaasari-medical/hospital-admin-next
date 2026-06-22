'use client';
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, MoreHorizontal } from "lucide-react";

interface BroadcastPost {
  id: string;
  author: string;
  role: string;
  avatar: string;
  content: string;
  time: string;
  likes: number;
  replies: number;
  shares: number;
}

const posts: BroadcastPost[] = [
  {
    id: "1",
    author: "Dr. Sarah Chen",
    role: "Chief Medical Officer",
    avatar: "SC",
    content: "New COVID-19 protocol updates have been published. All departments please review the updated guidelines by end of week. Priority alert for ICU and ER staff.",
    time: "2h ago",
    likes: 24,
    replies: 8,
    shares: 12,
  },
  {
    id: "2",
    author: "Admin Office",
    role: "System Admin",
    avatar: "AO",
    content: "Scheduled maintenance this Saturday from 2-4 AM. Emergency systems will remain operational. Please save your work before the maintenance window.",
    time: "5h ago",
    likes: 15,
    replies: 3,
    shares: 6,
  },
  {
    id: "3",
    author: "Dr. James Wilson",
    role: "Head of Cardiology",
    avatar: "JW",
    content: "Congratulations to our cardiology team for achieving a 98% patient satisfaction rate this quarter! Outstanding work by everyone involved.",
    time: "1d ago",
    likes: 56,
    replies: 14,
    shares: 20,
  },
];

const BroadcastFeed = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Broadcast Feed</h3>
        <button className="text-sm font-medium text-secondary hover:underline">New Post</button>
      </div>

      <div className="space-y-3">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="rounded-xl bg-card p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary flex-shrink-0">
                {post.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{post.author}</span>
                    <span className="text-xs text-muted-foreground ml-2">{post.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{post.time}</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground leading-relaxed">{post.content}</p>
                <div className="mt-3 flex items-center gap-5">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Heart className="h-3.5 w-3.5" />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-secondary transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="text-xs">{post.replies}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-success transition-colors">
                    <Repeat2 className="h-3.5 w-3.5" />
                    <span className="text-xs">{post.shares}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BroadcastFeed;
