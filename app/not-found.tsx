import { NotFoundView } from "@/components/not-found-view";

export default function GlobalNotFound() {
  return (
    <NotFoundView
      title="Page not found"
      description="The route you requested does not exist."
      ctaHref="/"
      ctaLabel="Go to homepage"
    />
  );
}
