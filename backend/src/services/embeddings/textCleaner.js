/**
 * Clean student interview narrative formatting while preserving
 * semantic boundaries and interview round markers.
 */
export const cleanNarrativeText = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Normalize Windows/Mac line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove invisible control characters except standard tabs and newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip spaces adjacent to newlines
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    // Replace multiple consecutive tabs/spaces with a single space
    .replace(/[ \t]+/g, ' ')
    // Replace 3 or more consecutive newlines with 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
