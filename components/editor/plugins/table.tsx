'use client'

import { useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { TablePlugin as LexicalTablePlugin } from '@lexical/react/LexicalTablePlugin'
import { Table } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TablePlugin() {
    const [editor] = useLexicalComposerContext()

    const insertTable = useCallback(() => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: '3',
            rows: '3',
            includeHeaders: true,
        })
    }, [editor])

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={insertTable}
                title="Insert Table"
            >
                <Table className="h-4 w-4" />
            </Button>
            <LexicalTablePlugin />
        </>
    )
} 