import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/inicio")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
