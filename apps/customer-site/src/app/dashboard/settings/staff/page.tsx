'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { PlusCircle, Trash2, Pencil, UserCog, Loader2, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getRoleLabel,
  getRolePermissions,
  isSuperAdmin as isSuperAdminFromPermissions,
  normalizePermissions,
  type PermissionMap,
  type StaffRole,
} from '@/lib/auth/permissions';

type AdminUser = {
  id: string;
  username: string;
  display_name: string | null;
  role: StaffRole;
  permissions: PermissionMap;
  is_active?: boolean;
  last_login?: string | null;
};

const ROLE_OPTIONS: StaffRole[] = [
  'super_admin',
  'accountant',
  'customer_support',
  'operations_support',
  'reception',
  'manager',
  'staff',
];

const permissionLabels: Array<{ key: keyof PermissionMap; label: string }> = [
  { key: 'canViewDashboard', label: 'View dashboard' },
  { key: 'canViewBookings', label: 'View bookings' },
  { key: 'canEditBookings', label: 'Edit bookings' },
  { key: 'canDeleteBookings', label: 'Delete bookings' },
  { key: 'canManagePayments', label: 'Manage payments' },
  { key: 'canViewClients', label: 'View clients' },
  { key: 'canEditClients', label: 'Edit clients' },
  { key: 'canViewMessages', label: 'View messages' },
  { key: 'canAccessSettings', label: 'Access settings' },
  { key: 'canManageUsers', label: 'Manage staff users' },
];

const DEFAULT_ROLE: StaffRole = 'staff';

function getDefaultPermissions(role: StaffRole): PermissionMap {
  return normalizePermissions({
    role,
    permissions: getRolePermissions(role),
  });
}

export default function StaffSettingsPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<StaffRole>(DEFAULT_ROLE);
  const [permissionState, setPermissionState] = useState<PermissionMap>(getDefaultPermissions(DEFAULT_ROLE));
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/session', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.user?.id) setCurrentAdminId(String(data.user.id));
    } catch {
      // Ignore; page is protected by proxy.
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch staff users');
      }
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to fetch staff users.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSession();
    fetchUsers();
  }, [fetchSession, fetchUsers]);

  const openNewDialog = () => {
    setEditingUser(null);
    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole(DEFAULT_ROLE);
    setPermissionState(getDefaultPermissions(DEFAULT_ROLE));
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setUsername(user.username || '');
    setDisplayName(user.display_name || user.username || '');
    setPassword('');
    setRole((user.role as StaffRole) || DEFAULT_ROLE);
    setPermissionState(
      normalizePermissions({
        role: user.role,
        permissions: user.permissions,
      })
    );
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (user: AdminUser) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleRoleChange = (nextRole: StaffRole) => {
    setRole(nextRole);
    setPermissionState(getDefaultPermissions(nextRole));
  };

  const handlePermissionChange = (key: keyof PermissionMap, checked: boolean) => {
    setPermissionState((prev) =>
      normalizePermissions({
        role,
        permissions: { ...prev, [key]: checked },
      })
    );
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      if (editingUser) {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            displayName: displayName || username,
            role,
            permissions: permissionState,
            ...(password ? { password } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to update staff user');
        toast({ title: 'Success', description: 'Staff account updated.' });
      } else {
        if (!username || !password) {
          toast({ variant: 'destructive', title: 'Error', description: 'Username and password are required.' });
          setIsProcessing(false);
          return;
        }
        if (password.length < 8) {
          toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 8 characters.' });
          setIsProcessing(false);
          return;
        }
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            displayName: displayName || username,
            role,
            permissions: permissionState,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create staff user');
        toast({ title: 'Success', description: 'Staff account created.' });
      }

      await fetchUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message || 'Request failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(deletingUser.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete staff user');
      toast({ title: 'Success', description: 'Staff account deactivated.' });
      setUsers((prev) => prev.filter((user) => user.id !== deletingUser.id));
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message || 'Request failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadge = (user: AdminUser) => {
    if (isSuperAdminFromPermissions(user)) return <Badge className="bg-purple-600">Super Admin</Badge>;
    return <Badge variant="secondary">{getRoleLabel(user)}</Badge>;
  };

  const isProtectedStaffAccount = (user: AdminUser) => isSuperAdminFromPermissions(user);

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
          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                  <p className="font-semibold">{user.display_name || user.username || 'No name'}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <div className="px-2">{getRoleBadge(user)}</div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} disabled={isProtectedStaffAccount(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(user)}
                    disabled={isProtectedStaffAccount(user) || user.id === currentAdminId}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No staff members</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {editingUser ? 'Edit Staff' : 'Add New Staff'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update role and permissions.' : 'Create a role-based staff account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="staff_user"
                  disabled={isProcessing || !!editingUser}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Display name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Front Desk Team"
                  disabled={isProcessing}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Role</Label>
                <Select value={role} onValueChange={(value) => handleRoleChange(value as StaffRole)} disabled={isProcessing}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {getRoleLabel({ role: option, permissions: getRolePermissions(option) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">{editingUser ? 'New password' : 'Password'}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep' : 'Min 8 chars'}
                  disabled={isProcessing}
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-1">
                {permissionLabels.map(({ key, label }) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-1.5 p-2 rounded border cursor-pointer transition-colors text-xs',
                      permissionState?.[key] ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate staff account?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove access for <strong>{deletingUser?.display_name || deletingUser?.username}</strong>? Existing sessions will be invalidated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
