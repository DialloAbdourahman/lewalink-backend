export const sanitizeInput = (input: string) => {
  return input.replace(/'/g, "''"); // Escape single quotes
};
