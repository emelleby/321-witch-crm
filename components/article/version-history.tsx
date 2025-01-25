"use client";

import { diffChars } from "diff";
import { ArrowLeftRight, History, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface Version {
  id: string;
  version_number: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  file_ids: string[];
  created_at: string;
  created_by: string;
  change_summary: string;
  user_name?: string;
}

interface VersionHistoryProps {
  articleId: string;
  currentTitle: string;
  currentContent: string;
  currentCategory: string;
  currentTags: string[];
  currentFileIds: string[];
  onRestore: (version: Version) => void;
}

export function VersionHistory({
  articleId,
  currentTitle,
  currentContent,
  currentCategory,
  currentTags,
  currentFileIds,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const { toast } = useToast();

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      // Fetch versions with user names
      const { data: versionsData, error } = await supabase
        .from("article_versions")
        .select(
          `
                    *,
                    user_name:created_by(
                        full_name
                    )
                `
        )
        .eq("article_id", articleId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      setVersions(
        versionsData.map((version) => ({
          ...version,
          user_name: version.user_name?.full_name || "Unknown User",
        }))
      );
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (version: Version) => {
    setSelectedVersion(version);
    setShowCompare(true);

    // Compare with current content if no other version is selected
    if (!compareVersion) {
      setCompareVersion({
        version_number: versions.length + 1,
        title: currentTitle,
        content: currentContent,
        category: currentCategory,
        tags: currentTags,
        file_ids: currentFileIds,
        created_at: new Date().toISOString(),
        change_summary: "Current version",
        user_name: "Current",
      } as Version);
    }
  };

  const renderDiff = (oldText: string, newText: string) => {
    const differences = diffChars(oldText, newText);

    return differences.map((part, index) => {
      const color = part.added
        ? "bg-green-100 dark:bg-green-900/30"
        : part.removed
        ? "bg-red-100 dark:bg-red-900/30"
        : "";

      return (
        <span key={index} className={color}>
          {part.value}
        </span>
      );
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchVersions}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and manage article versions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>v{version.version_number}</TableCell>
                    <TableCell>{version.user_name}</TableCell>
                    <TableCell>
                      {new Date(version.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{version.change_summary}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCompare(version)}
                          title="Compare"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Restore this version"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Restore Version {version.version_number}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revert the article to this version. A
                                new version will be created to track this
                                change.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onRestore(version)}
                              >
                                Restore
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {showCompare && selectedVersion && compareVersion && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Comparing v{selectedVersion.version_number} with{" "}
                    {compareVersion.version_number > versions.length
                      ? "current version"
                      : `v${compareVersion.version_number}`}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCompare(false);
                      setSelectedVersion(null);
                      setCompareVersion(null);
                    }}
                  >
                    Close Comparison
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Title</h4>
                    <div className="p-2 bg-muted rounded-md">
                      {renderDiff(selectedVersion.title, compareVersion.title)}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Content</h4>
                    <div className="p-2 bg-muted rounded-md max-h-[300px] overflow-y-auto">
                      {renderDiff(
                        selectedVersion.content,
                        compareVersion.content
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Category</h4>
                      <div className="p-2 bg-muted rounded-md">
                        {renderDiff(
                          selectedVersion.category,
                          compareVersion.category
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="p-2 bg-muted rounded-md">
                        {renderDiff(
                          selectedVersion.tags.join(", "),
                          compareVersion.tags.join(", ")
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
