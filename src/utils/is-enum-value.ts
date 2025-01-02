export function isEnumValue(enumObj: any, value: any): boolean {
  return Object.values(enumObj).includes(value);
}
