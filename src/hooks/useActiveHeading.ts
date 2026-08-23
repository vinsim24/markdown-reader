import { useEffect, useState } from 'react';

export function useActiveHeading(markdown: string, focusMode: boolean) {
  const [activeHeading, setActiveHeading] = useState('');

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.reader h1, .reader h2, .reader h3, .reader h4, .reader h5, .reader h6'
      )
    );
    if (elements.length === 0) {
      setActiveHeading('');
      return;
    }
    setActiveHeading(elements[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    elements.forEach((element) => {
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [markdown, focusMode]);

  return { activeHeading, setActiveHeading };
}
