import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastViewport } from "./components/ui/Toast";
import { useI18nStore } from "./i18n";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Reflect the initial language on <html lang> for a11y / font hinting.
document.documentElement.lang = useI18nStore.getState().lang;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <ToastViewport />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
