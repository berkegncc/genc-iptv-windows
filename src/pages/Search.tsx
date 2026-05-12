import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUIStore } from "../stores/uiStore";

/**
 * Legacy `/search` route. The actual command palette is `<SearchModal>` —
 * mounted globally, opened via Ctrl+F. If a user lands here (deep link,
 * browser history, sidebar Ara button before we wired the modal trigger),
 * we open the modal and bounce them home so they don't see a dead page.
 */
export default function Search() {
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  useEffect(() => {
    setSearchOpen(true);
  }, [setSearchOpen]);
  return <Navigate to="/" replace />;
}
