'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { notifications } from '@/utils/notifications'
import { ThumbsUp, ThumbsDown, MessageSquare, Lock } from 'lucide-react'
import { RichTextEditor } from '@/components/editor'

interface Topic {
    id: string
    title: string
    content: string
    category_id: string
    created_by: string
    is_pinned: boolean
    is_locked: boolean
    views_count: number
    replies_count: number
    upvotes: number
    downvotes: number
    created_at: string
    tags: string[]
    user_name?: string
    category_name?: string
    user_vote?: 'up' | 'down' | null
}

interface Reply {
    id: string
    content: string
    created_by: string
    created_at: string
    upvotes: number
    downvotes: number
    is_solution: boolean
    user_name?: string
    user_vote?: 'up' | 'down' | null
}

export default function TopicDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [topic, setTopic] = useState<Topic | null>(null)
    const [replies, setReplies] = useState<Reply[]>([])
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [newReply, setNewReply] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        checkAuth()
        fetchTopic()
        fetchReplies()
        incrementViews()

        // Set up real-time subscription for new replies
        const supabase = createClient()
        const channel = supabase
            .channel('reply_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'forum_replies',
                    filter: \`topic_id=eq.\${params.id}\`
                },
                () => {
                    fetchReplies()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const checkAuth = async () => {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)
    }

    const incrementViews = async () => {
        try {
            const supabase = createClient()
            await supabase.rpc('increment_topic_views', { topic_id: params.id })
        } catch (error) {
            console.error('Error incrementing views:', error)
        }
    }

    const fetchTopic = async () => {
        try {
            const supabase = createClient()
            const { data: topic, error } = await supabase
                .from('forum_topics')
                .select(\`
                    *,
                    user_name:created_by(full_name),
                    category_name:category_id(name)
                \`)
                .eq('id', params.id)
                .single()

            if (error) throw error

            // Get user's vote if authenticated
            if (isAuthenticated) {
                const { data: vote } = await supabase
                    .from('topic_votes')
                    .select('vote_type')
                    .eq('topic_id', params.id)
                    .single()

                topic.user_vote = vote?.vote_type || null
            }

            setTopic({
                ...topic,
                user_name: topic.user_name?.full_name || 'Unknown User',
                category_name: topic.category_name?.name || 'Uncategorized'
            })
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load topic')
        } finally {
            setLoading(false)
        }
    }

    const fetchReplies = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('forum_replies')
                .select(\`
                    *,
                    user_name:created_by(full_name)
                \`)
                .eq('topic_id', params.id)
                .order('created_at')

            if (error) throw error

            // Get user's votes if authenticated
            if (isAuthenticated) {
                const { data: votes } = await supabase
                    .from('reply_votes')
                    .select('reply_id, vote_type')
                    .in('reply_id', data.map(reply => reply.id))

                const voteMap = new Map(votes?.map(v => [v.reply_id, v.vote_type]))
                data.forEach(reply => {
                    reply.user_vote = voteMap.get(reply.id) || null
                })
            }

            setReplies(data.map(reply => ({
                ...reply,
                user_name: reply.user_name?.full_name || 'Unknown User'
            })))
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load replies')
        }
    }

    const handleVote = async (type: 'up' | 'down', id: string, target: 'topic' | 'reply') => {
        if (!isAuthenticated) {
            router.push('/login')
            return
        }

        try {
            const supabase = createClient()
            const table = target === 'topic' ? 'topic_votes' : 'reply_votes'
            const idField = target === 'topic' ? 'topic_id' : 'reply_id'

            // Check if user has already voted
            const { data: existingVote } = await supabase
                .from(table)
                .select('vote_type')
                .eq(idField, id)
                .single()

            if (existingVote?.vote_type === type) {
                // Remove vote if clicking the same button
                await supabase
                    .from(table)
                    .delete()
                    .eq(idField, id)
            } else {
                // Upsert vote
                await supabase
                    .from(table)
                    .upsert({
                        [idField]: id,
                        vote_type: type
                    })
            }

            if (target === 'topic') {
                fetchTopic()
            } else {
                fetchReplies()
            }
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to register vote')
        }
    }

    const handleSubmitReply = async () => {
        if (!isAuthenticated) {
            router.push('/login')
            return
        }

        if (!newReply.trim()) {
            notifications.error('Please enter a reply')
            return
        }

        setSubmitting(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('forum_replies')
                .insert({
                    content: newReply.trim(),
                    topic_id: params.id
                })

            if (error) throw error

            setNewReply('')
            notifications.success('Reply posted successfully')
            await fetchReplies()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to post reply')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!topic) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h1 className="text-2xl font-bold mb-4">Topic not found</h1>
                <Button onClick={() => router.push('/forums')}>Go Back</Button>
            </div>
        )
    }

    return (
        <div className="container py-8 space-y-6">
            <Button
                variant="outline"
                onClick={() => router.push('/forums')}
            >
                Back to Forums
            </Button>

            <Card className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {topic.title}
                            {topic.is_locked && (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                        </h1>
                        <p className="text-muted-foreground">
                            {topic.category_name} • Posted by {topic.user_name} •{' '}
                            {new Date(topic.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={topic.user_vote === 'up' ? 'text-green-500' : ''}
                            onClick={() => handleVote('up', topic.id, 'topic')}
                            disabled={!isAuthenticated}
                        >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {topic.upvotes}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={topic.user_vote === 'down' ? 'text-red-500' : ''}
                            onClick={() => handleVote('down', topic.id, 'topic')}
                            disabled={!isAuthenticated}
                        >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            {topic.downvotes}
                        </Button>
                    </div>
                </div>

                <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: topic.content }}
                />

                {topic.tags && topic.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-4">
                        {topic.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </Card>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Replies ({replies.length})
                </h2>

                {!topic.is_locked && isAuthenticated && (
                    <Card className="p-6 space-y-4">
                        <RichTextEditor
                            content={newReply}
                            onChange={setNewReply}
                            placeholder="Write your reply..."
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSubmitReply}
                                disabled={submitting}
                            >
                                {submitting ? 'Posting...' : 'Post Reply'}
                            </Button>
                        </div>
                    </Card>
                )}

                {topic.is_locked && (
                    <Card className="p-4 bg-muted">
                        <p className="text-center text-muted-foreground">
                            This topic is locked. New replies are not allowed.
                        </p>
                    </Card>
                )}

                {!isAuthenticated && !topic.is_locked && (
                    <Card className="p-4 bg-muted">
                        <p className="text-center text-muted-foreground">
                            Please{' '}
                            <Button
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() => router.push('/login')}
                            >
                                sign in
                            </Button>
                            {' '}to join the discussion.
                        </p>
                    </Card>
                )}

                <div className="space-y-4">
                    {replies.map((reply) => (
                        <Card key={reply.id} className="p-6 space-y-4">
                            <div className="flex items-start justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {reply.user_name} •{' '}
                                    {new Date(reply.created_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={reply.user_vote === 'up' ? 'text-green-500' : ''}
                                        onClick={() => handleVote('up', reply.id, 'reply')}
                                        disabled={!isAuthenticated}
                                    >
                                        <ThumbsUp className="h-4 w-4 mr-1" />
                                        {reply.upvotes}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={reply.user_vote === 'down' ? 'text-red-500' : ''}
                                        onClick={() => handleVote('down', reply.id, 'reply')}
                                        disabled={!isAuthenticated}
                                    >
                                        <ThumbsDown className="h-4 w-4 mr-1" />
                                        {reply.downvotes}
                                    </Button>
                                </div>
                            </div>

                            <div
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: reply.content }}
                            />
                        </Card>
                    ))}

                    {replies.length === 0 && (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold">No replies yet</h3>
                            <p className="text-muted-foreground">
                                Be the first to reply to this discussion!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 