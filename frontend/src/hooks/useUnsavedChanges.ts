import { useEffect } from "react";

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * 
 * @param isDirty Whether there are unsaved changes
 * @param message The message to show in the confirmation dialog
 */
export const useUnsavedChanges = (isDirty: boolean, message = "You have unsaved changes. Are you sure you want to leave?") => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);

  // For client-side routing (Next.js), we could use Router.events or useBeforeUnload if using a specific library
  // In standard Next.js 13+ App Router, it's harder to block navigation without a custom solution.
  // For this v1, we focus on the beforeunload event which handles tab/window closing.
};
