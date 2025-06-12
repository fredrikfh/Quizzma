import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

/**
 * Simple layout for routes used by the audieneces' devices.
 */
export const AudienceLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <Toaster />
    </div>
  );
};
