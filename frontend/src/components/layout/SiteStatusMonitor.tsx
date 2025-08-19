import { useAppSelector } from "../../hooks/useAppDispatch";
import { useSiteStatusMonitor } from "../../hooks/useSiteStatusMonitor";

/**
 * Component that handles site status monitoring.
 * Must be placed inside Router context to access navigation hooks.
 */
export function SiteStatusMonitor() {
  const { isInitialized } = useAppSelector((state) => state.auth);
  const { isInitialized: siteStatusInitialized } = useAppSelector(
    (state) => state.siteStatus
  );

  // Enable site status monitoring after both auth and site status are initialized
  useSiteStatusMonitor({
    enabled: isInitialized && siteStatusInitialized,
  });

  // This component doesn't render anything
  return null;
}

export default SiteStatusMonitor;
