import posthog from "posthog-js";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const usePostHogPageView = () => {
  const location = useLocation();

  useEffect(() => {
    posthog.capture("$pageview", {
      url: location.pathname + location.search, // Track both the path and any query parameters
    });
  }, [location]);
};

export default usePostHogPageView;
