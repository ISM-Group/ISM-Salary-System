import { useEffect, useState } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 1024);

  useEffect(() => {
    const listener = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, []);

  return isMobile;
}
