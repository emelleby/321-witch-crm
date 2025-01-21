'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { notifications } from '@/utils/notifications'
import { Flame, MessageSquare, ThumbsUp } from 'lucide-react'

interface TrendingTopic {
    id: string
    title: string
    upvotes: number
    replies_count: number
    trending_score: number
    user_name?: string
    category_name?: string
}

export function TrendingTopics() {
    const router = useRouter()
    const [topics, setTopics] = useState<TrendingTopic[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrendingTopics()
    }, [])

    const fetchTrendingTopics = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .rpc('get_trending_topics')
                .select(`
                    id,
                    title,
                    upvotes,
                    replies_count,
                    trending_score,
                    user_name:created_by(full_name),
                    category_name:category_id(name)
                `)

            if (error) throw error

            setTopics(data.map(topic => ({
                ...topic,
                user_name: topic.user_name?.full_name || 'Unknown User',
                category_name: topic.category_name?.name || 'Uncategorized'
            })))
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load trending topics')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Trending Discussions
            </h2>
            <div className="space-y-4">
                {topics.map((topic) => (
                    <div
                        key={topic.id}
                        className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg"
                        onClick={() => router.push(`/forums/${topic.id}`)}
                    >
                        <h3 className="font-medium line-clamp-1">{topic.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{topic.category_name}</span>
                            <div className="flex items-center gap-1">
                                <ThumbsUp className="h-4 w-4" />
                                <span>{topic.upvotes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                <span>{topic.replies_count}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {topics.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                        No trending topics yet
                    </p>
                )}
            </div>
        </Card>
    )
} 