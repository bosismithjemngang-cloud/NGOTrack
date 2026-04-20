
"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  PlusCircle, 
  History,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { askAssistant, AssistantOutput } from "@/ai/flows/assistant-flow";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your NGOTrack Intelligence Assistant. How can I help you manage your programs or analyze your impact today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const profileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "user_profiles", user.uid);
  }, [db, user]);
  const { data: profile } = useDoc(profileRef);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !profile?.organizationId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const result = await askAssistant({
        organizationId: profile.organizationId,
        query: userMessage,
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response, 
        timestamp: new Date(),
        suggestions: result.suggestedActions
      }]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Assistant Offline",
        description: "I'm having trouble connecting to my brain right now. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] max-w-5xl mx-auto animate-in fade-in duration-500 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-1 gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-headline font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            AI Assistant
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Query live program, team, and budget data.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMessages([messages[0]])} className="w-fit">
          <PlusCircle className="h-4 w-4 mr-2" />
          Reset Chat
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-white/50 backdrop-blur-sm min-w-0">
        <ScrollArea className="flex-1 p-3 sm:p-6">
          <div className="space-y-6">
            {messages.map((message, i) => (
              <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 sm:gap-4 max-w-[90%] sm:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className={`h-8 w-8 sm:h-10 sm:w-10 border-2 shrink-0 ${message.role === 'assistant' ? 'border-primary/20' : 'border-secondary/20'}`}>
                    {message.role === 'assistant' ? (
                      <div className="bg-primary h-full w-full flex items-center justify-center text-white">
                        <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    ) : (
                      <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/40/40`} />
                    )}
                    <AvatarFallback>{message.role === 'assistant' ? 'AI' : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 min-w-0">
                    <div className={`p-3 sm:p-4 rounded-2xl shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white border text-foreground rounded-tl-none'
                    }`}>
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                        {message.suggestions.map((s, idx) => (
                          <Button 
                            key={idx} 
                            variant="secondary" 
                            size="sm" 
                            className="text-[9px] sm:text-[10px] h-6 sm:h-7 rounded-full bg-secondary/30 hover:bg-secondary/50 border-none px-2 sm:px-3"
                            onClick={() => handleSuggestionClick(s)}
                          >
                            <Lightbulb className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            {s}
                          </Button>
                        ))}
                      </div>
                    )}
                    <p className={`text-[9px] sm:text-[10px] text-muted-foreground ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 sm:gap-4 max-w-[90%] sm:max-w-[80%]">
                  <div className="bg-primary h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-white animate-pulse shrink-0">
                    <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="bg-white border p-3 sm:p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
                    <span className="text-xs sm:text-sm text-muted-foreground italic">Analysing records...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-3 sm:p-6 border-t bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              placeholder="Query project data..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-10 sm:h-12 rounded-xl focus-visible:ring-primary text-xs sm:text-sm"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shrink-0" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </form>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-bold text-center">
            <span>Enterprise Intelligence</span>
            <div className="h-1 w-1 bg-muted rounded-full" />
            <span>Secure Cloud Compute</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
