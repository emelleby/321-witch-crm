'use client'

import { useCallback, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $generateHtmlFromNodes } from '@lexical/html'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

export function PreviewPlugin() {
    const [editor] = useLexicalComposerContext()
    const [showPreview, setShowPreview] = useState(false)
    const [previewContent, setPreviewContent] = useState('')

    const togglePreview = useCallback(() => {
        if (!showPreview) {
            editor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(editor)
                setPreviewContent(html)
            })
        }
        setShowPreview(!showPreview)
    }, [editor, showPreview])

    if (showPreview) {
        return (
            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4"
                    onClick={togglePreview}
                    title="Exit Preview"
                >
                    <EyeOff className="h-4 w-4" />
                </Button>
                <div
                    className="prose prose-sm dark:prose-invert max-w-none p-4"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                />
            </div>
        )
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={togglePreview}
            title="Preview"
        >
            <Eye className="h-4 w-4" />
        </Button>
    )
} 