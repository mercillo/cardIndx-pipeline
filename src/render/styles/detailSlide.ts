import { theme, safeZone } from "./theme";

export const CARD_BG = "#16181F";
export const INFO_BG = "#0C0C0E";

export const detailStyles = {
  safeZoneTop: {
    height: safeZone.top,
    backgroundColor: CARD_BG,
    flexShrink: 0,
  },
  cardArtContainer: {
    height: 900,
    backgroundColor: CARD_BG,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    paddingBottom: 30,
  },
  cardArt: {
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain" as const,
    filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.75))",
  },
  accentLine: {
    height: 4,
    backgroundColor: theme.colors.accent,
    flexShrink: 0,
  },
  infoPanel: {
    flex: 1,
    backgroundColor: INFO_BG,
    display: "flex",
    flexDirection: "column" as const,
  },
  infoPanelContent: {
    flex: 1,
    paddingTop: 28,
    paddingLeft: 64,
    paddingRight: 64,
    display: "flex",
    flexDirection: "column" as const,
  },
  rankRow: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 10,
  },
  rankBadge: {
    backgroundColor: theme.colors.accent,
    color: "#fff",
    fontSize: 34,
    fontFamily: theme.fonts.mono,
    fontWeight: 700,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 6,
  },
  setName: {
    color: theme.colors.muted,
    fontSize: 30,
    fontFamily: theme.fonts.mono,
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 48,
    fontFamily: theme.fonts.main,
    fontWeight: 700,
    lineHeight: 1.05,
    marginBottom: 14,
  },
  marketPriceLabel: {
    color: theme.colors.muted,
    fontSize: 26,
    fontFamily: theme.fonts.mono,
    letterSpacing: 3,
    marginBottom: 6,
  },
  priceHero: {
    color: theme.colors.text,
    fontSize: 100,
    fontFamily: theme.fonts.mono,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 20,
  },
  chipRow: {
    display: "flex",
    gap: 14,
    marginBottom: 20,
    flexWrap: "wrap" as const,
    alignItems: "center",
  },
  trendDetail: {
    color: theme.colors.muted,
    fontSize: 24,
    fontFamily: theme.fonts.mono,
  },
  priceMathRows: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  },
  priceMathRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  priceMathLabel: {
    color: theme.colors.muted,
    fontSize: 26,
    fontFamily: theme.fonts.mono,
    letterSpacing: 1,
    minWidth: 60,
  },
  priceMathValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontFamily: theme.fonts.mono,
  },
  priceMathArrow: {
    color: theme.colors.muted,
    fontSize: 24,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    paddingTop: 10,
    marginTop: "auto",
  },
  footerHandle: {
    color: theme.colors.accent,
    fontSize: 28,
    fontFamily: theme.fonts.main,
    fontWeight: 700,
    letterSpacing: 4,
  },
  footerDate: {
    color: theme.colors.muted,
    fontSize: 26,
    fontFamily: theme.fonts.mono,
  },
  bottomSafeZone: {
    height: safeZone.bottom,
    backgroundColor: INFO_BG,
    flexShrink: 0,
  },
} as const;

export const chipStyle = (color: string) => ({
  border: `2px solid ${color}`,
  color,
  fontSize: 22,
  fontFamily: theme.fonts.mono,
  fontWeight: 700,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 18,
  paddingRight: 18,
  borderRadius: 6,
  letterSpacing: 2,
});

export const priceMathChangeStyle = (color: string) => ({
  color,
  fontSize: 30,
  fontFamily: theme.fonts.mono,
  fontWeight: 700,
});

export const priceMathDeltaStyle = (color: string) => ({
  color,
  fontSize: 26,
  fontFamily: theme.fonts.mono,
  marginLeft: 6,
});
