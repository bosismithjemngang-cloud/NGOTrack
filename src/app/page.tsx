
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ShieldCheck, BarChart4, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

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
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
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
              <Button size="lg" className="bg-primary text-lg px-8 py-6 rounded-xl" asChild>
                <Link href="/auth/signup">Register Your Organization</Link>
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
                title: "Organization Isolation",
                description: "Secure multi-tenant architecture ensures your NGO data is private and strictly controlled."
              },
              {
                icon: BarChart4,
                title: "Impact Dashboards",
                description: "Instantly visualize program performance across your entire organization with beautiful reports."
              },
              {
                icon: Users2,
                title: "Role-Based Access",
                description: "Manage admins, officers, and staff with granular permissions tailored to NGO workflows."
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
            <p className="text-sm text-muted-foreground">The ultimate platform for multi-tenant non-profit program management.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Multi-tenancy</li>
              <li>Security</li>
              <li>Reporting</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>LinkedIn</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
