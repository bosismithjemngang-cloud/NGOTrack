
"use client";

import React from "react";
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
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

const projectStatusData = [
  { name: "Completed", value: 12, color: "hsl(var(--primary))" },
  { name: "Active", value: 8, color: "hsl(var(--secondary))" },
  { name: "Planning", value: 5, color: "hsl(var(--chart-3))" },
];

const budgetData = [
  { month: "Jan", allocated: 45000, spent: 32000 },
  { month: "Feb", allocated: 45000, spent: 38000 },
  { month: "Mar", allocated: 50000, spent: 48000 },
  { month: "Apr", allocated: 50000, spent: 42000 },
  { month: "May", allocated: 55000, spent: 51000 },
  { month: "Jun", allocated: 55000, spent: 49000 },
];

export default function DashboardPage() {
  const db = useFirestore();
  const { user } = useUser();

  // 1. Fetch User Profile for organizationId
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch data scoped by organizationId
  const activitiesQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "activities"), 
      where("organizationId", "==", profile.organizationId),
      limit(20)
    );
  }, [db, profile]);
  const { data: activitiesData, isLoading: isActivitiesLoading } = useCollection(activitiesQuery);

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

  const activities = React.useMemo(() => {
    if (!activitiesData) return [];
    return [...activitiesData].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [activitiesData]);

  const totalBudget = projects?.reduce((acc, p) => acc + (p.budget || 0), 0) || 0;
  const totalSpent = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
  const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const stats = [
    { label: "My Projects", value: projects?.length.toString() || "0", icon: Briefcase, change: "Active programs", trend: "up" },
    { label: "Beneficiaries", value: "1,240", icon: Users, change: "+15% vs last qtr", trend: "up" },
    { label: "Budget Utilization", value: `${utilizationRate}%`, icon: DollarSign, change: "On-track spending", trend: "up" },
    { label: "Completion Rate", value: "92%", icon: CheckCircle2, change: "+4% performance", trend: "up" },
  ];

  if (!profile && !isActivitiesLoading) return null; // Wait for profile

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-bold text-foreground">Impact Overview</h2>
          <p className="text-muted-foreground mt-1">Real-time tracking for {formData?.orgName || 'your organization'}.</p>
        </div>
        <div className="flex gap-2">
          <Card className="p-1 px-3 flex items-center gap-2 bg-secondary/10 border-secondary/20">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Live Data</span>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="h-3 w-3 text-primary mr-1" />
                <span className="text-xs text-primary">{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Budget vs Expenditure</CardTitle>
            <CardDescription>Monthly overview for organization (USD)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `$${v/1000}k`} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="allocated" fill="#ADD8E6" radius={[4, 4, 0, 0]} name="Allocated" />
                  <Bar dataKey="spent" fill="#2E8B57" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Portfolio Status</CardTitle>
            <CardDescription>Distribution across organization</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {projectStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4 w-full">
              {projectStatusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
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
            <CardTitle className="font-headline text-xl">Recent Staff Updates</CardTitle>
            <CardDescription>Updates from your team members</CardDescription>
          </div>
          <Button variant="outline" size="sm">View History</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {isActivitiesLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activities for your organization.</p>
            ) : (
              activities.map((activity, i) => (
                <div key={activity.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://picsum.photos/seed/${activity.id}/40/40`} />
                      <AvatarFallback>{activity.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.name} <span className="text-muted-foreground font-normal">progressed to</span> {activity.progressPercentage}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Active'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
