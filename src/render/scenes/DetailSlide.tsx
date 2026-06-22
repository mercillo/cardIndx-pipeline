import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { theme } from "../styles/theme";

interface CardData {
  id: string;
  name: string;
  cardNumber: string;
  setName: string;
  artUrl: string;
  prices: {
    psa10Current: number | null;
    psa10Change30d: number | null;
    psa10Change7d?: number | null;
    rawCurrent: number | null;
  };
}

const ChangeRow = ({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) => {
  if (value === null || value === undefined) return null;
  const isUp = value >= 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <span style={{ color: theme.colors.muted, fontSize: 30, fontFamily: theme.fonts.mono }}>
        {label}
      </span>
      <span
        style={{
          color: isUp ? theme.colors.up : theme.colors.down,
          fontSize: 34,
          fontFamily: theme.fonts.mono,
          fontWeight: 700,
        }}
      >
        {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    </div>
  );
};

// Distinct background colors for each zone
const CARD_BG = "#16181F";   // dark navy — card sits on this
const INFO_BG = "#0C0C0E";   // near-black — data panel

export const DetailSlide = ({ card, rank }: { card: CardData; rank: number }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const infoOpacity = interpolate(frame, [6, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Zone 1: Card image on a distinct background ── */}
      <div
        style={{
          flex: "0 0 60%",
          backgroundColor: CARD_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 44,
        }}
      >
        <Img
          src={card.artUrl}
          style={{
            maxHeight: "100%",
            maxWidth: "100%",
            objectFit: "contain",
            // Physical card feel — shadow that follows card shape
            filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.75))",
          }}
        />
      </div>

      {/* ── Separator: brand red accent line ── */}
      <div
        style={{
          height: 4,
          backgroundColor: theme.colors.accent,
          flexShrink: 0,
        }}
      />

      {/* ── Zone 2: Info panel on a different dark background ── */}
      <div
        style={{
          flex: 1,
          backgroundColor: INFO_BG,
          paddingTop: 28,
          paddingLeft: 50,
          paddingRight: 50,
          paddingBottom: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: infoOpacity,
        }}
      >
        {/* Rank chip */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: theme.colors.accent,
            color: "#FFFFFF",
            fontSize: 26,
            fontFamily: theme.fonts.mono,
            fontWeight: 700,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 16,
            paddingRight: 16,
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          #{rank}
        </div>

        {/* Card name */}
        <div
          style={{
            color: theme.colors.text,
            fontSize: 62,
            fontFamily: theme.fonts.main,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          {card.name}
        </div>

        {/* Set name */}
        <div
          style={{
            color: theme.colors.muted,
            fontSize: 28,
            fontFamily: theme.fonts.main,
            marginBottom: 26,
          }}
        >
          {card.setName}
        </div>

        {/* Prices */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 36,
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ color: theme.colors.muted, fontSize: 20, fontFamily: theme.fonts.mono, marginBottom: 4 }}>
              RAW
            </div>
            <div style={{ color: theme.colors.text, fontSize: 40, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
              {card.prices.rawCurrent != null ? `$${card.prices.rawCurrent.toFixed(2)}` : "N/A"}
            </div>
          </div>
          <div
            style={{
              width: 2,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 1,
              alignSelf: "stretch",
            }}
          />
          <div>
            <div style={{ color: theme.colors.muted, fontSize: 20, fontFamily: theme.fonts.mono, marginBottom: 4 }}>
              PSA 10
            </div>
            <div style={{ color: theme.colors.text, fontSize: 40, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
              {card.prices.psa10Current != null ? `$${card.prices.psa10Current.toFixed(2)}` : "N/A"}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            backgroundColor: "rgba(255,255,255,0.08)",
            marginBottom: 20,
          }}
        />

        {/* Change rows */}
        <ChangeRow label="7d" value={card.prices.psa10Change7d} />
        <ChangeRow label="30d" value={card.prices.psa10Change30d} />

        {/* Footer handle */}
        <div
          style={{
            color: theme.colors.accent,
            fontSize: 22,
            fontFamily: theme.fonts.main,
            fontWeight: 700,
            letterSpacing: 3,
            marginTop: 18,
          }}
        >
          @pkmnIndx
        </div>
      </div>
    </AbsoluteFill>
  );
};
