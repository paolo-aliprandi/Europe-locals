const flagCodeOverrides = new Map([
  ["UK", "GB"],
  ["EL", "GR"],
]);

export function getFlagEmoji(originId: string): string | null {
  const normalizedCode = flagCodeOverrides.get(originId) ?? originId;

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return null;
  }

  const regionalIndicatorOffset = 127397;
  return [...normalizedCode]
    .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + regionalIndicatorOffset))
    .join("");
}
