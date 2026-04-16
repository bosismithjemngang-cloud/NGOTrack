
"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Building2, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Mail,
  Fingerprint
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  // 2. Fetch Organization
  const orgRef = useMemoFirebase(() => {
    if (!profile?.organizationId) return null;
    return doc(db, "organizations", profile.organizationId);
  }, [db, profile]);
  const { data: organization, isLoading: isOrgLoading } = useDoc(orgRef);

  const isAdmin = profile?.role === "admin";

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
    };

    try {
      updateDocumentNonBlocking(doc(db, "user_profiles", user.uid), updates);
      toast({
        title: "Profile Updated",
        description: "Your personal information has been saved.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.organizationId || !isAdmin) return;

    setIsUpdatingOrg(true);
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get("orgName") as string,
      taxId: formData.get("taxId") as string,
    };

    try {
      updateDocumentNonBlocking(doc(db, "organizations", profile.organizationId), updates);
      toast({
        title: "Organization Updated",
        description: "Organization settings have been saved successfully.",
      });
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  if (isProfileLoading || isOrgLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-headline font-bold">Account Settings</h2>
        <p className="text-muted-foreground">Manage your personal profile and organization configuration.</p>
      </div>

      <div className="grid gap-8">
        {/* Personal Profile Section */}
        <Card className="border-none shadow-sm">
          <form onSubmit={handleUpdateProfile}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Personal Profile</CardTitle>
              </div>
              <CardDescription>Update your display name and view your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={profile?.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={profile?.lastName} required />
                </div>
              </div>

              <div className="space-y-4">
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email Address</span>
                  </div>
                  <span className="font-medium">{profile?.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Organization Role</span>
                  </div>
                  <Badge variant="secondary" className="capitalize">{profile?.role}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Fingerprint className="h-4 w-4" />
                    <span>User ID</span>
                  </div>
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{user?.uid}</code>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-4">
              <Button type="submit" disabled={isUpdatingProfile} className="ml-auto">
                {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Organization Section (Admin Only) */}
        {isAdmin && (
          <Card className="border-none shadow-sm border-l-4 border-l-primary">
            <form onSubmit={handleUpdateOrg}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Organization Settings</CardTitle>
                </div>
                <CardDescription>Modify the legal identity and administrative details of your NGO.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Legal Entity Name</Label>
                    <Input id="orgName" name="orgName" defaultValue={organization?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                    <Input id="taxId" name="taxId" defaultValue={organization?.taxId} placeholder="Optional" />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">Tenant Identification</p>
                  <p className="text-sm text-muted-foreground mb-3">This unique ID is used to strictly isolate your organization's data from others.</p>
                  <code className="block p-2 bg-white border rounded text-[10px] font-mono break-all">
                    {profile?.organizationId}
                  </code>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t py-4">
                <Button type="submit" disabled={isUpdatingOrg} className="ml-auto">
                  {isUpdatingOrg && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Update Organization
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Non-Admin Organization Info */}
        {!isAdmin && (
          <Card className="border-none shadow-sm bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You are a member of <span className="font-bold text-foreground">{organization?.name}</span>. 
                Only administrators can modify organization-level settings.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Member Since {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : 'N/A'}</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
