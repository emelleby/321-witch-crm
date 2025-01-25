'use client'

import { $createCodeNode , registerCodeHighlighting } from '@lexical/code'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $setBlocksType } from '@lexical/selection'
import { $getSelection, $isRangeSelection } from 'lexical'
import { Code2 } from 'lucide-react'
import { useCallback, useEffect } from 'react'

import { Button } from '@/components/ui/button'

export function CodePlugin() {
    const [editor] = useLexicalComposerContext()

    // Register code highlighting when the plugin is mounted
    useEffect(() => {
        registerCodeHighlighting(editor)
    }, [editor])

    const formatCode = useCallback(() => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createCodeNode())
            }
        })
    }, [editor])

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={formatCode}
            title="Code Block"
        >
            <Code2 className="h-4 w-4" />
        </Button>
    )
} 