import * as React from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ChevronLeftIcon, ChevronRightIcon, Search } from "lucide-react";
import { z } from "zod";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LIMIT = 10;

const customerSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  filter: z.string().trim().optional(),
});

export const getCustomers = createServerFn({ method: "GET" })
  .inputValidator(customerSearchSchema)
  .handler(async ({ data, context: { repository } }) => {
    const { page, filter } = data;
    const offset = (page - 1) * LIMIT;
    const result = await repository.getCustomers({
      limit: LIMIT,
      offset,
      searchValue: filter && filter !== "" ? filter : undefined,
    });
    const pageCount = Math.max(1, Math.ceil(result.count / LIMIT));
    return {
      customers: result.customers,
      page,
      pageCount,
      filter,
    };
  });

export const Route = createFileRoute("/admin/customers")({
  validateSearch: customerSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page, filter: search.filter }),
  loader: async ({ deps }) => {
    const result = await getCustomers({ data: deps });
    if (deps.page > result.pageCount) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: "/admin/customers",
        search: { page: result.pageCount, filter: deps.filter },
      });
    }
    return result;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const data = Route.useLoaderData();
  const search = Route.useSearch();

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const filter = formData.get("filter");
    if (typeof filter === "string") {
      void router.navigate({
        to: "/admin/customers",
        search: { filter, page: 1 },
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm">
          Manage your customers and subscriptions.
        </p>
      </header>

      <form onSubmit={handleFilterSubmit}>
        <InputGroup>
          <InputGroupInput
            name="filter"
            defaultValue={search.filter ?? ""}
            placeholder="Filter by email..."
            aria-label="Filter by email"
          />
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
        </InputGroup>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">Id</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Stripe Customer ID</TableHead>
            <TableHead>Stripe Subscription ID</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.id}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>
                {customer.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${customer.stripeCustomerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {customer.stripeCustomerId}
                  </a>
                ) : (
                  ""
                )}
              </TableCell>
              <TableCell>
                {customer.subscription?.stripeSubscriptionId ? (
                  <a
                    href={`https://dashboard.stripe.com/subscriptions/${customer.subscription.stripeSubscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {customer.subscription.stripeSubscriptionId}
                  </a>
                ) : (
                  ""
                )}
              </TableCell>
              <TableCell>{customer.subscription?.plan ?? ""}</TableCell>
              <TableCell>{customer.subscription?.status ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            {data.page > 1 ? (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    void router.navigate({
                      to: "/admin/customers",
                      search: {
                        page: data.page - 1,
                        filter: search.filter,
                      },
                    });
                  }}
                />
              </PaginationItem>
            ) : (
              <PaginationItem>
                <span className="text-muted-foreground inline-flex h-9 items-center px-4 py-2">
                  <ChevronLeftIcon className="mr-1 size-4" />
                  <span className="hidden sm:inline">Previous</span>
                </span>
              </PaginationItem>
            )}
            {Array.from({ length: data.pageCount }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => {
                      void router.navigate({
                        to: "/admin/customers",
                        search: { page, filter: search.filter },
                      });
                    }}
                    isActive={page === data.page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {data.page < data.pageCount ? (
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    void router.navigate({
                      to: "/admin/customers",
                      search: {
                        page: data.page + 1,
                        filter: search.filter,
                      },
                    });
                  }}
                />
              </PaginationItem>
            ) : (
              <PaginationItem>
                <span className="text-muted-foreground inline-flex h-9 items-center px-4 py-2">
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="ml-1 size-4" />
                </span>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
