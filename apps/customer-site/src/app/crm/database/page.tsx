'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSupabase, useAuth } from '@/components/providers/supabase-provider';
import { format } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Search, Filter, MoreVertical, Tag, Upload,
  FileText, Download, Trash2, Eye, Star, Ban, Target,
  Mail, Phone, Calendar, DollarSign, Clock, MessageSquare,
  ChevronRight, X, Plus, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/actions';
import imageCompression from 'browser-image-compression';
import { Progress } from '@/components/ui/progress';

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  source: string;
  current_location: 'database' | 'active-reservations' | 'potential-clients';
  status: 'needs-followup' | 'waiting-payment' | 'offer-sent' | 'canceled' | 'confirmed' | 'pending' | null;
  lead_status: 'lead-sent' | 'waiting-confirmation' | 'waiting-payment' | 'converted' | 'lost' | null;
  tags: string[];
  has_active_reservation: boolean;
  booking_id: string;
  booking_date: string;
  booking_type: 'houseboat' | 'restaurant' | 'travel';
  booking_amount: number;
  payment_status: 'paid' | 'partial' | 'pending';
  process_logs: any[];
  files: any[];
  notes: string;
  total_revenue: number;
  booking_count: number;
}

export default function DatabasePage() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchClients = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('current_location', 'database')
      .order('updated_at', { ascending: false });

    if (data) setClients(data as Client[]);
  };

  useEffect(() => {
    fetchClients();

    if (!supabase) return;
    const channel = supabase.channel('clients_db_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: 'current_location=eq.database' }, () => fetchClients())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Filter clients
  useEffect(() => {
    let filtered = clients;

    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(client =>
        selectedTags.every(tag => client.tags?.includes(tag))
      );
    }

    setFilteredClients(filtered);
  }, [searchQuery, selectedTags, clients]);

  // Toggle tag assignment
  const toggleTag = async (clientId: string, tag: string) => {
    if (!supabase || !user) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const currentTags = client.tags || [];
    const isAdding = !currentTags.includes(tag);
    const newTags = isAdding
      ? [...currentTags, tag]
      : currentTags.filter(t => t !== tag);

    const action = isAdding ? 'Tag Added' : 'Tag Removed';
    const details = `${tag} tag ${isAdding ? 'added' : 'removed'}`;

    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: action,
      details: details,
      userId: user.id,
      userName: user.email,
    };

    let updates: any = {
      tags: newTags,
      updated_at: new Date().toISOString(),
      process_logs: [...(client.process_logs || []), newLog]
    };

    if (tag === 'potential' && isAdding) {
      updates.current_location = 'potential-clients';
      updates.lead_status = 'lead-sent';
      const moveLog = {
        id: (Date.now() + 1).toString(),
        timestamp: new Date().toISOString(),
        action: 'Moved to Potential Clients',
        details: 'Tagged as potential client and moved to lead pipeline',
        userId: user.id,
        userName: user.email,
        previousLocation: 'database',
        newLocation: 'potential-clients'
      };
      updates.process_logs.push(moveLog);

      toast({
        title: 'Client moved to Potential Clients',
        description: `${client.name} is now in the lead pipeline`
      });

      setIsDetailOpen(false);
    } else {
      toast({ title: `${action}: ${tag}` });
    }

    await supabase.from('clients').update(updates).eq('id', clientId);
  };

  // Compress and upload files
  const handleFileUpload = async () => {
    if (!selectedClient || selectedFiles.length === 0 || !supabase || !user) return;

    setIsUploading(true);
    const uploadedFiles: any[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress((i / selectedFiles.length) * 100);

        let fileToUpload: File | Blob = file;
        let compressedSize = file.size;

        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };

          try {
            const compressedFile = await imageCompression(file, options);
            fileToUpload = compressedFile;
            compressedSize = compressedFile.size;
          } catch (error) {
            console.error('Compression failed for', file.name, 'using original file. Error:', error);
          }
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `${selectedClient.id}/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('clients')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('clients')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          id: timestamp.toString(),
          name: file.name,
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'pdf',
          size: file.size,
          compressedSize: compressedSize,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.email,
        });
      }

      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: 'Files Uploaded',
        details: `${uploadedFiles.length} file(s) uploaded`,
        userId: user.id,
        userName: user.email,
      };

      await supabase.from('clients').update({
        files: [...(selectedClient.files || []), ...uploadedFiles],
        updated_at: new Date().toISOString(),
        process_logs: [...(selectedClient.process_logs || []), newLog]
      }).eq('id', selectedClient.id);

      toast({
        title: 'Files uploaded successfully',
        description: `${uploadedFiles.length} file(s) processed and uploaded.`
      });

      setIsUploadOpen(false);
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'An unknown error occurred during upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!selectedClient || !newNote.trim() || !supabase || !user) return;

    const timestamp = new Date();
    const formattedTimestamp = format(timestamp, 'MMM dd, yyyy HH:mm');
    const newNoteText = (selectedClient.notes || '') + `\n\n[${formattedTimestamp}] ${user.email}:\n${newNote}`;

    const newLog = {
      id: Date.now().toString(),
      timestamp: timestamp.toISOString(),
      action: 'Note Added',
      details: newNote.substring(0, 100),
      userId: user.id,
      userName: user.email
    };

    await supabase.from('clients').update({
      notes: newNoteText,
      updated_at: new Date().toISOString(),
      process_logs: [...(selectedClient.process_logs || []), newLog]
    }).eq('id', selectedClient.id);

    toast({ title: 'Note added successfully' });
    setNewNote('');
    // Update local state if needed or let realtime handle it
    setSelectedClient(prev => prev ? { ...prev, notes: newNoteText } : null);
  };

  // Delete client
  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.') || !supabase) {
      return;
    }

    await supabase.from('clients').delete().eq('id', clientId);
    toast({ title: 'Client deleted' });
    setIsDetailOpen(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Client Database</h1>
            <p className="text-muted-foreground">Complete client history and information</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {filteredClients.length} Clients
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Badge
                variant={selectedTags.includes('VIP') ? 'default' : 'outline'}
                className="cursor-pointer border-amber-500 text-amber-600 data-[state=active]:bg-amber-500"
                onClick={() => setSelectedTags(prev => prev.includes('VIP') ? prev.filter(t => t !== 'VIP') : [...prev, 'VIP'])}
              >
                <Star className="h-3 w-3 mr-1" /> VIP
              </Badge>
              <Badge
                variant={selectedTags.includes('blacklist') ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTags(prev => prev.includes('blacklist') ? prev.filter(t => t !== 'blacklist') : [...prev, 'blacklist'])}
              >
                <Ban className="h-3 w-3 mr-1" /> Blacklist
              </Badge>
              <Badge
                variant={selectedTags.includes('potential') ? 'default' : 'outline'}
                className="cursor-pointer border-blue-500 text-blue-600"
                onClick={() => setSelectedTags(prev => prev.includes('potential') ? prev.filter(t => t !== 'potential') : [...prev, 'potential'])}
              >
                <Target className="h-3 w-3 mr-1" /> Potential
              </Badge>

              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" /> {client.email}</div>
                      {client.phone && (<div className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" /> {client.phone}</div>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {client.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className={cn(
                          tag === 'VIP' && 'bg-amber-100 text-amber-800',
                          tag === 'blacklist' && 'bg-red-100 text-red-800',
                          tag === 'potential' && 'bg-blue-100 text-blue-800'
                        )}>
                          {tag === 'VIP' && <Star className="h-3 w-3 mr-1" />}
                          {tag === 'blacklist' && <Ban className="h-3 w-3 mr-1" />}
                          {tag === 'potential' && <Target className="h-3 w-3 mr-1" />}
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{client.source || '-'}</TableCell>
                  <TableCell>€{client.total_revenue || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {client.files?.length || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.updated_at ? format(new Date(client.updated_at), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(client); setIsDetailOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">No clients found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedClient.name}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="info" className="mt-4">
                <TabsList>
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="files">Files ({selectedClient.files?.length || 0})</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{selectedClient.email}</p></div>
                    <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{selectedClient.phone || 'Not provided'}</p></div>
                    <div><p className="text-sm text-muted-foreground">Source</p><p className="font-medium">{selectedClient.source || 'Unknown'}</p></div>
                    <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="font-medium">€{selectedClient.total_revenue || 0}</p></div>
                    <div><p className="text-sm text-muted-foreground">Total Bookings</p><p className="font-medium">{selectedClient.booking_count || 0}</p></div>
                    <div><p className="text-sm text-muted-foreground">Created</p><p className="font-medium">{selectedClient.created_at ? format(new Date(selectedClient.created_at), 'MMM dd, yyyy') : 'Unknown'}</p></div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex gap-2">
                      <Badge variant={selectedClient.tags?.includes('VIP') ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(selectedClient.id, 'VIP')}><Star className="h-3 w-3 mr-1" /> VIP</Badge>
                      <Badge variant={selectedClient.tags?.includes('blacklist') ? 'destructive' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(selectedClient.id, 'blacklist')}><Ban className="h-3 w-3 mr-1" /> Blacklist</Badge>
                      <Badge variant={selectedClient.tags?.includes('potential') ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(selectedClient.id, 'potential')}><Target className="h-3 w-3 mr-1" /> Potential</Badge>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="files" className="space-y-4 pt-4">
                  <Button onClick={() => setIsUploadOpen(true)}><Upload className="h-4 w-4 mr-2" /> Upload Files</Button>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedClient.files?.map((file) => (
                      <Card key={file.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(1)}KB
                                {file.compressedSize && file.compressedSize < file.size ? ` → ${(file.compressedSize / 1024).toFixed(1)}KB` : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(file.uploadedAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  {(!selectedClient.files || selectedClient.files.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No files uploaded</p>
                  )}
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {selectedClient.process_logs?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log: any) => (
                        <Card key={log.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <History className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{log.action}</p>
                              <p className="text-sm text-muted-foreground">{log.details}</p>
                              <p className="text-xs text-muted-foreground mt-1">{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')} by {log.userName}</p>
                              {log.previousLocation && log.newLocation && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">{log.previousLocation}</Badge>
                                  <ChevronRight className="h-3 w-3" />
                                  <Badge variant="outline" className="text-xs">{log.newLocation}</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="notes" className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <Textarea placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1" />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md p-3"><pre className="whitespace-pre-wrap text-sm">{selectedClient.notes || 'No notes yet'}</pre></ScrollArea>
                </TabsContent>
              </Tabs>
              <DialogFooter className="mt-4">
                <Button variant="destructive" onClick={() => handleDelete(selectedClient.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete Client</Button>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click or drag files here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images will be automatically compressed
                </p>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{file.name}</span>
                    <span className="text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isUploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={isUploading || selectedFiles.length === 0}>
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
