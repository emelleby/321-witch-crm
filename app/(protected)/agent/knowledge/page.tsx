'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Article = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export default function AgentKnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      setArticles(data || []);
      setLoading(false);
    };

    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader heading="Knowledge Base" description="Search and reference help articles" />

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="p-4">
            <h3 className="mb-2 font-semibold">{article.title}</h3>
            <p className="mb-4 text-sm text-muted-foreground">Category: {article.category}</p>
            <Button asChild>
              <Link href={`/agent/knowledge/${article.id}`}>View Article</Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
