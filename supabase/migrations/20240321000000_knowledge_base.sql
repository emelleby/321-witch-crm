-- Create knowledge base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT [],
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Create knowledge base files junction table
CREATE TABLE IF NOT EXISTS public.knowledge_base_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(knowledge_base_id, file_id)
);
-- Enable Row Level Security
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;
-- Create policies for knowledge base
CREATE POLICY "Users can view knowledge base articles from their organization" ON public.knowledge_base FOR
SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );
CREATE POLICY "Agents can create knowledge base articles for their organization" ON public.knowledge_base FOR
INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'agent'
        )
    );
CREATE POLICY "Agents can update knowledge base articles for their organization" ON public.knowledge_base FOR
UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'agent'
        )
    );
CREATE POLICY "Agents can delete knowledge base articles for their organization" ON public.knowledge_base FOR DELETE USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
            AND role = 'agent'
    )
);
-- Create policies for knowledge base files
CREATE POLICY "Users can view knowledge base files from their organization" ON public.knowledge_base_files FOR
SELECT USING (
        knowledge_base_id IN (
            SELECT id
            FROM public.knowledge_base kb
            WHERE kb.organization_id IN (
                    SELECT organization_id
                    FROM public.profiles
                    WHERE id = auth.uid()
                )
        )
    );
CREATE POLICY "Agents can manage knowledge base files for their organization" ON public.knowledge_base_files FOR ALL USING (
    knowledge_base_id IN (
        SELECT id
        FROM public.knowledge_base kb
        WHERE kb.organization_id IN (
                SELECT organization_id
                FROM public.profiles
                WHERE id = auth.uid()
                    AND role = 'agent'
            )
    )
);
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger for updated_at
CREATE TRIGGER handle_knowledge_base_updated_at BEFORE
UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- Create function to increment article views
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID) RETURNS void AS $$ BEGIN
UPDATE public.knowledge_base
SET views_count = views_count + 1
WHERE id = article_id;
END;
$$ language 'plpgsql';