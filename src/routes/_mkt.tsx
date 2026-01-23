import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { siGithub } from "simple-icons";
import { AppLogo } from "@/components/app-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOutServerFn } from "@/lib/auth-service";

const beforeLoadServerFn = createServerFn().handler(
  ({ context: { session } }) => {
    return {
      sessionUser: session?.user,
    };
  },
);

export const Route = createFileRoute("/_mkt")({
  beforeLoad: async () => {
    return await beforeLoadServerFn();
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      data-wrapper=""
      className="container mx-auto flex flex-1 flex-col px-6 sm:px-12"
    >
      <Header />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const { sessionUser } = Route.useRouteContext();
  const signOutFn = useServerFn(signOutServerFn);
  return (
    <header className="bg-background/95 sticky top-0 z-10 w-full backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-2">
        <div className="flex items-center gap-12">
          <a href="/" className="flex items-center gap-1">
            <AppLogo />
            <span className="bg-primary relative top-1 size-1.5" />
          </a>
          <div className="hidden items-center gap-6 md:flex">
            <Link
              to="/pricing"
              className="data-hovered:text-primary text-muted-foreground font-medium"
            >
              Pricing
            </Link>
            <a
              href="https://github.com/mw10013/tanstack-cloudflare-saas"
              target="_blank"
              rel="noopener noreferrer"
              className="data-hovered:text-primary text-muted-foreground font-medium"
            >
              Documentation
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <GitHubRepoLink />
            <Separator orientation="vertical" className="mx-1 h-6 min-h-6" />
            {sessionUser ? (
              <Button variant="outline" onClick={() => void signOutFn()}>
                Sign Out
              </Button>
            ) : (
              <Button variant="default" size="sm" render={<Link to="/login" />}>
                Sign in / Sign up
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function GitHubRepoLink({ className }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      className={className}
      aria-label="GitHub repo"
      render={
        <a
          href="https://github.com/mw10013/tanstack-cloudflare-saas"
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d={siGithub.path} />
      </svg>
    </Button>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-12">
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <div className="max-w-md space-y-4 md:col-span-2 lg:col-span-4">
          <a href="/" className="flex items-center gap-1">
            <AppLogo />
            <span className="bg-primary relative top-1 size-1.5" />
          </a>
          <p className="text-muted-foreground text-sm">
            Build and deploy serverless TanStack Start applications on
            Cloudflare.
          </p>
          <div className="flex gap-4">
            <GitHubRepoLink className="h-auto! p-0! opacity-60 hover:opacity-100" />
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-bold">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://tanstack.com/"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                TanStack
              </a>
            </li>
            <li>
              <a
                href="https://developers.cloudflare.com/"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare
              </a>
            </li>
            <li>
              <a
                href="https://www.better-auth.com/"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Better-Auth
              </a>
            </li>
            <li>
              <a
                href="https://ui.shadcn.com"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Shadcn Components
              </a>
            </li>
            <li>
              <a
                href="https://base-ui.com/"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Base UI
              </a>
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-sm font-bold">Support</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/mw10013/tanstack-cloudflare-saas"
                className="text-muted-foreground data-hovered:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-border/40 flex flex-col items-center justify-between gap-4 border-t border-dashed pt-8 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          © 2025 TCS. Built with ♥ by{" "}
          <a
            href="https://github.com/mw10013"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground text-muted-foreground font-medium transition-all"
          >
            @mw10013
          </a>
        </p>
      </div>
    </footer>
  );
}
