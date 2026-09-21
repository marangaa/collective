import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/case/$slug",
      params: { slug: "nairobi-health-facilities" },
    });
  },
  component: () => null,
});

