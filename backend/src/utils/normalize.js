/**
 * Company name normalizer to ensure consistent matching across jobs, experiences, and LeetCode datasets.
 */
export const normalizeCompanyName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\b(inc|corp|corporation|ltd|limited|technologies|technology|tech|pvt|private|solutions|systems|system|llc|india|services)\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
};
