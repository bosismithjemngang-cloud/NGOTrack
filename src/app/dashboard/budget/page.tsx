
"use client";

import React, { useState } from "react";
import { 
  DollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter, 
  Download,
  Plus,
  Search,
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function BudgetPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  // 1. Fetch User Profile for organizationId
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch expenses scoped by organizationId
  const expensesQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "expenses"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: expensesData, isLoading: isExpensesLoading } = useCollection(expensesQuery);

  // 3. Fetch projects scoped by organizationId
  const projectsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: projects } = useCollection(projectsQuery);

  // Sort and filter expenses
  const expenses = React.useMemo(() => {
    if (!expensesData) return [];
    
    let filtered = [...expensesData];
    if (search) {
      filtered = filtered.filter(e => 
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
      const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [expensesData, search]);

  const totalBudget = projects?.reduce((acc, p) => acc + (p.budget || 0), 0) || 0;
  const totalExpenditure = expensesData?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const remainingBalance = totalBudget - totalExpenditure;

  const handleExport = () => {
    if (!expenses || expenses.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "There are no financial records to export.",
      });
      return;
    }

    const headers = ["Date", "Description", "Category", "Project", "Amount (CFA)"];
    const rows = expenses.map(e => {
      const projectName = projects?.find(p => p.id === e.projectId)?.name || "General";
      return [
        e.expenseDate || "N/A",
        `"${(e.description || "").replace(/"/g, '""')}"`,
        e.category,
        `"${projectName.replace(/"/g, '""')}"`,
        e.amount
      ].join(",");
    });

    const csvData = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ngo_expenditure_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "The expenditure report has been downloaded.",
    });
  };

  const handleLogExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newExpense = {
      projectId: formData.get("projectId") as string,
      organizationId: profile.organizationId,
      amount: Number(formData.get("amount")),
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      expenseDate: formData.get("date") as string,
      createdAt: new Date().toISOString(),
      createdBy: user?.uid
    };

    try {
      addDocumentNonBlocking(collection(db, "expenses"), newExpense);
      setIsLogDialogOpen(false);
      toast({
        title: "Expense Logged",
        description: "The transaction has been added to the organization's records.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Budget & Expenditure</h2>
          <p className="text-muted-foreground">Track project funds and real-time spending for your organization.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleLogExpense}>
                <DialogHeader>
                  <DialogTitle>Log Organization Expense</DialogTitle>
                  <DialogDescription>Record a new financial transaction for one of your programs.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Target Project</Label>
                    <Select name="projectId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (CFA)</Label>
                      <Input id="amount" name="amount" type="number" step="1" placeholder="0" required />
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
                        <SelectItem value="Marketing">Marketing & Advocacy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input id="description" name="description" placeholder="e.g., Office rent for Q2" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsLogDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Log Transaction
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBudget.toLocaleString()} CFA</div>
            <p className="text-xs text-muted-foreground mt-1">Across {projects?.length || 0} active projects</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenditure</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenditure.toLocaleString()} CFA</div>
            <p className="text-xs text-destructive mt-1">
              {totalBudget > 0 ? Math.round((totalExpenditure / totalBudget) * 100) : 0}% of total allocation
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingBalance.toLocaleString()} CFA</div>
            <p className="text-xs text-primary mt-1">Available for deployment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-xl">Financial Ledger</CardTitle>
              <CardDescription>Consolidated expense records for {profile?.firstName}'s organization.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Filter logs..." 
                  className="pl-8 h-9 w-[200px]" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isExpensesLoading ? (
            <div className="p-12 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No expenses logged for your organization yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const projectName = projects?.find(p => p.id === expense.projectId)?.name || "General";
                  return (
                    <TableRow key={expense.id} className="hover:bg-muted/5">
                      <TableCell className="font-medium">
                        {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">
                        {projectName}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {expense.amount.toLocaleString()} CFA
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
