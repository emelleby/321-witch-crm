-- Create article_versions table
CREATE TABLE article_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT [] DEFAULT '{}',
    file_ids UUID [] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    change_summary TEXT
);
-- Add RLS policies for article_versions
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
-- Allow users to view article versions if they can view the article
CREATE POLICY "Users can view article versions if they can view the article" ON article_versions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM knowledge_base kb
                LEFT JOIN profiles p ON p.organization_id = kb.organization_id
            WHERE kb.id = article_versions.article_id
                AND p.id = auth.uid()
        )
    );
-- Allow agents/admins to create article versions
CREATE POLICY "Agents can create article versions" ON article_versions FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role IN ('agent', 'admin')
        )
    );
-- Function to get the next version number for an article
CREATE OR REPLACE FUNCTION get_next_version_number(article_id UUID) RETURNS INTEGER AS $$
DECLARE next_version INTEGER;
BEGIN
SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
FROM article_versions
WHERE article_versions.article_id = $1;
RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to create an article version
CREATE OR REPLACE FUNCTION create_article_version() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO article_versions (
        article_id,
        title,
        content,
        category,
        tags,
        file_ids,
        created_by,
        version_number,
        change_summary
    )
VALUES (
        NEW.id,
        NEW.title,
        NEW.content,
        NEW.category,
        NEW.tags,
        NEW.file_ids,
        auth.uid(),
        get_next_version_number(NEW.id),
        'Initial version'
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to create initial version when article is created
CREATE TRIGGER create_initial_article_version
AFTER
INSERT ON knowledge_base FOR EACH ROW EXECUTE FUNCTION create_article_version();
-- Function to create a version when article is updated
CREATE OR REPLACE FUNCTION create_article_version_on_update() RETURNS TRIGGER AS $$ BEGIN IF OLD.title != NEW.title
    OR OLD.content != NEW.content
    OR OLD.category != NEW.category
    OR OLD.tags != NEW.tags
    OR OLD.file_ids != NEW.file_ids THEN
INSERT INTO article_versions (
        article_id,
        title,
        content,
        category,
        tags,
        file_ids,
        created_by,
        version_number,
        change_summary
    )
VALUES (
        NEW.id,
        NEW.title,
        NEW.content,
        NEW.category,
        NEW.tags,
        NEW.file_ids,
        auth.uid(),
        get_next_version_number(NEW.id),
        CASE
            WHEN OLD.title != NEW.title THEN 'Updated title'
            WHEN OLD.content != NEW.content THEN 'Updated content'
            WHEN OLD.category != NEW.category THEN 'Updated category'
            WHEN OLD.tags != NEW.tags THEN 'Updated tags'
            WHEN OLD.file_ids != NEW.file_ids THEN 'Updated attachments'
            ELSE 'Updated article'
        END
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to create version when article is updated
CREATE TRIGGER create_article_version_on_update
AFTER
UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION create_article_version_on_update();