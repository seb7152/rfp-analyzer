import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Use a ref to track if we've hydrated to avoid double rendering
  const isHydratedRef = React.useRef(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useLayoutEffect(() => {
    // Detect mobile on first mount
    const value = window.innerWidth < MOBILE_BREAKPOINT;
    isHydratedRef.current = true;
    setIsMobile(value);

    // Setup listener for window resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
