'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { notifications } from '@/utils/notifications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/file-upload';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Pencil, Trash2, Eye } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/rich-text-editor';

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  organization_id: string;
  views_count: number;
  created_at: string;
  updated_at: string;
  file_ids: string[];
  fileUrls?: string[];
};

const CATEGORIES = [
  'Getting Started',
  'Account & Billing',
  'Features & Tools',
  'Troubleshooting',
  'API Documentation',
  'Best Practices',
  'FAQs',
];


export default function KnowledgeBasePage() {
  const supabase = createClient();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      // Get all articles for the organization
      const { data: articles, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get file URLs for each article
      const articlesWithFiles = await Promise.all(
        articles.map(async (article) => {
          if (!article.file_ids?.length) return { ...article, fileUrls: [] };

          const fileUrls = await Promise.all(
            article.file_ids.map(async (fileId) => {
              const { data: fileData } = await supabase
                .from('files')
                .select('storage_path')
                .eq('id', fileId)
                .single();

              if (fileData) {
                const { data } = supabase.storage
                  .from('attachments')
                  .getPublicUrl(fileData.storage_path);
                return data.publicUrl;
              }
              return null;
            })
          );

          return {
            ...article,
            fileUrls: fileUrls.filter(Boolean),
          };
        })
      );

      setArticles(articlesWithFiles);
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !category) {
      notifications.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        organization_id: profile.organization_id,
        file_ids: fileIds,
      };

      if (editingArticle) {
        // Update article
        const { error } = await supabase
          .from('knowledge_base')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;

        notifications.success('Article updated successfully');
      } else {
        // Create new article
        const { error } = await supabase.from('knowledge_base').insert([articleData]);

        if (error) throw error;

        notifications.success('Article created successfully');
      }

      setShowArticleDialog(false);
      setEditingArticle(null);
      resetForm();
      await fetchArticles();
    } catch (error) {
      console.error('Error:', error);
      notifications.error(editingArticle ? 'Failed to update article' : 'Failed to create article');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setTags(article.tags?.join(', ') || '');
    setFileIds(article.file_ids || []);
    setShowArticleDialog(true);
  };

  const handleDelete = async (articleId: string) => {
    try {
      const { error } = await supabase.from('knowledge_base').delete().eq('id', articleId);

      if (error) throw error;

      notifications.success('Article deleted successfully');
      await fetchArticles();
    } catch (error) {
      console.error('Error:', error);
      notifications.error('Failed to delete article');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('');
    setTags('');
    setFileIds([]);
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Manage your help articles and documentation</p>
        </div>
        <Dialog
          open={showArticleDialog}
          onOpenChange={(open) => {
            setShowArticleDialog(open);
            if (!open) {
              setEditingArticle(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingArticle ? 'Edit Article' : 'Create Article'}</DialogTitle>
              <DialogDescription>
                {editingArticle
                  ? 'Update the article content and settings.'
                  : 'Create a new help article for your knowledge base.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <RichTextEditor
                  onChange={setContent}
                  initialContent={content}
                  className="min-h-[200px]"
                  placeholder="Write your article content here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Enter tags, separated by commas"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attachments</label>
                <FileUpload maxFiles={5} onUploadComplete={(ids) => setFileIds(ids)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim() || !category}
              >
                {submitting ? 'Saving...' : editingArticle ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="flex gap-4 p-4">
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArticles.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell>{article.category}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {article.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{article.views_count}</TableCell>
                <TableCell>{new Date(article.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Article</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this article? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(article.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
