import { theme } from "./theme";

export const outroStyles = {
  container: {
    backgroundColor: theme.colors.bg,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 440,
    height: 440,
    objectFit: "contain" as const,
    marginBottom: 40,
  },
  accentBar: {
    width: 80,
    height: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
    marginBottom: 56,
  },
  ctaText: {
    color: theme.colors.text,
    fontSize: 62,
    fontFamily: theme.fonts.main,
    fontWeight: 700,
    textAlign: "center" as const,
    lineHeight: 1.2,
    marginBottom: 16,
  },
  handle: {
    color: theme.colors.accent,
    fontSize: 52,
    fontFamily: theme.fonts.main,
    fontWeight: 700,
    letterSpacing: 4,
    marginTop: 48,
    marginBottom: 48,
  },
  platformRow: {
    display: "flex",
    flexDirection: "row" as const,
    gap: 32,
  },
  platformChip: {
    color: theme.colors.muted,
    fontSize: 28,
    fontFamily: theme.fonts.main,
    fontWeight: 500,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    border: `1px solid ${theme.colors.surface}`,
    borderRadius: 8,
  },
} as const;
