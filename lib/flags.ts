const COUNTRY_FLAGS: Record<string, string> = {
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Denmark: "🇩🇰",
  Estonia: "🇪🇪",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Greece: "🇬🇷",
  Hungary: "🇭🇺",
  Ireland: "🇮🇪",
  Italy: "🇮🇹",
  Latvia: "🇱🇻",
  Lithuania: "🇱🇹",
  Luxembourg: "🇱🇺",
  Malta: "🇲🇹",
  Netherlands: "🇳🇱",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Slovakia: "🇸🇰",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
};

export function countryFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🇪🇺";
}
