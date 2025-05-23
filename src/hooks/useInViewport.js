import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to detect when an element enters the viewport
 * @param {Object} options - IntersectionObserver options
 * @param {string} options.rootMargin - Margin around the root (viewport)
 * @param {number} options.threshold - Threshold for triggering the callback
 * @returns {[React.RefObject, boolean]} - [ref, isInViewport]
 */
export const useInViewport = ({ rootMargin = '0px', threshold = 0 } = {}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  const ref = useRef(null);

  const handleIntersection = useCallback(([entry]) => {
    setIsInViewport(entry.isIntersecting);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [handleIntersection, rootMargin, threshold]);

  return [ref, isInViewport];
};

export default useInViewport; 