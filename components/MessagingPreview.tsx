'use client';
import { motion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  read: boolean;
}

const conversations: Message[] = [
  { id: "1", sender: "Dr. Emily Park", avatar: "EP", preview: "The lab results for patient #4521 are ready...", time: "Now", unread: 3, read: false },
  { id: "2", sender: "Nurse Station B", avatar: "NB", preview: "Shift change report has been submitted.", time: "10m", unread: 0, read: true },
  { id: "3", sender: "Pharmacy Dept", avatar: "PD", preview: "Medication order #782 has been fulfilled.", time: "1h", unread: 1, read: false },
  { id: "4", sender: "Dr. Robert Kim", avatar: "RK", preview: "Can we schedule a consultation for tomorrow?", time: "2h", unread: 0, read: true },
];

const MessagingPreview = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Messages</h3>
        <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
          4 new
        </span>
      </div>

      <div className="space-y-1">
        {conversations.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary flex-shrink-0">
              {msg.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{msg.sender}</span>
                <span className="text-xs text-muted-foreground">{msg.time}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {msg.read ? (
                  <CheckCheck className="h-3 w-3 text-secondary flex-shrink-0" />
                ) : (
                  <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                <p className="text-xs text-muted-foreground truncate">{msg.preview}</p>
              </div>
            </div>
            {msg.unread > 0 && (
              <span className="h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {msg.unread}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessagingPreview;
