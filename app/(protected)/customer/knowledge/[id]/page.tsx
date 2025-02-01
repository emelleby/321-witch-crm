import { Suspense } from "react";

import { ArticleDetail } from "@/components/article/article-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <div className="container py-6">
        <ArticleDetail articleId={id} />
      </div>
    </Suspense>
  );
}
