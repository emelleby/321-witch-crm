"use client";

import { Filter, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Database } from "@/database.types";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface SearchFilters {
  query: string;
  status:
    | Database["public"]["Tables"]["support_tickets"]["Row"]["ticket_status"]
    | "";
  priority:
    | Database["public"]["Tables"]["support_tickets"]["Row"]["ticket_priority"]
    | "";
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
  onSearch,
}: AdvancedSearchProps) {
  const supabase = createBrowserSupabaseClient();
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<
    { user_id: string; display_name: string }[]
  >([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    status: "",
    priority: "",
    organizationId: "",
    assignedTo: "",
    useVectorSearch: false,
  });

  const fetchData = useCallback(async () => {
    try {
      const [agentsResponse, orgsResponse] = await Promise.all([
        showAssigneeFilter
          ? supabase
              .from("user_profiles")
              .select("user_id, display_name")
              .eq("user_role", "agent")
          : null,
        showOrganizationFilter
          ? supabase
              .from("organizations")
              .select("*")
              .order("organization_name")
          : null,
      ]);

      if (agentsResponse?.error) throw agentsResponse.error;
      if (orgsResponse?.error) throw orgsResponse.error;

      if (agentsResponse) setAgents(agentsResponse.data);
      if (orgsResponse) setOrganizations(orgsResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [
    showAssigneeFilter,
    showOrganizationFilter,
    supabase,
    setAgents,
    setOrganizations,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: "",
      status: "",
      priority: "",
      organizationId: "",
      assignedTo: "",
      useVectorSearch: false,
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
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
            if (e.key === "Enter") {
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
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, useVectorSearch: checked })
                }
              />
              <Label htmlFor="vector-search">
                Use AI-powered semantic search
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: SearchFilters["status"]) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting_on_customer">
                    Waiting on Customer
                  </SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value: SearchFilters["priority"]) =>
                  setFilters({ ...filters, priority: value })
                }
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

            {showOrganizationFilter && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={filters.organizationId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, organizationId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem
                        key={org.organization_id}
                        value={org.organization_id}
                      >
                        {org.organization_name}
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
                  onValueChange={(value) =>
                    setFilters({ ...filters, assignedTo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.display_name}
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
              <Button
                onClick={() => {
                  handleSearch();
                  setIsOpen(false);
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
