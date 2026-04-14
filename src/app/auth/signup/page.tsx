"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    orgName: "",
  });
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Create Auth User first so we are authenticated for subsequent Firestore checks
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Check if an invitation profile already exists for this email
      const q = query(collection(db, "user_profiles"), where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);
      const existingProfileDoc = querySnapshot.docs[0];
      const existingProfile = existingProfileDoc?.data();

      if (existingProfile && existingProfileDoc) {
        // SCENARIO A: User is joining an existing organization via invitation
        await deleteDoc(doc(db, "user_profiles", existingProfileDoc.id));

        await setDoc(doc(db, "user_profiles", user.uid), {
          ...existingProfile,
          id: user.uid,
          firstName: formData.firstName || existingProfile.firstName,
          lastName: formData.lastName || existingProfile.lastName,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      } else {
        // SCENARIO B: User is creating a new organization
        const finalOrgName = formData.orgName || `${formData.firstName}'s Organization`;

        const orgRef = doc(db, "organizations", crypto.randomUUID());
        await setDoc(orgRef, {
          id: orgRef.id,
          name: finalOrgName,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, "user_profiles", user.uid), {
          id: user.uid,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organizationId: orgRef.id,
          role: "admin",
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please log in instead.";
      }
      toast({
        variant: "destructive",
        title: "Signup Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
              <Briefcase className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Join NGOTrack</CardTitle>
          <CardDescription>Register your organization or join an existing one</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="orgName" 
                  placeholder="Acme Foundation (Ignore if invited)" 
                  className="pl-10"
                  value={formData.orgName}
                  onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                If you were invited by an admin, leave the Organization Name blank.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="firstName" 
                    placeholder="John" 
                    className="pl-10"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  placeholder="Doe" 
                  className="w-full"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign Up
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}