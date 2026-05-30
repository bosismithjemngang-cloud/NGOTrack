"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  BarChart3, 
  PieChart, 
  FileText, 
  Users, 
  LogOut,
  Search,
  Bell,
  Settings,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Circle
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUser, useAuth, useDoc, useMemoFirebase, useFirestore, useCollection } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "AI Assistant", icon: Sparkles, href: "/dashboard/assistant" },
  { title: "Projects", icon: Briefcase, href: "/dashboard/projects" },
  { title: "Activities", icon: CheckSquare, href: "/dashboard/activities" },
  { title: "Budget", icon: BarChart3, href: "/dashboard/budget" },
  { title: "Reports", icon: PieChart, href: "/dashboard/reports" },
  { title: "Documents", icon: FileText, href: "/dashboard/documents" },
  { title: "Staff", icon: Users, href: "/dashboard/staff", roles: ["admin"] },
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // Notifications logic - strictly scoped by userId for security rules
  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
  }, [db, user?.uid]);
  const { data: notifications } = useCollection(notificationsQuery);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const markAsRead = (id: string) => {
    updateDocumentNonBlocking(doc(db, "notifications", id), { read: true });
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return profile?.role && item.roles.includes(profile.role);
  });

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && !isProfileLoading && !profile) {
    return <div className="p-8 text-center">User profile not found. Please contact support.</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border bg-white shadow-sm">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-headline font-bold text-primary">NGOTrack</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4 py-2">
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      pathname === item.href 
                        ? "bg-primary text-white hover:bg-primary/90" 
                        : "text-muted-foreground hover:bg-secondary/20 hover:text-primary"
                    }`}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="flex items-center gap-3 text-muted-foreground hover:text-destructive w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-white px-4 sm:px-6">
            <SidebarTrigger />
            <div className="relative flex-1 max-w-md hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-10 bg-muted/30 border-none h-10 ring-offset-background focus-visible:ring-primary"
              />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
                  <div className="bg-muted/50 p-4 border-b">
                    <h3 className="text-sm font-bold">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {!notifications || notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground italic">
                        No recent notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer relative ${!notif.read ? 'bg-primary/5' : ''}`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          {!notif.read && <Circle className="absolute top-5 right-4 h-2 w-2 fill-primary text-primary" />}
                          <p className="text-xs font-bold pr-4">{notif.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                          <p className="text-[8px] text-muted-foreground mt-2 uppercase font-bold tracking-tighter">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications && notifications.length > 0 && (
                    <div className="bg-muted/50 p-2 text-center border-t">
                      <Button variant="link" size="sm" className="text-[10px]">View All Notifications</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 sm:gap-3 px-2 sm:pl-4 sm:border-l h-10 rounded-none hover:bg-transparent">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium leading-none">{profile?.firstName} {profile?.lastName}</p>
                      <p className="text-[10px] text-muted-foreground capitalize mt-1">{profile?.role}</p>
                    </div>
                    <div className="relative group">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary/20 transition-all group-hover:border-primary">
                        <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/40/40`} />
                        <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full border border-muted p-0.5">
                        <ChevronDown className="h-2 w-2 text-muted-foreground" />
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="sm:hidden">
                    <p className="text-sm font-medium leading-none">{profile?.firstName} {profile?.lastName}</p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-1">{profile?.role}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="sm:hidden" />
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/dashboard/settings" className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/dashboard/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Organization</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
