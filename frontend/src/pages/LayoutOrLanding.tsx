import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import { Layout } from "@/App.tsx";

function LayoutOrLanding() {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error(
      "AuthContext is undefined, make sure you render <AuthProvider> at the top level.",
    );
  }

  const { currentUser, loading } = authContext;
  const [showLoading, setShowLoading] = useState(false);

  // Only show loading page after 1sec of loading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setShowLoading(true);
      }, 1000);
    } else {
      setShowLoading(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        {showLoading && <p className="text-2xl"></p>}
      </div>
    );
  }

  // If no user → show LandingPage (NO layout)
  if (!currentUser) {
    return <LandingPage />;
  }

  // If user is logged in → render our normal Layout
  return <Layout />;
}

export default LayoutOrLanding;
