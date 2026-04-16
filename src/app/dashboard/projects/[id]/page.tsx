
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Target,
  Circle,
  CalendarDays,
  Users,
  UserPlus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch Project
  const projectRef = useMemoFirebase(() => {
    if (!id) return null;
    return doc(db, "projects", id as string);
  }, [db, id]);
  const { data: project, isLoading: isProjectLoading } = useDoc(projectRef);

  // 3. Fetch Milestones
  const milestonesRef = useMemoFirebase(() => {
    if (!id) return null;
    return collection(db, "projects", id as string, "milestones");
  }, [db, id]);
  const { data: milestonesData } = useCollection(milestonesRef);

  // 4. Fetch Activities
  const activitiesQuery = useMemoFirebase(() => {
    if (!id || !profile?.organizationId) return null;
    return query(
      collection(db, "activities"),
      where("projectId", "==", id),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, id, profile]);
  const { data: activitiesData } = useCollection(activitiesQuery);

  // 5. Fetch Expenses
  const expensesQuery = useMemoFirebase(() => {
    if (!id || !profile?.organizationId) return null;
    return query(
      collection(db, "expenses"),
      where("projectId", "==", id),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, id, profile]);
  const { data: expensesData } = useCollection(expensesQuery);

  // 6. Fetch All Staff for Assignments
  const staffQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "user_profiles"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: allStaff } = useCollection(staffQuery);

  // Memoized lists
  const milestones = React.useMemo(() => {
    if (!milestonesData) return [];
    return [...milestonesData].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [milestonesData]);

  const activities = React.useMemo(() => {
    if (!activitiesData) return [];
    return [...activitiesData].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [activitiesData]);

  const expenses = React.useMemo(() => {
    if (!expensesData) return [];
    return [...expensesData].sort((a, b) => {
      const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
      const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [expensesData]);

  const totalSpent = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const remainingBudget = (project?.budget || 0) - totalSpent;
  const canManage = profile?.role === "admin" || profile?.role === "manager";

  // Automated Progress Calculation
  useEffect(() => {
    if (!project || milestones.length === 0 || !canManage) return;

    const completed = milestones.filter(m => m.completed).length;
    const newProgress = Math.round((completed / milestones.length) * 100);

    if (newProgress !== project.progress) {
      updateDocumentNonBlocking(doc(db, "projects", project.id), {
        progress: newProgress,
        status: newProgress === 100 ? "Completed" : "Active"
      });
    }
  }, [milestones, project, db, canManage]);

  const handleAddMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newMilestone = {
      projectId: id as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      dueDate: formData.get("dueDate") as string,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "projects", id as string, "milestones"), newMilestone);
      setIsMilestoneDialogOpen(false);
      toast({ title: "Milestone Added", description: "Successfully added to the project roadmap." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMilestone = (milestoneId: string, currentStatus: boolean) => {
    if (!canManage || !id) return;
    updateDocumentNonBlocking(doc(db, "projects", id as string, "milestones", milestoneId), {
      completed: !currentStatus,
      completedAt: !currentStatus ? new Date().toISOString() : null
    });
  };

  const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId || !id) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newActivity = {
      projectId: id as string,
      organizationId: profile.organizationId,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      progressPercentage: project?.progress || 0,
      createdBy: user?.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "activities"), newActivity);
      setIsActivityDialogOpen(false);
      toast({ title: "Activity Logged", description: "Field update has been recorded." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStaff = (staffId: string) => {
    if (!id || !canManage) return;
    updateDoc(doc(db, "projects", id as string), {
      assignedStaffIds: arrayUnion(staffId)
    });
    toast({ title: "Staff Assigned", description: "Team member added to the project." });
  };

  const handleRemoveStaff = (staffId: string) => {
    if (!id || !canManage) return;
    updateDoc(doc(db, "projects", id as string), {
      assignedStaffIds: arrayRemove(staffId)
    });
    toast({ title: "Staff Removed", description: "Team member removed from the project." });
  };

  if (isProjectLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-bold">Project not found</h3>
        <Button variant="link" asChild>
          <Link href="/dashboard/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  const assignedStaff = allStaff?.filter(s => project.assignedStaffIds?.includes(s.id)) || [];
  const unassignedStaff = allStaff?.filter(s => !project.assignedStaffIds?.includes(s.id)) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Programs
          </Link>
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-headline font-bold">{project.name}</h2>
              <Badge className={
                project.status === "Completed" ? "bg-primary" : 
                project.status === "Active" ? "bg-secondary text-blue-900" : 
                "bg-muted text-foreground"
              }>
                {project.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {project.location}</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Created {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Set Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddMilestone}>
                    <DialogHeader>
                      <DialogTitle>Add Project Milestone</DialogTitle>
                      <DialogDescription>Define a key goal to track progress automatically.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Milestone Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Initial Site Visit" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Target Date</Label>
                        <Input id="dueDate" name="dueDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Requirement Description</Label>
                        <Textarea id="description" name="description" placeholder="What defines completion for this goal?" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Add to Roadmap
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Clock className="h-4 w-4 mr-2" />
                  Log Field Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleLogActivity}>
                  <DialogHeader>
                    <DialogTitle>Log Activity Update</DialogTitle>
                    <DialogDescription>Record notes from the field. Overall progress is calculated from milestones.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Activity Summary</Label>
                      <Input id="name" name="name" placeholder="e.g., Meeting with village leaders" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Field Observations</Label>
                      <Textarea id="description" name="description" placeholder="Provide details for M&E review..." required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Entry
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(project.budget || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actual Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSpent > (project.budget || 0) ? 'text-destructive' : 'text-foreground'}`}>
              ${totalSpent.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${remainingBudget.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">M&E Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{project.progress || 0}%</div>
            <Progress value={project.progress || 0} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="milestones" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="activities">Activity Log</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="overview">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones">
          <div className="grid gap-6">
            {milestones.length === 0 ? (
              <Card className="border-dashed border-2 py-12">
                <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Target className="h-10 w-10 mb-2 opacity-20" />
                  <p>No milestones defined for this program.</p>
                  {canManage && <p className="text-xs">Add milestones to track progress automatically.</p>}
                </CardContent>
              </Card>
            ) : (
              milestones.map((milestone) => (
                <Card key={milestone.id} className={`border-none shadow-sm transition-all ${milestone.completed ? 'bg-primary/5 opacity-80' : 'bg-white'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="pt-1">
                        <Checkbox 
                          checked={milestone.completed} 
                          onCheckedChange={() => handleToggleMilestone(milestone.id, milestone.completed)}
                          disabled={!canManage}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-bold text-lg ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.title}
                          </h4>
                          {milestone.completed && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary-foreground font-normal">
                              Done
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description || "No description provided."}
                        </p>
                        <div className="flex items-center gap-4 pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Target: {new Date(milestone.dueDate).toLocaleDateString()}
                          </div>
                          {milestone.completedAt && (
                            <div className="flex items-center gap-1.5 text-xs text-primary">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No field updates logged yet.</div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="p-6 hover:bg-muted/5 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://picsum.photos/seed/${activity.createdBy}/40/40`} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <p className="font-bold">{activity.name}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <div className="flex items-center gap-2 pt-2">
                              <Badge variant="outline" className="font-normal text-[10px]">
                                Program at {activity.progressPercentage}%
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No expenses recorded for this project.</div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="h-12 px-6 text-left font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-6 text-left font-medium text-muted-foreground">Description</th>
                        <th className="h-12 px-6 text-left font-medium text-muted-foreground">Category</th>
                        <th className="h-12 px-6 text-right font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">{expense.description}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="font-normal">{expense.category}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right font-bold">${expense.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/10 font-bold">
                        <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-xs">Total Project Spending</td>
                        <td className="px-6 py-4 text-right text-lg">${totalSpent.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Assigned Staff
                </CardTitle>
                <CardDescription>Members responsible for this project's implementation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignedStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No staff assigned yet.</p>
                  ) : (
                    assignedStaff.map(staff => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://picsum.photos/seed/${staff.id}/40/40`} />
                            <AvatarFallback>{staff.firstName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{staff.firstName} {staff.lastName}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{staff.role}</p>
                          </div>
                        </div>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveStaff(staff.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {canManage && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Available Team
                  </CardTitle>
                  <CardDescription>Assign additional members to this initiative.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {unassignedStaff.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">All organization staff are assigned.</p>
                    ) : (
                      unassignedStaff.map(staff => (
                        <div key={staff.id} className="flex items-center justify-between p-3 border border-dashed rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://picsum.photos/seed/${staff.id}/40/40`} />
                              <AvatarFallback>{staff.firstName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{staff.firstName} {staff.lastName}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{staff.role}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleAssignStaff(staff.id)}>
                            Assign
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Program Context</CardTitle>
              <CardDescription>Legal and operational goals defined at launch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Background</Label>
                <p className="mt-2 text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Target Location</Label>
                  <p className="mt-1 font-medium">{project.location}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Initialization Date</Label>
                  <p className="mt-1 font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
