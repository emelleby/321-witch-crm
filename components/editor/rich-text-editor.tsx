'use client'

import { useCallback, useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import {
    TRANSFORMERS,
    $convertFromMarkdownString,
    $convertToMarkdownString,
    ElementTransformer,
    TextMatchTransformer,
} from '@lexical/markdown'
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
import { ImageNode, $createImageNode } from './nodes/image-node'
import { LexicalEditor, LexicalNode } from 'lexical'
import { TablePlugin as LexicalTablePlugin } from '@lexical/react/LexicalTablePlugin'

const theme = {
    // Theme styling goes here
    paragraph: 'm-0 p-0',
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
    minHeight?: string
    maxHeight?: string
}

// Extended markdown transformers
const imageTransformer: TextMatchTransformer = {
    dependencies: [ImageNode],
    export: (node: LexicalNode) => {
        if (node instanceof ImageNode) {
            return `![${node.__altText}](${node.__src})`
        }
        return null
    },
    regExp: /!\[(.*?)\]\((.*?)\)/,
    replace: (textNode, match) => {
        const [, alt, src] = match
        const imageNode = $createImageNode({ src, altText: alt })
        textNode.replace(imageNode)
    },
    trigger: ')',
    type: 'text-match',
}

const EXTENDED_TRANSFORMERS = [...TRANSFORMERS, imageTransformer]

export function RichTextEditor({
    onChange,
    initialContent = '',
    className,
    placeholder = 'Start writing...',
    minHeight = '200px',
    maxHeight = '600px',
}: RichTextEditorProps) {
    const initialConfig = {
        ...editorConfig,
        editorState: (editor: LexicalEditor) => {
            // Try to parse as markdown first
            try {
                return () => {
                    $convertFromMarkdownString(initialContent, EXTENDED_TRANSFORMERS)
                }
            } catch {
                // If markdown parsing fails, try HTML
                const parser = new DOMParser()
                const dom = parser.parseFromString(initialContent, 'text/html')
                return () => {
                    const nodes = $generateNodesFromDOM(editor, dom)
                    return nodes
                }
            }
        },
    }

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={cn('border rounded-md', className)}>
                <ToolbarPlugin />
                <div 
                    className="relative"
                    style={{
                        minHeight,
                        maxHeight,
                        resize: 'vertical',
                        overflow: 'auto'
                    }}
                >
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable 
                                className="outline-none px-5 py-[14px] [&_p]:my-0" 
                                style={{
                                    minHeight: `calc(${minHeight} - 2rem)`,
                                    height: '100%',
                                    lineHeight: '1.5'
                                }}
                                aria-required={false}
                                role="textbox"
                            />
                        }
                        placeholder={
                            <div className="absolute top-[14px] left-5 text-muted-foreground pointer-events-none select-none">
                                {placeholder}
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <LexicalTablePlugin />
                    <MarkdownShortcutPlugin transformers={EXTENDED_TRANSFORMERS} />
                    <OnChangePlugin onChange={onChange} />
                </div>
            </div>
        </LexicalComposer>
    )
} 