"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Handle "Invited but already had an Auth account" scenario
      // Check if user has a profile doc with their UID.
      const profileQuery = query(collection(db, "user_profiles"), where("id", "==", user.uid));
      const profileSnap = await getDocs(profileQuery);

      if (profileSnap.empty) {
        // If no UID profile exists, search for an invited profile by email
        const inviteQuery = query(collection(db, "user_profiles"), where("email", "==", email));
        const inviteSnap = await getDocs(inviteQuery);

        if (!inviteSnap.empty) {
          const inviteDoc = inviteSnap.docs[0];
          const inviteData = inviteDoc.data();

          // Claim the invitation: Delete the old doc (id was random UUID) and create a new one with user UID
          await deleteDoc(doc(db, "user_profiles", inviteDoc.id));
          await setDoc(doc(db, "user_profiles", user.uid), {
            ...inviteData,
            id: user.uid,
            status: "active",
            createdAt: new Date().toISOString(),
          });
          
          toast({
            title: "Welcome aboard",
            description: "Your organization membership has been activated.",
          });
        }
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: error.message,
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
          <CardTitle className="text-2xl font-headline font-bold">Welcome Back</CardTitle>
          <CardDescription>Log in to manage your impact programs</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jane@example.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an organization yet?{" "}
              <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}