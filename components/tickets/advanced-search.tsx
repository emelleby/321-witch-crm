'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Category {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
}

interface SearchFilters {
    query: string;
    status: string;
    priority: string;
    categoryIds: string[];
    tagIds: string[];
    dateFrom: Date | null;
    dateTo: Date | null;
    organizationId: string;
    assignedTo: string;
    useVectorSearch: boolean;
}

interface AdvancedSearchProps {
    showAssigneeFilter?: boolean;
    showOrganizationFilter?: boolean;
    onSearch: (filters: SearchFilters) => void;
}

export function AdvancedSearch({
    showAssigneeFilter = false,
    showOrganizationFilter = false,
    onSearch
}: AdvancedSearchProps) {
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
    const [filters, setFilters] = useState<SearchFilters>({
        query: '',
        status: '',
        priority: '',
        categoryIds: [],
        tagIds: [],
        dateFrom: null,
        dateTo: null,
        organizationId: '',
        assignedTo: '',
        useVectorSearch: false
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [categoriesResponse, tagsResponse, agentsResponse, orgsResponse] = await Promise.all([
                supabase.from('ticket_categories').select('id, name').order('name'),
                supabase.from('ticket_tags').select('id, name').order('name'),
                showAssigneeFilter ? supabase.from('profiles').select('id, name').eq('role', 'agent') : null,
                showOrganizationFilter ? supabase.from('organizations').select('id, name').order('name') : null
            ]);

            if (categoriesResponse.error) throw categoriesResponse.error;
            if (tagsResponse.error) throw tagsResponse.error;
            if (agentsResponse?.error) throw agentsResponse.error;
            if (orgsResponse?.error) throw orgsResponse.error;

            setCategories(categoriesResponse.data);
            setTags(tagsResponse.data);
            if (agentsResponse) setAgents(agentsResponse.data);
            if (orgsResponse) setOrganizations(orgsResponse.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleSearch = () => {
        onSearch(filters);
    };

    const handleReset = () => {
        setFilters({
            query: '',
            status: '',
            priority: '',
            categoryIds: [],
            tagIds: [],
            dateFrom: null,
            dateTo: null,
            organizationId: '',
            assignedTo: '',
            useVectorSearch: false
        });
        onSearch({
            query: '',
            status: '',
            priority: '',
            categoryIds: [],
            tagIds: [],
            dateFrom: null,
            dateTo: null,
            organizationId: '',
            assignedTo: '',
            useVectorSearch: false
        });
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.status) count++;
        if (filters.priority) count++;
        if (filters.categoryIds.length > 0) count++;
        if (filters.tagIds.length > 0) count++;
        if (filters.dateFrom || filters.dateTo) count++;
        if (filters.organizationId) count++;
        if (filters.assignedTo) count++;
        if (filters.useVectorSearch) count++;
        return count;
    };

    return (
        <div className="flex gap-2 items-center">
            <div className="flex-1">
                <Input
                    placeholder="Search tickets..."
                    value={filters.query}
                    onChange={(e) => {
                        setFilters({ ...filters, query: e.target.value });
                        if (!e.target.value) {
                            handleSearch();
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch();
                        }
                    }}
                />
            </div>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        {getActiveFiltersCount() > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {getActiveFiltersCount()}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="vector-search"
                                checked={filters.useVectorSearch}
                                onCheckedChange={(checked) => setFilters({ ...filters, useVectorSearch: checked })}
                            />
                            <Label htmlFor="vector-search">Use AI-powered semantic search</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) => setFilters({ ...filters, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={filters.priority}
                                onValueChange={(value) => setFilters({ ...filters, priority: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Categories</Label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <Badge
                                        key={category.id}
                                        variant={filters.categoryIds.includes(category.id) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setFilters({
                                                ...filters,
                                                categoryIds: filters.categoryIds.includes(category.id)
                                                    ? filters.categoryIds.filter(id => id !== category.id)
                                                    : [...filters.categoryIds, category.id]
                                            });
                                        }}
                                    >
                                        {category.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant={filters.tagIds.includes(tag.id) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setFilters({
                                                ...filters,
                                                tagIds: filters.tagIds.includes(tag.id)
                                                    ? filters.tagIds.filter(id => id !== tag.id)
                                                    : [...filters.tagIds, tag.id]
                                            });
                                        }}
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Date Range</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !filters.dateFrom && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dateFrom ? format(filters.dateFrom, "PPP") : "From"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dateFrom || undefined}
                                            onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !filters.dateTo && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dateTo ? format(filters.dateTo, "PPP") : "To"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dateTo || undefined}
                                            onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {showOrganizationFilter && (
                            <div className="space-y-2">
                                <Label>Organization</Label>
                                <Select
                                    value={filters.organizationId}
                                    onValueChange={(value) => setFilters({ ...filters, organizationId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All</SelectItem>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showAssigneeFilter && (
                            <div className="space-y-2">
                                <Label>Assigned To</Label>
                                <Select
                                    value={filters.assignedTo}
                                    onValueChange={(value) => setFilters({ ...filters, assignedTo: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All</SelectItem>
                                        {agents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={handleReset}>
                                <X className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                            <Button onClick={() => { handleSearch(); setIsOpen(false); }}>
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
} 