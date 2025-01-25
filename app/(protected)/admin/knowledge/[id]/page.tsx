import { Suspense } from 'react';

import { ArticleDetail } from '@/components/article/article-detail';

interface Params {
  id: string;
}

interface ArticlePageProps {
  params: Promise<Params>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  // Await the params Promise to get the actual params object
  const resolvedParams = await params;
  const { id } = resolvedParams;

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <ArticleDetail id={id} />
    </Suspense>
  );
}
