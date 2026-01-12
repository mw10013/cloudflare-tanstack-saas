import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
              <FileQuestion className="text-muted-foreground h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Page Not Found
              </h1>
              <div className="text-muted-foreground">
                {children ?? (
                  <p>
                    The page you're looking for doesn't exist or has been moved.
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="default"
                onClick={() => {
                  window.history.back();
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="size-4" />
                Go Back
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <Button variant="outline" className="w-full">
                  <Home className="size-4" />
                  Home
                </Button>
              </Link>
            </div>

            <div className="w-full border-t pt-4">
              <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                <Search className="size-4" />
                <span>Try checking the URL or use search functionality</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
