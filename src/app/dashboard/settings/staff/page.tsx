'use client';

import { useState, useEffect } from 'react';
import { useAuth, useSupabase } from '@/components/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Pencil, UserCog, Loader2, User, Lock, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { createStaffUserAction, updateStaffPermissionsAction, deleteUserAction } from '@/lib/actions/auth';

type Permissions = {
  isSuperAdmin?: boolean;
  canViewDashboard?: boolean;
  canViewHouseboatReservations?: boolean;
  canEditHouseboatReservations?: boolean;
  canViewRestaurantReservations?: boolean;
  canEditRestaurantReservations?: boolean;
  canViewDailyTravelReservations?: boolean;
  canEditDailyTravelReservations?: boolean;
  canViewClients?: boolean;
  canEditClients?: boolean;
  canViewMessages?: boolean;
  canAccessSettings?: boolean;
  canManageStaff?: boolean;
}

type UserProfile = {
  id: string;
  username: string;
  email: string;
  permissions: Permissions;
};

const permissionLabels: { key: keyof Permissions, label: string }[] = [
  { key: 'canViewDashboard', label: 'Dashboard' },
  { key: 'canViewHouseboatReservations', label: 'View Houseboats' },
  { key: 'canEditHouseboatReservations', label: 'Edit Houseboats' },
  { key: 'canViewRestaurantReservations', label: 'View Restaurant' },
  { key: 'canEditRestaurantReservations', label: 'Edit Restaurant' },
  { key: 'canViewDailyTravelReservations', label: 'View Travel' },
  { key: 'canEditDailyTravelReservations', label: 'Edit Travel' },
  { key: 'canViewClients', label: 'View Clients' },
  { key: 'canEditClients', label: 'Edit Clients' },
  { key: 'canViewMessages', label: 'Messages' },
  { key: 'canAccessSettings', label: 'Settings' },
  { key: 'canManageStaff', label: 'Manage Staff' },
];

const DEFAULT_PERMISSIONS: Permissions = {
  isSuperAdmin: false,
  canViewDashboard: true,
  canViewHouseboatReservations: true,
  canEditHouseboatReservations: false,
  canViewRestaurantReservations: true,
  canEditRestaurantReservations: false,
  canViewDailyTravelReservations: true,
  canEditDailyTravelReservations: false,
  canViewClients: false,
  canEditClients: false,
  canViewMessages: true,
  canAccessSettings: false,
  canManageStaff: false,
}

export default function StaffSettingsPage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user: adminUser } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [permissionState, setPermissionState] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      const staffUsers = (data || []).filter((u: UserProfile) =>
        u.email === 'myasserofficial@gmail.com' ||
        u.permissions?.isSuperAdmin ||
        u.permissions?.canViewDashboard
      );
      setUsers(staffUsers);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch staff.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [supabase]);

  const openNewDialog = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setPermissionState(DEFAULT_PERMISSIONS);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setUsername(user.username || '');
    setPassword('');
    setPermissionState({ ...DEFAULT_PERMISSIONS, ...user.permissions });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (user: UserProfile) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      if (editingUser) {
        const result = await updateStaffPermissionsAction(editingUser.id, permissionState);
        if (!result.success) throw new Error(result.error);
        toast({ title: 'Success', description: 'Permissions updated.' });
      } else {
        if (!username || !password) {
          toast({ variant: 'destructive', title: 'Error', description: 'Username and password required.' });
          setIsProcessing(false);
          return;
        }
        if (password.length < 6) {
          toast({ variant: 'destructive', title: 'Error', description: 'Password min 6 characters.' });
          setIsProcessing(false);
          return;
        }
        const result = await createStaffUserAction({ password, username, permissions: permissionState });
        if (!result.success) throw new Error(result.error);
        toast({ title: 'Success', description: 'Staff member created.' });
      }
      fetchUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsProcessing(true);
    try {
      const result = await deleteUserAction(deletingUser.id);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Success', description: 'Staff deleted.' });
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermissionChange = (key: keyof Permissions, checked: boolean) => {
    setPermissionState(prev => ({ ...prev, [key]: checked }));
  };

  const getRoleBadge = (permissions: Permissions) => {
    if (permissions?.isSuperAdmin) return <Badge className="bg-purple-600">Super Admin</Badge>;
    if (permissions?.canManageStaff) return <Badge className="bg-emerald-600">Admin</Badge>;
    return <Badge variant="secondary">Staff</Badge>;
  }

  const isPrimaryAdmin = (user: UserProfile) => user.email === 'myasserofficial@gmail.com';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground text-sm">Create and manage staff accounts</p>
        </div>
        <Button onClick={openNewDialog} size="sm">
          <PlusCircle className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {users?.map(user => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                  <p className="font-semibold">{user.username || 'No username'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="px-2">{getRoleBadge(user.permissions)}</div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} disabled={isPrimaryAdmin(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(user)}
                    disabled={isPrimaryAdmin(user) || user.id === adminUser?.id}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {users?.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No staff members</p>
            </div>
          )}
        </div>
      )}

      {/* Compact Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {editingUser ? 'Edit Staff' : 'Add New Staff'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update permissions.' : 'Create with username and password.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editingUser && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Username</Label>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="john_doe"
                    disabled={isProcessing}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    disabled={isProcessing}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {editingUser && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{editingUser.username}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium mb-2 block">Permissions</Label>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                {permissionLabels.map(({ key, label }) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-1.5 p-2 rounded border cursor-pointer transition-colors text-xs",
                      permissionState?.[key] ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"
                    )}
                    onClick={() => handlePermissionChange(key, !permissionState?.[key])}
                  >
                    <Checkbox checked={permissionState?.[key] || false} className="h-3 w-3" />
                    <span className="font-medium truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deletingUser?.username}</strong>? They will lose dashboard access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
