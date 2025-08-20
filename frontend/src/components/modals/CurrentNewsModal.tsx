import { Modal } from "../ui/Modal";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSelector } from "../../hooks/useAppDispatch";

export default function CurrentNewsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [previousAuthState, setPreviousAuthState] = useState<boolean | null>(
    null
  );
  const [shouldShowAfterNav, setShouldShowAfterNav] = useState(false);
  const [hasShownOnLogin, setHasShownOnLogin] = useState(false);

  const { isInitialized, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );
  const location = useLocation();

  useEffect(() => {
    // Show modal when app is first loaded AND user is NOT authenticated
    if (isInitialized && !isAuthenticated && previousAuthState === null) {
      setIsOpen(true);
      setPreviousAuthState(false);
    }
  }, [isInitialized, isAuthenticated, previousAuthState]);

  useEffect(() => {
    // Show modal when user transitions from not authenticated to authenticated (login)
    if (previousAuthState === false && isAuthenticated && !hasShownOnLogin) {
      // Mark that we should show after navigation, but don't show yet
      setShouldShowAfterNav(true);
      setHasShownOnLogin(true);
    }

    // Update previous state
    if (isInitialized) {
      setPreviousAuthState(isAuthenticated);
    }
  }, [isAuthenticated, previousAuthState, isInitialized, hasShownOnLogin]);

  // Reset hasShownOnLogin when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setHasShownOnLogin(false);
    }
  }, [isAuthenticated]);

  // Show modal after page navigation/rendering is complete
  useEffect(() => {
    if (shouldShowAfterNav && isAuthenticated) {
      // Use longer delay to ensure page is fully loaded after redirect
      const timer = setTimeout(() => {
        setIsOpen(true);
        setShouldShowAfterNav(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [shouldShowAfterNav, isAuthenticated, location.pathname]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Current News and Updates"
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={false}
      actions={
        <div className="flex gap-2">
          <button
            className="btn btn-primary font-thin"
            onClick={() => setIsOpen(false)}
          >
            I confirm that I have read these updates
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <p>
          <b>25-02-17</b> Autophon will shut down indefinitely on April 30 due
          to lack of funding. Users may contact Nate Young for a free GitHub
          clone to run locally. It was a pleasure serving the phonetics
          community! <br />
          <br />
          Best wishes,
          <br />
          Nate Young and Kaosi Anikwe
        </p>
      </div>
    </Modal>
  );
}
