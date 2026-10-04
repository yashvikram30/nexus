// Where the backend API lives. Set VITE_BACKEND_URL for deployed builds; local development uses port 3000.
export const BACKEND_URL: string = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000").replace(/\/+$/, "")

// Public OAuth client id (safe to ship to the browser). Google sign-in is hidden when unset.
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""
