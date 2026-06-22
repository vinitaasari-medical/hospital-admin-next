'use client';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  className?: string;
}

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon, className }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-xl bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-secondary" />
        </div>
      </div>
      {change && (
        <p className={cn(
          "mt-3 text-xs font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </motion.div>
  );
};

export default StatCard;
