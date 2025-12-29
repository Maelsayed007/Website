
'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useAuth } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { History, User, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/page-header';

type ActivityLog = {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: Timestamp;
  path?: string;
};

const actionIcons: Record<string, React.ElementType> = {
    create_client: User,
    update_client: User,
    import_clients: User,
    add_contact_log: FileText,
};

export default function ActivityLogPage() {
  const firestore = useFirestore();
  const { user } = useAuth();

  const logsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'activity_logs'), orderBy('timestamp', 'desc'));
  }, [firestore, user]);

  const { data: logs, isLoading } = useCollection<ActivityLog>(logsQuery);

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
                                    <AvatarFallback>{log.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{log.username}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : ''}
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
