'use client'

import { useCallback, useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createCodeNode } from '@lexical/code'
import { $getSelection, $isRangeSelection } from 'lexical'
import { CodeHighlightPlugin } from '@lexical/react/LexicalCodeHighlightPlugin'
import { $setBlocksType } from '@lexical/selection'
import { Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CodePlugin() {
    const [editor] = useLexicalComposerContext()

    const formatCode = useCallback(() => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createCodeNode())
            }
        })
    }, [editor])

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={formatCode}
                title="Code Block"
            >
                <Code2 className="h-4 w-4" />
            </Button>
            <CodeHighlightPlugin />
        </>
    )
} 