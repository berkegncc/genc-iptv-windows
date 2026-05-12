import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/tokens.css";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// StrictMode intentionally NOT used. In dev it double-mounts every component,
// which causes Player.tsx's media-attach effect to fire twice — that means
// TWO mpv processes spawn and TWO upstream connections open against the IPTV
// provider, a fast path to a per-account ban. Production never has StrictMode,
// so removing it makes dev behave the same way as prod.
ReactDOM.createRoot(document.getElementById("root")!).render(
  // Outermost ErrorBoundary catches anything that escapes per-route
  // boundaries (or render errors during <App>'s providers themselves).
  <ErrorBoundary label="root">
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);
