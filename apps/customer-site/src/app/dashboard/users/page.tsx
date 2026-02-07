'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Users, Plus, Loader2, Shield, ShieldCheck, ShieldAlert,
    Eye, EyeOff, Pencil, Trash2, X, Check, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminUser {
    id: string;
    username: string;
    display_name: string;
    role: 'super_admin' | 'manager' | 'staff';
    permissions: Record<string, boolean>;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
}

const PERMISSION_LIST = [
    { key: 'canViewDashboard', label: 'View Dashboard', description: 'Access the main dashboard' },
    { key: 'canViewBookings', label: 'View Bookings', description: 'See all reservations' },
    { key: 'canEditBookings', label: 'Edit Bookings', description: 'Create and modify reservations' },
    { key: 'canDeleteBookings', label: 'Delete Bookings', description: 'Remove reservations' },
    { key: 'canManagePayments', label: 'Manage Payments', description: 'Add/edit payment records' },
    { key: 'canViewSettings', label: 'View Settings', description: 'See configuration options' },
    { key: 'canEditSettings', label: 'Edit Settings', description: 'Modify site configuration' },
    { key: 'canManageUsers', label: 'Manage Users', description: 'Create and manage staff accounts' }
];

const ROLE_ICONS: Record<string, any> = {
    super_admin: ShieldCheck,
    manager: Shield,
    staff: ShieldAlert
};

const ROLE_COLORS: Record<string, string> = {
    super_admin: 'text-amber-500 bg-amber-50',
    manager: 'text-blue-500 bg-blue-50',
    staff: 'text-slate-500 bg-slate-50'
};

export default function UserManagementPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        displayName: '',
        role: 'staff' as 'super_admin' | 'manager' | 'staff',
        permissions: {
            canViewDashboard: true,
            canViewBookings: true,
            canEditBookings: false,
            canDeleteBookings: false,
            canManagePayments: false,
            canViewSettings: false,
            canEditSettings: false,
            canManageUsers: false
        }
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            displayName: '',
            role: 'staff',
            permissions: {
                canViewDashboard: true,
                canViewBookings: true,
                canEditBookings: false,
                canDeleteBookings: false,
                canManagePayments: false,
                canViewSettings: false,
                canEditSettings: false,
                canManageUsers: false
            }
        });
        setShowModal(true);
        setError('');
    };

    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            displayName: user.display_name || '',
            role: user.role,
            permissions: user.permissions as any
        });
        setShowModal(true);
        setError('');
    };

    const handleSave = async () => {
        setError('');
        setIsSaving(true);

        try {
            const method = editingUser ? 'PUT' : 'POST';
            const body = editingUser
                ? {
                    id: editingUser.id,
                    displayName: formData.displayName,
                    role: formData.role,
                    permissions: formData.permissions,
                    ...(formData.password && { password: formData.password })
                }
                : formData;

            const res = await fetch('/api/admin/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to save user');
                return;
            }

            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (user: AdminUser) => {
        if (!confirm(`Are you sure you want to deactivate ${user.display_name || user.username}?`)) return;

        try {
            const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const togglePermission = (key: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key as keyof typeof prev.permissions]
            }
        }));
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="h-7 w-7 text-primary" />
                        User Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage admin users and their permissions</p>
                </div>
                <Button onClick={openCreateModal} className="rounded-full font-bold gap-2">
                    <Plus className="h-4 w-4" /> Add User
                </Button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-bold">No users found</p>
                        <p className="text-sm">Create your first admin user to get started</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">User</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Login</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => {
                                const RoleIcon = ROLE_ICONS[user.role] || Shield;
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", ROLE_COLORS[user.role])}>
                                                    <RoleIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{user.display_name || user.username}</p>
                                                    <p className="text-xs text-slate-400">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2 py-1 rounded-full text-xs font-bold capitalize", ROLE_COLORS[user.role])}>
                                                {user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-bold",
                                                user.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                            )}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.last_login
                                                ? new Date(user.last_login).toLocaleDateString()
                                                : 'Never'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditModal(user)} className="h-8 w-8 rounded-lg">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {user.role !== 'super_admin' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingUser ? 'Edit User' : 'Create User'}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600 text-sm">
                                    <AlertCircle className="h-5 w-5" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Username</Label>
                                    <Input
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        disabled={!!editingUser}
                                        placeholder="username"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Display Name</Label>
                                    <Input
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                        placeholder="John Doe"
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">{editingUser ? 'New Password (optional)' : 'Password'}</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="h-10 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Role</Label>
                                    <Select value={formData.role} onValueChange={(val: any) => setFormData({ ...formData, role: val })}>
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold">Permissions</Label>
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                    {PERMISSION_LIST.map(perm => (
                                        <div
                                            key={perm.key}
                                            onClick={() => togglePermission(perm.key)}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                                                formData.permissions[perm.key as keyof typeof formData.permissions]
                                                    ? "bg-emerald-50 border border-emerald-200"
                                                    : "bg-white border border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{perm.label}</p>
                                                <p className="text-xs text-slate-500">{perm.description}</p>
                                            </div>
                                            <div className={cn(
                                                "h-6 w-6 rounded-full flex items-center justify-center transition-all",
                                                formData.permissions[perm.key as keyof typeof formData.permissions]
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-slate-200 text-slate-400"
                                            )}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 rounded-full">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="flex-1 rounded-full">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editingUser ? 'Update User' : 'Create User'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
