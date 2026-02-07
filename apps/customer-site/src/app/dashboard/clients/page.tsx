'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  ExternalLink,
  ShieldAlert,
  Key,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClientDialog } from '@/components/client-dialog';
import { ClientDetailsDialog } from '@/components/client-details-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { deleteUserAction, updateUserEmailAction, updateUserPasswordAction } from '@/lib/actions/auth';

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  bookingIds?: string[];
  contactLogs?: Array<{
    timestamp: string;
    note: string;
    staffMember: string;
  }>;
};

export default function ClientsPage() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Clients
  useEffect(() => {
    if (!supabase) return;
    const fetchClients = async () => {
      setIsLoading(true);

      // Fetch from profiles where they are "Clients" (role='client' or no dashboard access)
      const { data: profileClients, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profileClients) {
        // Filter for Clients Only: No dashboard access and not the primary admin
        const clientUsers = profileClients.filter((p: any) => {
          const isStaff = p.permissions?.isSuperAdmin || p.permissions?.canViewDashboard;
          const isPrimaryAdmin = p.email === 'myasserofficial@gmail.com';
          return !isStaff && !isPrimaryAdmin;
        });

        setClients(clientUsers.map((c: any) => ({
          id: c.id,
          name: c.username || c.email.split('@')[0],
          email: c.email,
          phone: c.phone || '',
          createdAt: c.created_at,
          bookingIds: [], // We'd need to fetch these from bookings table separately if needed
          contactLogs: [],
          isAuthUser: true
        })));
      }
      setIsLoading(false);
    };

    fetchClients();

    // Subscribe to realtime changes? Optional but good.
    const channel = supabase.channel('clients_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, payload => {
        // Re-fetch or simplistic update
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [supabase, addDialogOpen, editDialogOpen]); // Refetch when dialog closes (simplistic sync)


  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(
      client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        (client.phone && client.phone.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  const handleDelete = async () => {
    if (!selectedClient) return;
    setIsProcessing(true);
    try {
      const result = await deleteUserAction(selectedClient.id);
      if (!result.success) throw new Error(result.error);

      toast({ title: 'Success', description: 'Client account deleted.' });
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!selectedClient || !newEmail) return;
    setIsProcessing(true);
    try {
      const result = await updateUserEmailAction(selectedClient.id, newEmail);
      if (!result.success) throw new Error(result.error);

      toast({ title: 'Success', description: 'Client email updated.' });
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, email: newEmail } : c));
      setIsEmailDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedClient || !newPassword) return;
    setIsProcessing(true);
    try {
      const result = await updateUserPasswordAction(selectedClient.id, newPassword);
      if (!result.success) throw new Error(result.error);

      toast({ title: 'Success', description: 'Client password updated.' });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your customer database and relationships"
        actions={
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
        </div>
      </div>

      {/* Clients Table */}
      <div className="table-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <table className="professional-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Bookings</th>
                <th>Last Contact</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const bookingCount = client.bookingIds?.length || 0;
                const lastContact = client.contactLogs?.[0];

                return (
                  <tr key={client.id}>
                    {/* Client Name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Member since {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <a
                            href={`mailto:${client.email}`}
                            className="text-foreground hover:text-primary transition-colors"
                          >
                            {client.email}
                          </a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <a
                              href={`tel:${client.phone}`}
                              className="text-foreground hover:text-primary transition-colors"
                            >
                              {client.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Bookings */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                          {bookingCount}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {bookingCount === 1 ? 'booking' : 'bookings'}
                        </span>
                      </div>
                    </td>

                    {/* Last Contact */}
                    <td>
                      {lastContact ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(lastContact.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedClient(client);
                            setNewEmail(client.email);
                            setIsEmailDialogOpen(true);
                          }}
                          title="Update Email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                          onClick={() => {
                            setSelectedClient(client);
                            setNewPassword('');
                            setIsPasswordDialogOpen(true);
                          }}
                          title="Change Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedClient(client);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete Client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={Users}
            title={searchQuery ? "No clients found" : "No clients yet"}
            description={
              searchQuery
                ? "Try adjusting your search query"
                : "Add your first client to get started"
            }
            action={
              !searchQuery
                ? {
                  label: "Add Client",
                  onClick: () => setAddDialogOpen(true),
                }
                : undefined
            }
          />
        )}
      </div>

      {/* Add Client Dialog */}
      <ClientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        mode="add"
      />

      {/* Edit Client Dialog */}
      <ClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={selectedClient}
        mode="edit"
      />

      {/* Client Details Dialog */}
      <ClientDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        client={selectedClient}
        onEdit={() => {
          setDetailsDialogOpen(false);
          // A short delay to prevent UI glitch while dialogs transition
          setTimeout(() => setEditDialogOpen(true), 150);
        }}
        onDelete={() => {
          setDetailsDialogOpen(false);
          setTimeout(() => setDeleteDialogOpen(true), 150);
        }}
      />

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Client Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{selectedClient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleUpdatePassword} disabled={isProcessing || newPassword.length < 6}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Client Email</DialogTitle>
            <DialogDescription>
              Change the email address for <strong>{selectedClient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-email">New Email Address</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="client@example.com"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleUpdateEmail} disabled={isProcessing || !newEmail}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for <strong>{selectedClient?.name}</strong> from the system.
              They will no longer be able to log in or see their bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Client Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
