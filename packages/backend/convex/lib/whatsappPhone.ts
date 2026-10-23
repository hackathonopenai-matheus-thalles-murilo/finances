export function normalizeBrazilianPhone(value: string) {
  const input = value.trim();
  if (!/^[+\d\s().-]+$/.test(input)) return null;
  if (input.startsWith("+") && !input.startsWith("+55")) return null;

  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return null;
}
