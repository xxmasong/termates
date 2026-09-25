import { useEffect } from 'react';
// The workspace locks body scrolling (global.css); the landing page is a long
// document, so unlock it for as long as the page is mounted.
const SCROLL_CLASS = 'landing-document';
export const usePageScroll = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(SCROLL_CLASS);
    return () => root.classList.remove(SCROLL_CLASS);
  }, []);
};
