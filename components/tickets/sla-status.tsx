'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SLAStatusProps {
    firstResponseBreachAt?: Date | null;
    resolutionBreachAt?: Date | null;
    firstResponseTime?: Date | null;
    resolutionTime?: Date | null;
    status: string;
}

export function SLAStatus({
    firstResponseBreachAt,
    resolutionBreachAt,
    firstResponseTime,
    resolutionTime,
    status
}: SLAStatusProps) {
    if (!firstResponseBreachAt && !resolutionBreachAt) {
        return null;
    }

    const now = new Date();
    const isResolved = status === 'closed';

    // First response status
    const hasFirstResponse = !!firstResponseTime;
    const firstResponseBreached = firstResponseBreachAt && !hasFirstResponse && new Date(firstResponseBreachAt) < now;
    const firstResponseRemaining = firstResponseBreachAt && !hasFirstResponse ?
        formatDistanceToNow(new Date(firstResponseBreachAt), { addSuffix: true }) : null;

    // Resolution status
    const isResolutionBreached = resolutionBreachAt && !isResolved && new Date(resolutionBreachAt) < now;
    const resolutionRemaining = resolutionBreachAt && !isResolved ?
        formatDistanceToNow(new Date(resolutionBreachAt), { addSuffix: true }) : null;

    return (
        <div className="flex gap-2">
            {/* First Response SLA */}
            {!hasFirstResponse && firstResponseBreachAt && (
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant={firstResponseBreached ? "destructive" : "outline"} className="gap-1">
                            {firstResponseBreached ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            First Response {firstResponseRemaining}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>First response {firstResponseBreached ? 'breached' : 'due'} {firstResponseRemaining}</p>
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Resolution SLA */}
            {!isResolved && resolutionBreachAt && (
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant={isResolutionBreached ? "destructive" : "outline"} className="gap-1">
                            {isResolutionBreached ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            Resolution {resolutionRemaining}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Resolution {isResolutionBreached ? 'breached' : 'due'} {resolutionRemaining}</p>
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Completed SLAs */}
            {hasFirstResponse && (
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            First Response Met
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>First response completed {formatDistanceToNow(new Date(firstResponseTime), { addSuffix: true })}</p>
                    </TooltipContent>
                </Tooltip>
            )}

            {isResolved && (
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolution Met
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Resolved {formatDistanceToNow(new Date(resolutionTime), { addSuffix: true })}</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
} 