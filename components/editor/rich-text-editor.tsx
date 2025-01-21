'use client'

import { useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { ToolbarPlugin } from './plugins/toolbar'
import { OnChangePlugin } from './plugins/on-change'
import { cn } from '@/lib/utils'
import { ImageNode } from './nodes/image-node'

const theme = {
    // Theme styling goes here
    paragraph: 'my-2',
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        underlineStrikethrough: 'underline line-through',
    },
    list: {
        nested: {
            listitem: 'list-none',
        },
        ol: 'list-decimal pl-5 my-2',
        ul: 'list-disc pl-5 my-2',
        listitem: 'my-1',
    },
    heading: {
        h1: 'text-3xl font-bold my-4',
        h2: 'text-2xl font-bold my-3',
        h3: 'text-xl font-bold my-2',
    },
}

const editorConfig = {
    namespace: 'ZendeskCloneEditor',
    theme,
    onError(error: Error) {
        console.error('Editor Error:', error)
    },
    nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        AutoLinkNode,
        LinkNode,
        ImageNode,
    ],
}

interface RichTextEditorProps {
    onChange?: (html: string) => void
    initialContent?: string
    className?: string
    placeholder?: string
}

export function RichTextEditor({
    onChange,
    initialContent = '',
    className,
    placeholder = 'Start writing...',
}: RichTextEditorProps) {
    const initialConfig = {
        ...editorConfig,
        editorState: () => {
            const parser = new DOMParser()
            const dom = parser.parseFromString(initialContent, 'text/html')
            return () => {
                const nodes = $generateNodesFromDOM(dom)
                return nodes
            }
        },
    }

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={cn('border rounded-md', className)}>
                <ToolbarPlugin />
                <div className="relative min-h-[200px] px-4">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable className="min-h-[200px] outline-none py-4" />
                        }
                        placeholder={
                            <div className="absolute top-[17px] left-[20px] text-muted-foreground pointer-events-none">
                                {placeholder}
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                    <OnChangePlugin onChange={onChange} />
                </div>
            </div>
        </LexicalComposer>
    )
} 