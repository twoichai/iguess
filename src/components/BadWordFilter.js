import { Filter } from 'bad-words';

const filter = new Filter();

/**
 * Check if a message contains bad words
 * @param {string} text - The message text to check
 * @returns {boolean} - True if bad words found, false otherwise
 */
export const containsBadWords = (text) => {
  if (!text) return false;
  return filter.isProfane(text);
};

/**
 * Filter bad words from a message by replacing them with asterisks
 * @param {string} text - The message text to filter
 * @returns {string} - Filtered message
 */
export const filterBadWords = (text) => {
  if (!text) return text;
  return filter.clean(text);
};