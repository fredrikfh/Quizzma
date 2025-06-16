import "./App.css";
import { Toaster } from "@/components/ui/sonner.tsx";
import {
  createBrowserRouter,
  Link,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import {
  SidebarInset,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb.tsx";
import QuizPage from "@/pages/QuizPage/QuizPage.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import QuizDetailsPage from "@/pages/QuizPage/PreviousQuizDetailsPage.tsx";
import { useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import QuizJoinPage from "@/pages/AudiencePages/JoinPage";
import QuizTeacherPage from "@/pages/QuizPage/LiveQuestionPage.tsx";
import LayoutOrLanding from "@/pages/LayoutOrLanding.tsx";
import AudiencePage from "./pages/AudiencePages/AudiencePage";
import { AudienceLayout } from "./pages/AudiencePages/AudienceLayout";
import QuizReviewPage from "@/pages/QuizPage/QuizReviewPage";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import usePostHogPageView from "@/hooks/usePostHogPageView.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { BadgeCheck, Bell, ChevronsUpDown, LogOut } from "lucide-react";
import useAuth from "@/contexts/useAuth.ts";
import { useIsMobile } from "@/hooks/use-mobile.tsx";
import { cn } from "@/lib/utils.ts";

export function Layout() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const isMobile = useIsMobile();

  const breadcrumbItems = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean); // Remove empty segments
    let path = "";

    return segments.map((segment, index) => {
      path += `/${segment}`;
      return {
        name: segment,
        path,
        isLast: index === segments.length - 1, // Mark the last breadcrumb item
      };
    });
  }, [location.pathname]);

  usePostHogPageView(); // sends page/route changes to PostHog

  return (
    <>
      <SidebarProvider open={false}>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 mb-0 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center w-full gap-2 px-4 justify-between">
              <Breadcrumb
                className={
                  "flex flex-row flex-nowrap overflow-hidden whitespace-nowrap w-full"
                }
              >
                <BreadcrumbList className={"flex-nowrap"}>
                  <BreadcrumbItem>
                    <Link to={"/"}>
                      <Button variant={"ghost"} disabled={false}>
                        Home
                      </Button>
                    </Link>
                  </BreadcrumbItem>
                  {breadcrumbItems.map((item, index) => (
                    <BreadcrumbItem key={index}>
                      {<p className={"text-gray-400"}>/</p>}
                      <Link to={item.path}>
                        <Button variant={"ghost"} disabled={item.isLast}>
                          {item.name}
                        </Button>
                      </Link>
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      isMobile ? "w-12" : "w-96",
                    )}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {currentUser?.email?.substring(0, 2) || "??"}
                      </AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {currentUser?.email}
                          </span>
                          <span className="truncate text-xs">
                            {currentUser?.uid}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                      </>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-80 rounded-lg"
                  side={"bottom"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                          CN
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {currentUser?.email}
                        </span>
                        <span className="truncate text-xs">
                          {currentUser?.uid}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem disabled={true}>
                      <BadgeCheck />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={true}>
                      <Bell />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className={"hover:cursor-pointer"}
                  >
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className={"px-5"}>
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutOrLanding />,
    // These children get rendered only when
    // LayoutOrLanding returns <Layout> (i.e., user is logged in).
    children: [
      { index: true, element: <QuizPage /> },
      { path: "quiz", element: <QuizPage /> },
      { path: "quiz/:id", element: <QuizDetailsPage /> },
      { path: "quiz/:id/answers", element: <QuizReviewPage /> },
    ],
  },
  // Public top-level routes without Sidebar (<Layout>).
  {
    path: "quiz/:id/live",
    element: <QuizTeacherPage />,
  },
  {
    path: "audience",
    element: <AudienceLayout />,
    children: [
      { index: true, element: <AudiencePage /> },
      { path: "join", element: <QuizJoinPage /> },
    ],
  },
  {
    path: "join",
    element: <AudienceLayout />,
    children: [{ index: true, element: <QuizJoinPage /> }],
  },
]);

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST;
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  person_profiles: "identified_only",
});

if (import.meta.env.NODE_ENV === "development") {
  posthog.opt_out_capturing(); // avoid capturing events in development
}

// eslint-disable-next-line react-refresh/only-export-components
export const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider client={posthog}>
        <ReactQueryDevtools initialIsOpen={false} />
        <RouterProvider router={router} />
      </PostHogProvider>
    </QueryClientProvider>
  );
}

export default App;
