'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  client_name: string;
  client_email: string;
  notes?: string;
  start_time: string; // This is used as createdAt for contact form submissions
  read?: boolean;
  source: 'Website Contact Form';
};

export default function MessagesPage() {
  const { supabase } = useSupabase();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessages = async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('source', 'Website Contact Form')
      .order('start_time', { ascending: false });

    if (data) {
      setMessages(data as Message[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    if (!supabase) return;
    const channel = supabase.channel('messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: 'source=eq.Website Contact Form' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const filteredMessages = useMemo(() => {
    if (filter === 'unread') {
      return messages.filter(m => !m.read);
    }
    return messages;
  }, [messages, filter]);

  const unreadCount = messages.filter(m => !m.read).length;

  const markAsRead = async (messageId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('bookings')
      .update({ read: true })
      .eq('id', messageId);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
    }
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
            {messages.length}
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
                          {message.client_name}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {message.client_email}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.start_time), { addSuffix: true })}
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
                    onClick={() => window.open(`mailto:${message.client_email}`)}
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
