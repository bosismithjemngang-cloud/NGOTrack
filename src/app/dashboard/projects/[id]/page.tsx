
"use client";

import React, { useState } from "react";
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
  AlertTriangle
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
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy } from "firebase/firestore";
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

  // 3. Fetch Activities for this project
  const activitiesQuery = useMemoFirebase(() => {
    if (!id || !profile?.organizationId) return null;
    return query(
      collection(db, "activities"),
      where("projectId", "==", id),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, id, profile]);
  const { data: activitiesData } = useCollection(activitiesQuery);

  // 4. Fetch Expenses for this project
  const expensesQuery = useMemoFirebase(() => {
    if (!id || !profile?.organizationId) return null;
    return query(
      collection(db, "expenses"),
      where("projectId", "==", id),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, id, profile]);
  const { data: expensesData } = useCollection(expensesQuery);

  // Sort data in memory to avoid composite index requirements
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

  const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId || !id) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const progress = Number(formData.get("progress"));
    
    const newActivity = {
      projectId: id as string,
      organizationId: profile.organizationId,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      progressPercentage: progress,
      createdBy: user?.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "activities"), newActivity);
      
      // Update overall project progress if the update is higher
      if (project && progress > (project.progress || 0)) {
        updateDocumentNonBlocking(doc(db, "projects", id as string), {
          progress: progress,
          status: progress >= 100 ? "Completed" : "Active"
        });
      }

      setIsActivityDialogOpen(false);
      toast({ title: "Activity Logged", description: "Progress has been updated." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId || !id) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newExpense = {
      projectId: id as string,
      organizationId: profile.organizationId,
      amount: Number(formData.get("amount")),
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      expenseDate: formData.get("date") as string,
      createdAt: new Date().toISOString(),
    };

    try {
      addDocumentNonBlocking(collection(db, "expenses"), newExpense);
      setIsExpenseDialogOpen(false);
      toast({ title: "Expense Logged", description: "Financial records updated." });
    } finally {
      setIsSubmitting(false);
    }
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
            <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Clock className="h-4 w-4 mr-2" />
                  Update Progress
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleLogActivity}>
                  <DialogHeader>
                    <DialogTitle>Log Activity Update</DialogTitle>
                    <DialogDescription>Record field progress and update the project completion status.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Activity Summary</Label>
                      <Input id="name" name="name" placeholder="e.g., Installation of solar panels" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="progress">Overall Progress (%)</Label>
                      <Input id="progress" name="progress" type="number" min="0" max="100" defaultValue={project.progress} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Field Notes</Label>
                      <Textarea id="description" name="description" placeholder="Detailed update from the field..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Update
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Log Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleLogExpense}>
                  <DialogHeader>
                    <DialogTitle>Record Project Expense</DialogTitle>
                    <DialogDescription>Track spending against the allocated project budget.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Expense Date</Label>
                        <Input id="date" name="date" type="date" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Supplies">Supplies & Equipment</SelectItem>
                          <SelectItem value="Labor">Labor & Contractors</SelectItem>
                          <SelectItem value="Travel">Travel & Logistics</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" placeholder="e.g., Cement and piping for well construction" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Log Expense
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
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{project.progress || 0}%</div>
            <Progress value={project.progress || 0} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Project Overview</TabsTrigger>
          <TabsTrigger value="activities">Activity Timeline</TabsTrigger>
          <TabsTrigger value="financials">Financial Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>Description & Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {project.description}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Impact Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">On-Track</p>
                    <p className="text-xs text-muted-foreground">Milestones are being met</p>
                  </div>
                </div>
                {totalSpent > (project.budget || 0) && (
                  <div className="flex items-center gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-bold text-destructive">Budget Warning</p>
                      <p className="text-xs text-destructive/80">Expenses exceed allocated budget</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No activities logged yet.</div>
                ) : (
                  activities.map((activity, i) => (
                    <div key={activity.id} className="p-6 hover:bg-muted/5 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={`https://picsum.photos/seed/${activity.createdBy}/40/40`} />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold">{activity.name}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                            <div className="flex items-center gap-2 pt-2">
                              <Badge variant="outline" className="font-normal text-[10px]">
                                {activity.progressPercentage}% Completion
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
      </Tabs>
    </div>
  );
}
