'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  MailOpen,
  Inbox,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  clientName: string;
  clientEmail: string;
  notes?: string;
  startTime: string; // This is used as createdAt for contact form submissions
  read?: boolean;
  source: 'Website Contact Form';
};

export default function MessagesPage() {
  const firestore = useFirestore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const messagesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'bookings'),
      where('source', '==', 'Website Contact Form'),
      orderBy('startTime', 'desc')
    );
  }, [firestore]);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (filter === 'unread') {
      return messages.filter(m => !m.read);
    }
    return messages;
  }, [messages, filter]);

  const unreadCount = messages?.filter(m => !m.read).length || 0;

  const markAsRead = async (messageId: string) => {
    if (!firestore) return;
    const messageRef = doc(firestore, 'bookings', messageId);
    await updateDoc(messageRef, { read: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="View and respond to customer inquiries"
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none border-b-2 border-transparent px-4",
            filter === 'all' && "border-primary text-primary"
          )}
          onClick={() => setFilter('all')}
        >
          All Messages
          <Badge variant="secondary" className="ml-2">
            {messages?.length || 0}
          </Badge>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none border-b-2 border-transparent px-4",
            filter === 'unread' && "border-primary text-primary"
          )}
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Messages List */}
      <div className="table-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredMessages.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "group flex items-start gap-4 p-6 transition-colors hover:bg-muted/30",
                  !message.read && "bg-primary/5"
                )}
              >
                {/* Read Indicator */}
                <div className="flex-shrink-0 pt-1">
                  {message.read ? (
                    <MailOpen className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-semibold truncate",
                          !message.read && "text-foreground"
                        )}>
                          {message.clientName}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {message.clientEmail}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.startTime), { addSuffix: true })}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.notes?.replace('Contact Form Message: ', '')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!message.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => markAsRead(message.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(`mailto:${message.clientEmail}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title={filter === 'all' ? "No messages yet" : `No ${filter} messages`}
            description={
              filter === 'all'
                ? "Customer messages will appear here"
                : `You have no ${filter} messages`
            }
          />
        )}
      </div>
    </div>
  );
}