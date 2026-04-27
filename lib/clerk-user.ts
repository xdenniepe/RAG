import { currentUser } from "@clerk/nextjs/server";

type ClerkErrorShape = {
  clerkError?: boolean;
  status?: number;
  errors?: Array<{ code?: string }>;
};

export function isClerkUserNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeClerkError = error as ClerkErrorShape;
  const hasResourceNotFound = Array.isArray(maybeClerkError.errors)
    ? maybeClerkError.errors.some((item) => item?.code === "resource_not_found")
    : false;

  return (
    maybeClerkError.clerkError === true &&
    maybeClerkError.status === 404 &&
    hasResourceNotFound
  );
}

export async function safeCurrentUser() {
  try {
    return await currentUser();
  } catch (error) {
    if (isClerkUserNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}
