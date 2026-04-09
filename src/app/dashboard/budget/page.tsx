
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

const expenses = [
  {
    id: "e1",
    date: "2023-11-15",
    description: "Purchase of high-yield maize seeds",
    category: "Program Materials",
    project: "Smallholder Farmer Support",
    amount: 12500,
    status: "Approved"
  },
  {
    id: "e2",
    date: "2023-11-12",
    description: "Fuel for mobile health units",
    category: "Logistics",
    project: "Mobile Health Units Expansion",
    amount: 450,
    status: "Approved"
  },
  {
    id: "e3",
    date: "2023-11-10",
    description: "Health worker stipend - Oct",
    category: "Human Resources",
    project: "Mobile Health Units Expansion",
    amount: 3200,
    status: "Pending"
  },
  {
    id: "e4",
    date: "2023-11-08",
    description: "Construction materials - Well #4",
    category: "Infrastructure",
    project: "Clean Water Access Initiative",
    amount: 8700,
    status: "Approved"
  },
  {
    id: "e5",
    date: "2023-11-05",
    description: "Printing vocational training manuals",
    category: "Education",
    project: "Youth Vocational Training",
    amount: 1200,
    status: "Approved"
  }
];

export default function BudgetPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Budget & Expenditure</h2>
          <p className="text-muted-foreground">Track project funds and real-time spending.</p>
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
            <div className="text-2xl font-bold">$190,000</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 active projects</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenditure</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$148,500</div>
            <p className="text-xs text-destructive mt-1">78.1% of total budget</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$41,500</div>
            <p className="text-xs text-primary mt-1">Available for allocation</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-xl">Expense Log</CardTitle>
              <CardDescription>Recent financial transactions across all projects</CardDescription>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-muted/5">
                  <TableCell className="font-medium">{expense.date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{expense.project}</TableCell>
                  <TableCell className="text-right font-semibold">${expense.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={
                      expense.status === "Approved" ? "bg-primary/10 text-primary border-primary/20" : "bg-warning/10 text-orange-600 border-orange-200"
                    }>
                      {expense.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
