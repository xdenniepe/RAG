import { ConvexHttpClient } from "convex/browser";

function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return null;
  }
  return url;
}

export function getConvexClient() {
  const url = getConvexUrl();
  if (!url) {
    return null;
  }
  return new ConvexHttpClient(url);
}
