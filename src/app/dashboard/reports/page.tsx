"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Sparkles, 
  Download, 
  Loader2, 
  ArrowRight,
  Target,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { generateImpactReport, type ImpactReportOutput } from "@/ai/flows/impact-report-flow";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ImpactReportOutput | null>(null);

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

  // 3. Fetch Activities & Expenses for selected project
  // We MUST include organizationId filter for multi-tenant security rules to pass on list operations
  const activitiesQuery = useMemoFirebase(() => {
    if (!selectedProjectId || !profile?.organizationId) return null;
    return query(
      collection(db, "activities"), 
      where("projectId", "==", selectedProjectId),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, selectedProjectId, profile?.organizationId]);
  const { data: activities, isLoading: isActivitiesLoading } = useCollection(activitiesQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!selectedProjectId || !profile?.organizationId) return null;
    return query(
      collection(db, "expenses"), 
      where("projectId", "==", selectedProjectId),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, selectedProjectId, profile?.organizationId]);
  const { data: expenses, isLoading: isExpensesLoading } = useCollection(expensesQuery);

  const handleGenerateReport = async () => {
    if (!selectedProjectId || !projects) return;
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    if (isActivitiesLoading || isExpensesLoading) {
      toast({
        title: "Wait a moment",
        description: "We're still gathering project data.",
      });
      return;
    }

    setIsGenerating(true);
    setReport(null);

    try {
      const result = await generateImpactReport({
        projectName: project.name,
        projectDescription: project.description || "No description provided",
        totalBudget: project.budget || 0,
        activities: (activities || []).map(a => ({
          name: a.name,
          description: a.description,
          progressPercentage: a.progressPercentage,
          createdAt: a.createdAt
        })),
        expenses: (expenses || []).map(e => ({
          amount: e.amount,
          category: e.category,
          description: e.description
        }))
      });
      setReport(result);
      toast({
        title: "Report Generated",
        description: "AI impact report is ready for review.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Failed to generate report.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-headline font-bold">Impact Reporting</h2>
        <p className="text-muted-foreground">Generate data-driven reports for donors and stakeholders using AI.</p>
      </div>

      <Card className="border-none bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Report Generator
          </CardTitle>
          <CardDescription>
            Select a project to analyze activities and financial data.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
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
              disabled={!selectedProjectId || isGenerating || isProjectsLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-headline font-bold">Project Synthesis</h3>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {report.summary}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Key Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {report.milestonesReached.map((milestone, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground italic">
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      {milestone}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Financial Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.financialEfficiency}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm md:col-span-2 bg-muted/30 border border-muted">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  M&E Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {report.futureRecommendations}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!report && !isGenerating && (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
          <FileText className="h-12 w-12 mb-4 opacity-20" />
          <p>Select a project and click "Generate Report" to begin analysis.</p>
        </div>
      )}
    </div>
  );
}