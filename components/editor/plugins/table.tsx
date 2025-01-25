'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
    INSERT_TABLE_COMMAND,
} from '@lexical/table'
import { Table } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export function TablePlugin() {
    const [editor] = useLexicalComposerContext()
    const [rows, setRows] = useState('3')
    const [cols, setCols] = useState('3')

    const insertTable = useCallback(() => {
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            rows: parseInt(rows, 10),
            columns: parseInt(cols, 10),
        })
    }, [editor, rows, cols])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Insert Table"
                >
                    <Table className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52">
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="rows">Rows</Label>
                            <Input
                                id="rows"
                                value={rows}
                                onChange={(e) => setRows(e.target.value)}
                                className="h-8"
                                type="number"
                                min="1"
                                max="10"
                            />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="cols">Columns</Label>
                            <Input
                                id="cols"
                                value={cols}
                                onChange={(e) => setCols(e.target.value)}
                                className="h-8"
                                type="number"
                                min="1"
                                max="10"
                            />
                        </div>
                    </div>
                    <Button onClick={insertTable} size="sm">
                        Insert Table
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
} 