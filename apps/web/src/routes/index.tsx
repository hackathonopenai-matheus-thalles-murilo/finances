import { useAuth } from "@clerk/react";
import { Navigate, createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/components/landing/landing-page";
import Loader from "@/components/loader";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-svh">
        <Loader />
      </div>
    );
  }
  if (isSignedIn) return <Navigate to="/dashboard" />;
  return <LandingPage />;
}
