
"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Mail, 
  Shield, 
  UserPlus,
  MoreVertical,
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc, setDoc } from "firebase/firestore";

export default function StaffPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const db = useFirestore();
  const { user } = useUser();

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const staffQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "user_profiles"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: staff, isLoading } = useCollection(staffQuery);

  const filteredStaff = staff?.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const isAdmin = profile?.role === "admin";

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId || !isAdmin) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newStaff = {
      id: crypto.randomUUID(),
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
      organizationId: profile.organizationId,
      createdAt: new Date().toISOString(),
      status: "invited"
    };

    try {
      await setDoc(doc(db, "user_profiles", newStaff.id), newStaff);
      setIsAddDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isProfileLoading && !isAdmin) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <Lock className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-headline font-bold">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">Only organization administrators have access to team management and staff invitations.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/dashboard">Back to Overview</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Team Management</h2>
          <p className="text-muted-foreground">Manage your organization's administrators and field staff.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddStaff}>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription>
                  Enter the staff member's details. They must sign up with this exact email to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" placeholder="Smith" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="john.smith@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Organization Role</Label>
                  <Select name="role" defaultValue="staff">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="manager">Project Manager</SelectItem>
                      <SelectItem value="officer">Field Officer</SelectItem>
                      <SelectItem value="staff">General Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Profile
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading team...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {search ? "No staff found matching your search." : "No staff members added yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://picsum.photos/seed/${member.id}/40/40`} />
                          <AvatarFallback>{member.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs capitalize">{member.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "invited" ? "secondary" : "default"} className="font-normal text-[10px] uppercase tracking-wider">
                        {member.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
