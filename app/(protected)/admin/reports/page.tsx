'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { notifications } from "@/utils/notifications"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type TimeRange = '7d' | '30d' | '90d'
type MetricType = 'tickets' | 'response_time' | 'resolution_time'

export default function ReportsPage() {
    const supabase = createClient()
    const [timeRange, setTimeRange] = useState<TimeRange>('7d')
    const [metricType, setMetricType] = useState<MetricType>('tickets')
    const [loading, setLoading] = useState(true)
    const [ticketTrends, setTicketTrends] = useState<any[]>([])
    const [agentPerformance, setAgentPerformance] = useState<any[]>([])
    const [savedReports, setSavedReports] = useState<any[]>([])

    useEffect(() => {
        fetchData()
    }, [timeRange, metricType])

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) return

            // Fetch ticket trends
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - parseInt(timeRange))

            const { data: trends } = await supabase
                .from('tickets')
                .select('created_at, status')
                .eq('organization_id', profile.organization_id)
                .gte('created_at', startDate.toISOString())
                .order('created_at')

            // Process trends data
            const trendsByDay = trends?.reduce((acc: any, ticket: any) => {
                const date = new Date(ticket.created_at).toLocaleDateString()
                if (!acc[date]) {
                    acc[date] = { date, total: 0, open: 0, closed: 0 }
                }
                acc[date].total++
                acc[date][ticket.status]++
                return acc
            }, {}) || {}

            setTicketTrends(Object.values(trendsByDay))

            // Fetch agent performance
            const { data: performance } = await supabase
                .from('agent_performance')
                .select(`
                    *,
                    profiles:agent_id (
                        full_name,
                        email
                    )
                `)
                .eq('organization_id', profile.organization_id)
                .order('date', { ascending: false })
                .limit(10)

            setAgentPerformance(performance || [])

            // Fetch saved reports
            const { data: reports } = await supabase
                .from('saved_reports')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false })

            setSavedReports(reports || [])
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to load reports data')
        } finally {
            setLoading(false)
        }
    }

    const saveReport = async (name: string, description: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) return

            await supabase.from('saved_reports').insert({
                name,
                description,
                organization_id: profile.organization_id,
                created_by: user.id,
                query: {
                    timeRange,
                    metricType
                }
            })

            notifications.success('Report saved successfully')
            fetchData()
        } catch (error) {
            console.error('Error:', error)
            notifications.error('Failed to save report')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground">
                    View detailed analytics and create custom reports
                </p>
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="agent-performance">Agent Performance</TabsTrigger>
                    <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Select
                            value={timeRange}
                            onValueChange={(value) => setTimeRange(value as TimeRange)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="90d">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={metricType}
                            onValueChange={(value) => setMetricType(value as MetricType)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select metric" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tickets">Tickets</SelectItem>
                                <SelectItem value="response_time">Response Time</SelectItem>
                                <SelectItem value="resolution_time">Resolution Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ticket Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={ticketTrends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                                        <Line type="monotone" dataKey="open" stroke="#82ca9d" name="Open" />
                                        <Line type="monotone" dataKey="closed" stroke="#ffc658" name="Closed" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="agent-performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={agentPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="profiles.full_name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="tickets_resolved" fill="#8884d8" name="Tickets Resolved" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="custom-reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Saved Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {savedReports.map((report) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div>
                                            <h3 className="font-medium">{report.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {report.description}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setTimeRange(report.query.timeRange)
                                                setMetricType(report.query.metricType)
                                            }}
                                        >
                                            Load Report
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Save Current View</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    const formData = new FormData(e.currentTarget)
                                    saveReport(
                                        formData.get('name') as string,
                                        formData.get('description') as string
                                    )
                                }}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="name">Report Name</Label>
                                    <Input id="name" name="name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input id="description" name="description" />
                                </div>
                                <Button type="submit">Save Report</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
} 