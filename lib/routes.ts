export const ROUTES = {
  dashboard: {
    root: "/dashboard",
    merchant: "/dashboard",
  },
  ops: {
    root: "/ops",
    dashboard: "/ops/dashboard",
    producerAdd: "/ops/producer/add",
    productAdd: "/ops/product/add",
  },
  onboarding: "/onboarding",
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    postSignIn: "/auth/post-sign-in",
  },
} as const;

export const SIDEBAR_NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: ROUTES.dashboard.merchant,
    icon: "grid",
  },
  {
    key: "products",
    label: "Products",
    href: ROUTES.dashboard.merchant,
    icon: "box",
  },
  {
    key: "assets",
    label: "Assets",
    href: ROUTES.dashboard.merchant,
    icon: "image",
  },
  {
    key: "analytics",
    label: "Analytics",
    href: ROUTES.dashboard.merchant,
    icon: "chart",
  },
] as const;

export const NAV_AUTH_CONTROLS_HIDDEN_ROUTES = ["/"] as const;
export const NAV_AUTH_CONTROLS_HIDDEN_ROUTE_PREFIXES = ["/auth"] as const;

export const APP_ROUTES = ROUTES;
