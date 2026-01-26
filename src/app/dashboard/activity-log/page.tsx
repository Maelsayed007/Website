
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabase, useAuth } from '@/components/providers/supabase-provider';
import { History, User, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/page-header';

type ActivityLog = {
  id: string;
  user_id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
};

const actionIcons: Record<string, React.ElementType> = {
    create_client: User,
    update_client: User,
    import_clients: User,
    add_contact_log: FileText,
};

export default function ActivityLogPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (data) {
      setLogs(data as ActivityLog[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!supabase || !user) return;

    fetchLogs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('activity_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          setLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Track all staff actions and system events"
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Actions
          </CardTitle>
          <CardDescription>
            A real-time log of all significant actions taken by staff members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : logs && logs.length > 0 ? (
                logs.map((log) => {
                    const ActionIcon = actionIcons[log.action] || History;
                    return (
                    <TableRow key={log.id}>
                        <TableCell>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger>
                                     <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                                        <ActionIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{log.action.replace(/_/g, ' ')}</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{log.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{log.username}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ''}
                        </TableCell>
                    </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No activity has been logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
