'use client'

import { DecoratorNode } from 'lexical'

export class ImageNode extends DecoratorNode<JSX.Element> {
    __src: string
    __altText: string

    static getType(): string {
        return 'image'
    }

    static clone(node: ImageNode): ImageNode {
        return new ImageNode(node.__src, node.__altText, node.__key)
    }

    constructor(src: string, altText: string, key?: string) {
        super(key)
        this.__src = src
        this.__altText = altText
    }

    createDOM(): HTMLElement {
        const div = document.createElement('div')
        div.className = 'relative my-4'
        return div
    }

    updateDOM(): false {
        return false
    }

    decorate(): JSX.Element {
        return (
            <div className="relative my-4">
                <img
                    src={this.__src}
                    alt={this.__altText}
                    className="max-w-full rounded-lg"
                    draggable="false"
                />
            </div>
        )
    }
}

export function $createImageNode({
    src,
    altText,
}: {
    src: string
    altText: string
}): ImageNode {
    return new ImageNode(src, altText)
} 