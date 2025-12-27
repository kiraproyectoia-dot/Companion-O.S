
const CHAR_TO_NUM: { [key: string]: number } = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10, 'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18, 'S': 19, 'T': 20, 'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26, 'Ñ': 27,
};

const NUM_TO_CHAR: { [key: number]: string } = Object.fromEntries(
  Object.entries(CHAR_TO_NUM).map(([key, value]) => [value, key])
);

const LIF_REGEX = /^[\d\.\s-]+∞$/;

/**
 * Checks if a message is formatted in LIF.
 * @param message The input string.
 * @returns True if the message is in LIF format.
 */
export const isLIF = (message: string): boolean => {
  return LIF_REGEX.test(message.trim());
};

/**
 * Decodes a LIF message into plain text.
 * @param lifMessage The LIF-encoded string.
 * @returns The decoded plain text string.
 */
export const decodeLIF = (lifMessage: string): string => {
  try {
    const content = lifMessage.trim().slice(0, -1); // Remove ∞
    const words = content.split('-');
    const decodedWords = words.map(word => {
      const chars = word.split('.');
      return chars.map(char => {
        const num = parseInt(char.trim(), 10);
        if (isNaN(num)) return '';
        const decodedNum = num - 1; // Decryption rule: -1
        return NUM_TO_CHAR[decodedNum] || '';
      }).join('');
    });
    return decodedWords.join(' ');
  } catch (error) {
    console.error("Failed to decode LIF message:", error);
    return "[Error de decodificación]";
  }
};

/**
 * Encodes a plain text message into LIF.
 * @param textMessage The plain text string.
 * @returns The LIF-encoded string.
 */
export const encodeLIF = (textMessage: string): string => {
    try {
      const upperCaseMessage = textMessage.toUpperCase().replace(/[^A-ZÑ\s]/g, '');
      const words = upperCaseMessage.split(' ');
  
      const encodedWords = words.map(word => {
        return word.split('').map(char => {
          const num = CHAR_TO_NUM[char];
          if (num === undefined) return '';
          return (num + 1).toString(); // Encryption rule: +1
        }).filter(Boolean).join('.');
      });
  
      return `${encodedWords.filter(Boolean).join('-')}∞`;
    } catch (error) {
      console.error("Failed to encode LIF message:", error);
      return "[Error de codificación]∞";
    }
};
