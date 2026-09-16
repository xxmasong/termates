import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const renderMarkdown = (text: string): string => {
  try {
    const html = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(html);
  } catch {
    return DOMPurify.sanitize(text);
  }
};
