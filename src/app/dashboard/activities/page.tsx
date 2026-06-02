"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Briefcase,
  ArrowRight,
  CalendarDays,
  ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCollection, 
  useFirestore, 
  useMemoFirebase, 
  useUser, 
  useDoc 
} from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Link from "next/link";
import { format, isToday, isYesterday, isSameDay, startOfDay } from "date-fns";

export default function ActivitiesPage() {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const db = useFirestore();
  const { user } = useUser();

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // 2. Fetch all activities for the organization
  const activitiesQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "activities"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);
  const { data: activitiesData, isLoading } = useCollection(activitiesQuery);

  // 3. Fetch projects to map project IDs to names and for filtering
  const projectsQuery = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "projects"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);
  const { data: projects } = useCollection(projectsQuery);

  // Helper to get project name
  const getProjectName = (projectId: string) => {
    return projects?.find(p => p.id === projectId)?.name || "Unknown Project";
  };

  // Sort and filter activities
  const groupedActivities = React.useMemo(() => {
    if (!activitiesData) return [];
    
    let filtered = [...activitiesData];
    
    if (search) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedProjectId !== "all") {
      filtered = filtered.filter(a => a.projectId === selectedProjectId);
    }

    // Sort by date descending
    const sorted = filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Group by day
    const groups: { date: string, label: string, items: any[] }[] = [];
    
    sorted.forEach(activity => {
      const date = activity.createdAt ? new Date(activity.createdAt) : new Date();
      const dateKey = format(date, 'yyyy-MM-dd');
      
      let groupLabel = format(date, 'MMMM do, yyyy');
      if (isToday(date)) groupLabel = "Today";
      else if (isYesterday(date)) groupLabel = "Yesterday";

      let group = groups.find(g => g.date === dateKey);
      if (!group) {
        group = { date: dateKey, label: groupLabel, items: [] };
        groups.push(group);
      }
      group.items.push(activity);
    });

    return groups;
  }, [activitiesData, search, selectedProjectId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Field Activity Feed</h2>
          <p className="text-muted-foreground">Chronological log of real-time progress and field observations.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search activities or notes..." 
            className="pl-10 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading your organization's activity history...</p>
          </div>
        ) : groupedActivities.length === 0 ? (
          <Card className="border-2 border-dashed py-24 text-center">
            <CardContent className="space-y-4">
              <CalendarDays className="h-12 w-12 mx-auto opacity-20" />
              <div className="space-y-1">
                <p className="font-bold text-lg">No activities found</p>
                <p className="text-muted-foreground">Try adjusting your filters or log an update from a project page.</p>
              </div>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/dashboard/projects">Go to Projects</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          groupedActivities.map((group) => (
            <div key={group.date} className="space-y-4">
              <div className="flex items-center gap-4 sticky top-16 bg-background/95 backdrop-blur-sm py-2 z-10">
                <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {group.label}
                </h3>
                <div className="h-px bg-muted flex-1" />
              </div>

              <div className="space-y-4 ml-1">
                {group.items.map((activity) => (
                  <Card key={activity.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
                    <CardContent className="p-0 flex">
                      <div className="w-1.5 bg-primary/20 group-hover:bg-primary transition-colors shrink-0" />
                      <div className="flex-1 p-5 sm:p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex gap-4 min-w-0">
                            <div className="relative shrink-0 pt-1">
                              <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-muted">
                                <AvatarImage src={`https://picsum.photos/seed/${activity.createdBy}/48/48`} />
                                <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              </div>
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-lg leading-tight">{activity.name}</h4>
                                <Badge variant="secondary" className="font-bold text-[10px] uppercase bg-primary/10 text-primary border-none">
                                  {activity.progressPercentage}% Complete
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <Link 
                                  href={`/dashboard/projects/${activity.projectId}`} 
                                  className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                                >
                                  <Briefcase className="h-3 w-3" />
                                  {getProjectName(activity.projectId)}
                                </Link>
                                <span className="hidden sm:inline opacity-50">•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {activity.createdAt ? format(new Date(activity.createdAt), 'h:mm a') : 'Recent'}
                                </span>
                              </div>
                              <div className="mt-4 bg-muted/20 p-4 rounded-xl border border-muted/50 text-sm leading-relaxed text-foreground/80 italic">
                                "{activity.description || "Field staff noted consistent progress without additional documentation."}"
                              </div>
                            </div>
                          </div>
                          <div className="flex md:flex-col gap-2 shrink-0 md:items-end">
                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-bold">
                              <Link href={`/dashboard/projects/${activity.projectId}`}>
                                Project Details
                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
