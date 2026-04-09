
"use client";

import React from "react";
import { 
  DollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter, 
  Download,
  Plus,
  Search
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

const PROJECT_ROLES = ['admin', 'manager', 'viewer', 'officer', 'staff', 'editor'];

export default function BudgetPage() {
  const db = useFirestore();
  const { user } = useUser();

  // Fetch expenses - Filtered by membership for QAPs
  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "expenses"),
      where(`projectMembers.${user.uid}`, 'in', PROJECT_ROLES)
    );
  }, [db, user]);
  const { data: expensesData, isLoading } = useCollection(expensesQuery);

  // Fetch projects - Filtered by membership for QAPs
  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "projects"),
      where(`projectMembers.${user.uid}`, 'in', PROJECT_ROLES)
    );
  }, [db, user]);
  const { data: projects } = useCollection(projectsQuery);

  // Sort expenses in memory to avoid composite index requirements
  const expenses = React.useMemo(() => {
    if (!expensesData) return [];
    return [...expensesData].sort((a, b) => {
      const dateA = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
      const dateB = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [expensesData]);

  const totalBudget = projects?.reduce((acc, p) => acc + (p.budget || 0), 0) || 0;
  const totalExpenditure = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const remainingBalance = totalBudget - totalExpenditure;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Budget & Expenditure</h2>
          <p className="text-muted-foreground">Track project funds and real-time spending for your projects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Log Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {projects?.length || 0} projects you manage</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenditure</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenditure.toLocaleString()}</div>
            <p className="text-xs text-destructive mt-1">
              {totalBudget > 0 ? Math.round((totalExpenditure / totalBudget) * 100) : 0}% of your total budget
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${remainingBalance.toLocaleString()}</div>
            <p className="text-xs text-primary mt-1">Available for allocation</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-xl">Expense Log</CardTitle>
              <CardDescription>Recent financial transactions across your projects</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-8 h-9 w-[200px]" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
          ) : expenses?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No expenses logged for your projects yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((expense) => (
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
                    <TableCell className="text-right font-semibold">${expense.amount.toLocaleString()}</TableCell>
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
