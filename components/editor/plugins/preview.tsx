'use client'

import { useCallback, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $generateHtmlFromNodes } from '@lexical/html'
import { Button } from '@/components/ui/button'
import { Eye, X } from 'lucide-react'
import DOMPurify from 'dompurify'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog'

export function PreviewPlugin() {
    const [editor] = useLexicalComposerContext()
    const [showPreview, setShowPreview] = useState(false)
    const [previewContent, setPreviewContent] = useState('')

    const togglePreview = useCallback(() => {
        editor.getEditorState().read(() => {
            const html = $generateHtmlFromNodes(editor)
            // First clean editor-specific classes
            const cleanHtml = html.replace(/class="[^"]*"/g, '')
            // Then sanitize the HTML
            const sanitizedHtml = DOMPurify.sanitize(cleanHtml, {
                ALLOWED_TAGS: [
                    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3',
                    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'img', 'a'
                ],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
            })
            setPreviewContent(sanitizedHtml)
        })
        setShowPreview(!showPreview)
    }, [editor])

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={togglePreview}
                title="Preview"
            >
                <Eye className="h-4 w-4" />
            </Button>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle>Content Preview</DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="bg-background rounded-md p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: previewContent }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
} 