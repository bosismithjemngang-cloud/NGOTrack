
"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  MapPin, 
  ArrowRight,
  Trash2,
  Loader2,
  Edit3,
  User,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  const isAdminOrManager = profile?.role === "admin" || profile?.role === "manager";
  const isAdmin = profile?.role === "admin";

  const projectsRef = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: projects, isLoading } = useCollection(projectsRef);

  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    
    let filtered = projects.filter(p => 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.location?.toLowerCase().includes(search.toLowerCase())
    );

    if (activeTab === "assigned") {
      filtered = filtered.filter(p => p.assignedStaffIds?.includes(user?.uid));
    }

    return filtered;
  }, [projects, search, activeTab, user?.uid]);

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newProject = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      location: formData.get("location") as string,
      budget: Number(formData.get("budget")),
      status: formData.get("status") as string,
      progress: 0,
      assignedStaffIds: [user?.uid], // Creator is assigned by default
      organizationId: profile.organizationId,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "projects"), newProject);
      setIsCreateDialogOpen(false);
      toast({
        title: "Project Created",
        description: `${newProject.name} has been added to your portfolio.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    deleteDocumentNonBlocking(doc(db, "projects", projectId));
    toast({
      title: "Project Deleted",
      description: `${projectName} has been removed.`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Programs & Projects</h2>
          <p className="text-muted-foreground">Manage and monitor all active NGO initiatives.</p>
        </div>
        
        {isAdminOrManager && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleCreateProject}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Define the scope, location, and budget for your new initiative.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input id="name" name="name" placeholder="e.g., Clean Water Initiative" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="Project goals and objectives..." required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" name="location" placeholder="City, Region" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget (USD)</Label>
                      <Input id="budget" name="budget" type="number" placeholder="5000" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
                    <Select name="status" defaultValue="Planning">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Planning">Planning</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-[240px]">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5" />
              All
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              My Work
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects by name or location..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4" />
          More Filters
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${project.id}/400/200`} 
                  alt={project.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                   <Badge className={`${
                    project.status === "Completed" ? "bg-primary" : 
                    project.status === "Active" ? "bg-secondary text-blue-900" : 
                    "bg-muted text-foreground"
                  }`}>
                    {project.status}
                  </Badge>
                  {project.assignedStaffIds?.includes(user?.uid) && (
                    <Badge variant="outline" className="bg-white/90 text-primary border-primary backdrop-blur-sm">
                      Assigned to me
                    </Badge>
                  )}
                </div>
              </div>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="font-headline text-lg group-hover:text-primary transition-colors">
                    {project.name}
                  </CardTitle>
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <MapPin className="h-3 w-3" />
                    {project.location || 'Location Pending'}
                  </div>
                </div>
                {isAdminOrManager && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" asChild>
                         <Link href={`/dashboard/projects/${project.id}`}>
                           <Edit3 className="h-4 w-4 mr-2" /> Manage Project
                         </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer"
                          onClick={() => handleDeleteProject(project.id, project.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {project.description}
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>Implementation Progress</span>
                      <span>{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Budget</p>
                      <p className="text-sm font-semibold">${(project.budget || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Team</p>
                      <p className="text-sm font-semibold">
                        {project.assignedStaffIds?.length || 0} Members
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Button variant="ghost" className="w-full text-primary hover:bg-primary/5 group-hover:translate-x-1 transition-all" asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredProjects.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center bg-white rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">
                {activeTab === "assigned" 
                  ? "You are not currently assigned to any projects." 
                  : "No projects found for your organization."}
              </p>
              {isAdminOrManager && (
                <Button variant="link" onClick={() => setIsCreateDialogOpen(true)}>Create your first project</Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
