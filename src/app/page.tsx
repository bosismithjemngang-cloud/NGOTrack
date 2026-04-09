
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ShieldCheck, BarChart4, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  const handleStart = async () => {
    try {
      await signInAnonymously(auth);
      router.push("/dashboard");
    } catch (error) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      <header className="px-6 h-16 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-headline font-bold text-primary">NGOTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleStart}>Login</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleStart}>Get Started</Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 text-center bg-gradient-to-b from-secondary/20 to-white">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-5xl font-headline font-extrabold text-foreground leading-tight">
              Manage Your NGO Programs with <span className="text-primary">Clarity and Impact</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Empowering non-profits with real-time tracking, transparent budgeting, and comprehensive evaluation tools to drive community growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button size="lg" className="bg-primary text-lg px-8 py-6 rounded-xl" onClick={handleStart}>
                Access Platform Dashboard
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl">
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
            {[
              {
                icon: ShieldCheck,
                title: "Transparent Tracking",
                description: "Full visibility into every project phase, from planning to completion with secure audit trails."
              },
              {
                icon: BarChart4,
                title: "Real-time Analytics",
                description: "Instantly visualize your impact with automated reporting and beautiful data dashboards."
              },
              {
                icon: Users2,
                title: "Unified Teamwork",
                description: "Collaborate seamlessly across roles with field officer updates and administrative oversight."
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border border-secondary/20 hover:border-primary/30 transition-colors bg-secondary/5">
                <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-primary">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-headline font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/10">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            <h2 className="text-3xl font-headline font-bold">Trusted by Local & International Organizations</h2>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
              <div className="text-2xl font-bold">GLOBAL REACH</div>
              <div className="text-2xl font-bold">COMMUNITY FIRST</div>
              <div className="text-2xl font-bold">IMPACT HUB</div>
              <div className="text-2xl font-bold">NGO ALLIANCE</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <span className="font-headline font-bold text-lg text-primary">NGOTrack</span>
            </div>
            <p className="text-sm text-muted-foreground">The ultimate platform for non-profit program management and impact evaluation.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Features</li>
              <li>Case Studies</li>
              <li>Reporting Tools</li>
              <li>Security</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Documentation</li>
              <li>Help Center</li>
              <li>Best Practices</li>
              <li>Community</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Twitter</li>
              <li>LinkedIn</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} NGOTrack Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
