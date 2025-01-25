'use client'

import { $generateHtmlFromNodes } from '@lexical/html'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

interface OnChangePluginProps {
    onChange?: (html: string) => void
}

export function OnChangePlugin({ onChange }: OnChangePluginProps) {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const html = $generateHtmlFromNodes(editor)
                onChange?.(html)
            })
        })
    }, [editor, onChange])

    return null
} 