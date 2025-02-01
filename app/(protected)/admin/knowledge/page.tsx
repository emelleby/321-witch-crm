"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";

type FAQ = Database["public"]["Tables"]["knowledge_faqs"]["Row"];

export default function AdminKnowledgePage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  const fetchFaqs = useCallback(async () => {
    const { data, error } = await supabase
      .from("knowledge_faqs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching FAQs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch FAQs",
        variant: "destructive",
      });
      return;
    }

    setFaqs(data || []);
  }, [supabase, toast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleCreateFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both question and answer fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create an FAQ",
          variant: "destructive",
        });
        return;
      }

      // Get user's organization_id
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !userProfile?.organization_id) {
        toast({
          title: "Error",
          description: "Failed to get organization information",
          variant: "destructive",
        });
        return;
      }

      const { error: faqError } = await supabase.from("knowledge_faqs").insert({
        question: newQuestion,
        answer: newAnswer,
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
        organization_id: userProfile.organization_id,
      });

      if (faqError) throw faqError;

      setNewQuestion("");
      setNewAnswer("");
      fetchFaqs();
      toast({
        title: "Success",
        description: "FAQ created successfully",
      });
    } catch (error) {
      console.error("Error creating FAQ:", error);
      toast({
        title: "Error",
        description: "Failed to create FAQ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Knowledge Base Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create New FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Answer"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleCreateFaq}>Create FAQ</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <Card key={faq.faq_id}>
            <CardHeader>
              <CardTitle>{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faq.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
