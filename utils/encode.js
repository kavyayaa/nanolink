const { customAlphabet } = require('nanoid');

/**
 * --- UNDERSTANDING BASE-62 ENCODING & MATHEMATICAL PERMUTATIONS ---
 * 
 * What is Base-62?
 * Base-62 is a positional numeral system that uses 62 characters:
 * - 10 digits: 0-9
 * - 26 lowercase English letters: a-z
 * - 26 uppercase English letters: A-Z
 * Total characters = 10 + 26 + 26 = 62.
 * 
 * Why do we use Base-62 for URL Shorteners?
 * 1. URL Safe: Unlike Base-64, Base-62 does not include non-alphanumeric characters like '+' or '/' 
 *    which have special meanings in URLs (e.g., query separators or path elements), nor '=' padding.
 * 2. Visual Compactness: A 6-character base-62 code is extremely short and easy for humans to read/type.
 * 
 * The Math of Permutations:
 * - Formula for combinations: N^L (where N is alphabet size, L is code length)
 * - 62^6 = 56,800,235,584 (approx. 56.8 Billion unique short codes!)
 * 
 * Why we still need a Database Collision Check:
 * While 56.8 Billion combinations makes random collisions highly improbable for low to mid-tier applications,
 * systems operating at high scales (millions/billions of writes) run into the "Birthday Paradox" where the probability
 * of a collision rises significantly over time.
 * In addition, random number generators are pseudo-random, meaning their entropy is limited. To guarantee 100% data
 * integrity and prevent a newly generated URL from accidentally overwriting an active user's URL, a production system
 * MUST perform a "Check and Retry" loop (collision protection) before saving to the database.
 */

// Define the full Base-62 alphanumeric alphabet
const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Set up the custom nanoid generator with a fixed length of 6 characters
const generateShortCode = customAlphabet(BASE62_ALPHABET, 6);

module.exports = {
  generateShortCode,
  BASE62_ALPHABET
};
