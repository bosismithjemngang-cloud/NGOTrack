
"use client";

import React, { useState, useRef } from "react";
import { 
  FileText, 
  Download, 
  Loader2, 
  Target, 
  TrendingUp, 
  BarChart4,
  MapPin,
  Calendar,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReportsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showReport, setShowReport] = useState(false);

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch Projects
  const projectsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  // 3. Fetch Project Specific Data
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const activitiesQuery = useMemoFirebase(() => {
    if (!selectedProjectId || !profile?.organizationId) return null;
    return query(
      collection(db, "activities"), 
      where("projectId", "==", selectedProjectId),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, selectedProjectId, profile?.organizationId]);
  const { data: activities } = useCollection(activitiesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!selectedProjectId || !profile?.organizationId) return null;
    return query(
      collection(db, "expenses"), 
      where("projectId", "==", selectedProjectId),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, selectedProjectId, profile?.organizationId]);
  const { data: expenses } = useCollection(expensesQuery);

  const milestonesQuery = useMemoFirebase(() => {
    if (!selectedProjectId) return null;
    return collection(db, "projects", selectedProjectId, "milestones");
  }, [db, selectedProjectId]);
  const { data: milestones } = useCollection(milestonesQuery);

  const handleGenerateReport = () => {
    if (!selectedProjectId) return;
    setShowReport(true);
    toast({
      title: "Report Generated",
      description: "Detailed project analysis is ready.",
    });
  };

  const handleDownloadPdf = () => {
    // Standard browser print functionality triggers the save-as-pdf dialog
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const totalSpent = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const budget = selectedProject?.budget || 0;
  const utilizationRate = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  const expenseByCategory = React.useMemo(() => {
    if (!expenses) return [];
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  if (showReport && selectedProject) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" onClick={() => setShowReport(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Selection
          </Button>
          <Button onClick={handleDownloadPdf} className="bg-primary hover:bg-primary/90 shadow-md">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div id="printable-report" ref={reportRef} className="bg-white p-8 sm:p-12 rounded-xl shadow-sm border space-y-10 print:shadow-none print:border-none print:p-0 print:m-0">
          {/* Report Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-2">
              <Badge variant="outline" className="text-primary border-primary uppercase tracking-widest font-bold px-3">Impact Report</Badge>
              <h1 className="text-4xl font-headline font-bold text-foreground">{selectedProject.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {selectedProject.location}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Period: {new Date(selectedProject.createdAt).toLocaleDateString()} - Present</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Status</div>
              <Badge className={selectedProject.status === 'Completed' ? 'bg-primary' : 'bg-secondary text-blue-900'}>
                {selectedProject.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Budget</p>
              <p className="text-xl font-bold">{budget.toLocaleString()} CFA</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Spent</p>
              <p className="text-xl font-bold text-destructive">{totalSpent.toLocaleString()} CFA</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Utilization</p>
              <p className="text-xl font-bold text-primary">{utilizationRate}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completion</p>
              <p className="text-xl font-bold text-primary">{selectedProject.progress || 0}%</p>
            </div>
          </div>

          {/* Analysis Charts */}
          <div className="grid md:grid-cols-2 gap-8 pt-4">
            <Card className="border shadow-none bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><PieChartIcon className="h-4 w-4" /> Spending by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={expenseByCategory} 
                      cx="50%" cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => `${v.toLocaleString()} CFA`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-none bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Financial Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span>Budget Used</span>
                    <span>{utilizationRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${utilizationRate}%` }} />
                  </div>
                </div>
                <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                  <p>• {expenseByCategory.length} different cost categories tracked.</p>
                  <p>• {totalSpent > budget ? 'Budget overrun detected.' : 'Remaining balance: ' + (budget - totalSpent).toLocaleString() + ' CFA'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Milestones */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
              <Target className="h-5 w-5 text-primary" />
              Strategic Roadmap
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {milestones?.map((m) => (
                <div key={m.id} className="p-4 rounded-lg border bg-muted/5 flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center ${m.completed ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Due: {new Date(m.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Field Activities
            </h3>
            <div className="space-y-3">
              {activities?.slice(0, 5).map((a) => (
                <div key={a.id} className="flex gap-4 p-4 hover:bg-muted/5 transition-colors border-l-2 border-primary/20">
                  <div className="text-xs font-bold text-muted-foreground min-w-[80px]">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-12 text-center text-[10px] text-muted-foreground uppercase tracking-widest border-t mt-12">
            Generated by NGOTrack Engine • Secure Organization Data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-foreground">Detailed Project Reporting</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Synthesize field activities and financial data into professional PDF reports.</p>
        </div>
      </div>

      <Card className="border-none bg-white shadow-sm overflow-hidden no-print">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Report Configuration
          </CardTitle>
          <CardDescription>
            Select a project to generate a comprehensive status and impact report.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={isProjectsLoading ? "Loading projects..." : "Select an active project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerateReport} 
              disabled={!selectedProjectId || isProjectsLoading}
              className="bg-primary hover:bg-primary/90 h-11 px-8"
            >
              <BarChart4 className="mr-2 h-4 w-4" />
              Prepare Detailed Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {!showReport && (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5 p-6 text-center">
          <FileText className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm max-w-xs mx-auto">Select a project and click "Prepare Detailed Report" to visualize impact, finances, and roadmap progress.</p>
        </div>
      )}
    </div>
  );
}
