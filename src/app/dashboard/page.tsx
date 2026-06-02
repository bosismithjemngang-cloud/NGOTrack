
"use client";

import React, { useEffect, useState } from "react";
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  DollarSign,
  Sparkles,
  ArrowRight,
  Loader2,
  Lightbulb
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, limit, where, doc } from "firebase/firestore";
import { generateMorningBriefing, type BriefingOutput } from "@/ai/flows/morning-briefing-flow";
import Link from "next/link";

export default function DashboardPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [briefing, setBriefing] = useState<BriefingOutput | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  const orgRef = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return doc(db, "organizations", profile.organizationId);
  }, [db, profile?.organizationId]);
  const { data: organization } = useDoc(orgRef);

  const activitiesQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "activities"), 
      where("organizationId", "==", profile.organizationId),
      limit(20)
    );
  }, [db, profile]);
  const { data: activitiesData } = useCollection(activitiesQuery);

  const projectsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: projects } = useCollection(projectsQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "expenses"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile]);
  const { data: expenses } = useCollection(expensesQuery);

  const totalSpent = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

  useEffect(() => {
    async function getBriefing() {
      if (!profile || !projects || !activitiesData || isBriefingLoading || briefing) return;
      
      setIsBriefingLoading(true);
      try {
        const result = await generateMorningBriefing({
          orgName: organization?.name || "the organization",
          userName: profile.firstName,
          projects: projects.map(p => ({
            name: p.name,
            status: p.status,
            progress: p.progress || 0,
            budget: p.budget || 0,
          })),
          totalSpent,
          recentActivities: activitiesData.slice(0, 3).map(a => ({
            name: a.name,
            projectName: projects.find(p => p.id === a.projectId)?.name || "Unknown",
            createdAt: a.createdAt,
          })),
        });
        setBriefing(result);
      } catch (error) {
        // AI flow failed silently
      } finally {
        setIsBriefingLoading(false);
      }
    }
    getBriefing();
  }, [profile, projects, activitiesData, organization, totalSpent, briefing]);

  const projectStatusData = React.useMemo(() => {
    if (!projects) return [];
    const counts = projects.reduce((acc: any, p) => {
      const status = p.status || "Planning";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const colors: Record<string, string> = {
      "Completed": "hsl(var(--primary))",
      "Active": "hsl(var(--secondary))",
      "Planning": "hsl(var(--chart-3))",
      "On Hold": "hsl(var(--chart-5))"
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value: value as number,
      color: colors[name] || "hsl(var(--muted))"
    }));
  }, [projects]);

  const budgetChartData = React.useMemo(() => {
    if (!projects || !expenses) return [];
    return projects.slice(0, 6).map(p => {
      const spent = expenses
        .filter(e => e.projectId === p.id)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        name: p.name.length > 10 ? p.name.substring(0, 10) + "..." : p.name,
        allocated: p.budget || 0,
        spent: spent
      };
    });
  }, [projects, expenses]);

  const recentActivities = React.useMemo(() => {
    if (!activitiesData) return [];
    return [...activitiesData].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [activitiesData]);

  const totalBudget = projects?.reduce((acc, p) => acc + (p.budget || 0), 0) || 0;
  const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const stats = [
    { label: "Active Projects", value: projects?.length.toString() || "0", icon: Briefcase, change: "Current initiatives" },
    { label: "Team Members", value: "...", icon: Users, change: "Active staff" },
    { label: "Budget Used", value: `${utilizationRate}%`, icon: DollarSign, change: `${totalSpent.toLocaleString()} CFA spent` },
    { label: "Completed", value: projects?.filter(p => p.status === 'Completed').length.toString() || "0", icon: CheckCircle2, change: "Finished programs" },
  ];

  if (!profile && !projects) return null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Impact Overview</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Real-time tracking for {organization?.name || 'your organization'}.</p>
        </div>
        <div className="flex gap-2">
          <Card className="p-1 px-3 flex items-center gap-2 bg-secondary/10 border-secondary/20">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-primary">Live Data</span>
          </Card>
        </div>
      </div>

      <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-secondary/10 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
          <Sparkles className="h-24 w-24 text-primary" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-headline">Intelligence Briefing</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isBriefingLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing program status...</span>
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              <div>
                <p className="text-lg sm:text-xl font-bold text-primary mb-1">{briefing.greeting}</p>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{briefing.summary}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Today's Priorities
                  </p>
                  <ul className="space-y-1">
                    {briefing.topPriorities.map((p, i) => (
                      <li key={i} className="text-[10px] sm:text-xs flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                {briefing.statusAlert && (
                  <div className="bg-destructive/5 border border-destructive/10 p-3 rounded-lg flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-destructive-foreground font-medium">{briefing.statusAlert}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-xs sm:text-sm text-muted-foreground italic">
              Log activity or update projects to generate your intelligence briefing.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-primary mr-1" />
                <span className="text-[10px] sm:text-xs text-primary">{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none bg-white shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-lg sm:text-xl">Budget vs Expenditure</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Actual spending per project (CFA)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                  <Bar dataKey="allocated" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Allocated" />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none bg-white shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-lg sm:text-xl">Program Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Distribution across organization</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[200px] sm:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {projectStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full">
              {projectStatusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground line-clamp-1">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-lg sm:text-xl">Recent Staff Updates</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Live progress from your field team</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/dashboard/activities">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {!recentActivities || recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activities found.</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-3 sm:gap-4">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={`https://picsum.photos/seed/${activity.createdBy}/40/40`} />
                      <AvatarFallback>{activity.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">
                        {activity.name} <span className="text-muted-foreground font-normal">progressed to</span> {activity.progressPercentage}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Active'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/dashboard/projects/${activity.projectId}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" asChild className="w-full sm:hidden mt-4">
              <Link href="/dashboard/activities">View All Activities</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
