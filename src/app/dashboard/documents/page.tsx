
"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ExternalLink, 
  MoreVertical, 
  Trash2, 
  Loader2,
  Paperclip,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

const categories = ["Grant", "Legal", "Financial", "Impact Report", "Field Photo", "Other"];

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  // Fetch Documents
  const documentsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "documents"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: documentsData, isLoading } = useCollection(documentsQuery);

  // Fetch Projects for selection
  const projectsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: projects } = useCollection(projectsQuery);

  const filteredDocs = documentsData?.filter(d => 
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.category?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newDoc = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      projectId: formData.get("projectId") as string || "General",
      url: formData.get("url") as string,
      organizationId: profile.organizationId,
      uploadedBy: user?.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "documents"), newDoc);
      setIsAddDialogOpen(false);
      toast({
        title: "Document Registered",
        description: `${newDoc.name} has been added to your organization's archive.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    deleteDocumentNonBlocking(doc(db, "documents", id));
    toast({
      title: "Document Removed",
      description: `${name} has been deleted.`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Document Archive</h2>
          <p className="text-muted-foreground">Centralized repository for grants, compliance, and field reports.</p>
        </div>
        
        {canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddDocument}>
                <DialogHeader>
                  <DialogTitle>Register New Document</DialogTitle>
                  <DialogDescription>
                    Link a document URL or record its presence in your organization's records.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Document Name</Label>
                    <Input id="name" name="name" placeholder="e.g., Q1 Grant Agreement" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectId">Project Link</Label>
                      <Select name="projectId">
                        <SelectTrigger>
                          <SelectValue placeholder="Organization Wide" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">Organization Wide</SelectItem>
                          {projects?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Document Link (URL)</Label>
                    <Input id="url" name="url" type="url" placeholder="https://drive.google.com/..." required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Metadata
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by filename or category..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              Loading archives...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No documents recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead>File Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked Project</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const projectName = projects?.find(p => p.id === doc.projectId)?.name || "General";
                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/5">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          {doc.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal flex items-center gap-1 w-fit">
                          <Tag className="h-3 w-3" />
                          {doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs italic">
                        {projectName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive cursor-pointer"
                                  onClick={() => handleDelete(doc.id, doc.name)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
