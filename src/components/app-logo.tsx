import { cn } from "@/lib/utils";

export function AppLogo({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("text-xl font-extrabold", className)} {...props}>
      TCS
    </span>
  );
}
