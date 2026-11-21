import { useState, useEffect } from 'react';
export function useClientSearchParams() {
  const [params, setParams] = useState(new URLSearchParams());
  useEffect(() => { setParams(new URLSearchParams(window.location.search)); }, []);
  return params;
}
