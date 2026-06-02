"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Briefcase,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  useCollection, 
  useFirestore, 
  useMemoFirebase, 
  useUser, 
  useDoc 
} from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Link from "next/link";

export default function ActivitiesPage() {
  const [search, setSearch] = useState("");
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

  // 3. Fetch projects to map project IDs to names
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
  const activities = React.useMemo(() => {
    if (!activitiesData) return [];
    
    let filtered = [...activitiesData];
    
    if (search) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [activitiesData, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold">Field Activity Feed</h2>
          <p className="text-muted-foreground">Monitor real-time progress updates and field notes from your team.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search activities or notes..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activities.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-20 text-center text-muted-foreground">
              <p>No field activities recorded yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/dashboard/projects">Visit a project to log an update</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1 bg-primary group-hover:bg-primary/80 transition-colors" />
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <Avatar className="h-12 w-12 border border-secondary/20">
                            <AvatarImage src={`https://picsum.photos/seed/${activity.createdBy}/48/48`} />
                            <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-lg">{activity.name}</h3>
                            <Badge variant="secondary" className="font-normal text-[10px] uppercase">
                              {activity.progressPercentage}% Complete
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <Link href={`/dashboard/projects/${activity.projectId}`} className="hover:text-primary transition-colors font-medium">
                              {getProjectName(activity.projectId)}
                            </Link>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Recent'}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 mt-3 leading-relaxed bg-muted/30 p-3 rounded-lg border border-muted/50">
                            {activity.description || "No additional field notes provided."}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="hidden md:flex shrink-0">
                        <Link href={`/dashboard/projects/${activity.projectId}`}>
                          Project Info
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}