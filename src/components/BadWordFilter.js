import profanity from 'leo-profanity';

// Initialize the filter with English dictionary (default)
profanity.loadDictionary();

/**
 * Check if a message contains bad words
 * @param {string} text - The message text to check
 * @returns {boolean} - True if bad words found, false otherwise
 */
export const containsBadWords = (text) => {
  if (!text) return false;
  return profanity.check(text);
};

/**
 * Filter bad words from a message by replacing them with asterisks
 * @param {string} text - The message text to filter
 * @returns {string} - Filtered message
 */
export const filterBadWords = (text) => {
  if (!text) return text;
  return profanity.clean(text);
};