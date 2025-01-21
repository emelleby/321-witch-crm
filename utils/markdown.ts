import TurndownService from 'turndown'

// Initialize turndown service with custom options
export const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    bulletListMarker: '-',
    strongDelimiter: '**'
})

// Add custom rules for handling tables and code blocks
turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function (content, node) {
        return cell(content, node)
    }
})

turndownService.addRule('table', {
    filter: 'table',
    replacement: function (content) {
        return '\n\n' + content + '\n\n'
    }
})

turndownService.addRule('codeBlock', {
    filter: function (node) {
        return (
            node.nodeName === 'PRE' &&
            node.firstChild &&
            node.firstChild.nodeName === 'CODE'
        )
    },
    replacement: function (content) {
        return '\n```\n' + content + '\n```\n'
    }
})

// Helper function for table cells
function cell(content: string, node: Node) {
    const index = (node as HTMLElement).parentElement?.children
        ? Array.prototype.indexOf.call((node as HTMLElement).parentElement?.children, node)
        : 0
    const prefix = index === 0 ? '| ' : ' '
    const suffix = ' |'
    return prefix + content + suffix
} 