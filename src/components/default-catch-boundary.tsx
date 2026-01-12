import type { ErrorComponentProps } from "@tanstack/react-router";
import { useState } from "react";
import { Link, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  ChevronDown,
  Home,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });
  const [showDetails, setShowDetails] = useState(false);

  console.error(error);

  const errorMessage = error.message || "An unexpected error occurred";
  const errorStack = error.stack ?? "";
  const hasStack = errorStack.length > 0;

  const handleReportError = () => {
    const subject = encodeURIComponent("Error Report");
    const body = encodeURIComponent(
      `An error occurred in: application:\n\nError: ${errorMessage}\n\nStack Trace:\n${errorStack}\n\nPlease describe what you were doing when this error occurred:`,
    );
    const url = `mailto:support@example.com?subject=${subject}&body=${body}`;
    window.location.href = url;
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <p className="text-muted-foreground text-sm">
                We encountered an unexpected error. Please try again.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="font-medium">
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => {
                void router.invalidate();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="size-4" />
              Try Again
            </Button>

            {isRoot ? (
              <Link to="/" className="flex items-center gap-2">
                <Button variant="outline" className="w-full">
                  <Home className="size-4" />
                  Go to Home
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  window.history.back();
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="size-4" />
                Go Back
              </Button>
            )}
          </div>

          {hasStack && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
                >
                  <Bug className="size-4" />
                  Technical Details
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="mb-2 text-sm font-medium">
                    Error Stack Trace:
                  </h4>
                  <pre className="text-muted-foreground max-h-40 overflow-y-auto text-xs break-words whitespace-pre-wrap">
                    {errorStack}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="border-t pt-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="text-muted-foreground text-sm">
                If this error persists, please report it to our support team.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReportError}
                className="flex items-center gap-2"
              >
                <Mail className="size-4" />
                Report Error
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
