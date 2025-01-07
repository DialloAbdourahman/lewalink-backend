export function isNumeric(input: string): boolean {
  // Trim the input to remove leading and trailing whitespace
  const trimmedInput = input.trim();

  // Check if the trimmed input is a valid number
  return !isNaN(Number(trimmedInput)) && !isNaN(parseFloat(trimmedInput));
}
