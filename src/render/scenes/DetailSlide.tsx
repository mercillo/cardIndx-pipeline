import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { theme, safeZone } from "../styles/theme";
import { getPriceTier, getMovementLabel, getTrendSignal, getPriceMath } from "../utils/insights";

interface CardData {
  id: string;
  name: string;
  cardNumber: string;
  rarity?: string;
  setName: string;
  artUrl: string;
  prices: {
    psa10Current: number | null;
    psa10Change30d: number | null;
    psa10Change7d?: number | null;
    rawCurrent: number | null;
  };
}

const CARD_BG = "#16181F";
const INFO_BG = "#0C0C0E";

const Chip = ({ label, color }: { label: string; color: string }) => (
  <div
    style={{
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
    }}
  >
    {label}
  </div>
);

const PriceMathRow = ({
  label,
  current,
  pctChange,
}: {
  label: string;
  current: number | null;
  pctChange: number | null | undefined;
}) => {
  const math = getPriceMath(current, pctChange);
  if (!math) return null;
  const { pastPrice, dollarChange, pctChange: pct } = math;
  const isUp = pct >= 0;
  const changeColor = isUp ? "#22C55E" : "#EF4444";
  const arrow = isUp ? "↑" : "↓";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <span style={{ color: theme.colors.muted, fontSize: 34, fontFamily: theme.fonts.mono, letterSpacing: 1, minWidth: 70 }}>
        {label}
      </span>
      <span style={{ color: theme.colors.text, fontSize: 38, fontFamily: theme.fonts.mono }}>
        ${pastPrice.toFixed(2)}
      </span>
      <span style={{ color: theme.colors.muted, fontSize: 30 }}>→</span>
      <span style={{ color: changeColor, fontSize: 38, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
        {isUp ? "+" : ""}{pct.toFixed(1)}%
      </span>
      <span style={{ color: theme.colors.muted, fontSize: 30 }}>→</span>
      <span style={{ color: theme.colors.text, fontSize: 38, fontFamily: theme.fonts.mono }}>
        ${current!.toFixed(2)}
      </span>
      <span style={{ color: changeColor, fontSize: 32, fontFamily: theme.fonts.mono, marginLeft: 8 }}>
        ({arrow} ${Math.abs(dollarChange).toFixed(2)})
      </span>
    </div>
  );
};

export const DetailSlide = ({ card, rank, date }: { card: CardData; rank: number; date?: string }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const infoOpacity = interpolate(frame, [6, 20], [0, 1], { extrapolateRight: "clamp" });

  const current = card.prices.rawCurrent;
  const change7d = card.prices.psa10Change7d;
  const change30d = card.prices.psa10Change30d;

  const priceTier = getPriceTier(current);
  const movement = getMovementLabel(change7d);
  const trend = getTrendSignal(change7d, change30d);

  return (
    <AbsoluteFill style={{ opacity, display: "flex", flexDirection: "column" }}>
      {/* Card image — reduced to give info panel more room */}
      <div
        style={{
          flex: "0 0 44%",
          backgroundColor: CARD_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: safeZone.top,
          paddingBottom: 36,
          paddingLeft: 36,
          paddingRight: 36,
        }}
      >
        <Img
          src={card.artUrl}
          style={{
            maxHeight: "100%",
            maxWidth: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 10px 32px rgba(0,0,0,0.75))",
          }}
        />
      </div>

      {/* Accent line */}
      <div style={{ height: 4, backgroundColor: theme.colors.accent, flexShrink: 0 }} />

      {/* Info panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: INFO_BG,
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 50,
          paddingRight: 50,
          display: "flex",
          flexDirection: "column",
          opacity: infoOpacity,
        }}
      >
        {/* Rank + set row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 10 }}>
          <div
            style={{
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
            }}
          >
            #{rank}
          </div>
          <div style={{ color: theme.colors.muted, fontSize: 30, fontFamily: theme.fonts.mono }}>
            {card.setName}{card.rarity ? ` · ${card.rarity}` : ""}
          </div>
        </div>

        {/* Card name */}
        <div
          style={{
            color: theme.colors.text,
            fontSize: 64,
            fontFamily: theme.fonts.main,
            fontWeight: 700,
            lineHeight: 1.05,
            marginBottom: 14,
          }}
        >
          {card.name}
        </div>

        {/* MARKET PRICE label */}
        <div style={{ color: theme.colors.muted, fontSize: 26, fontFamily: theme.fonts.mono, letterSpacing: 3, marginBottom: 6 }}>
          MARKET PRICE
        </div>

        {/* Price hero */}
        <div
          style={{
            color: theme.colors.text,
            fontSize: 120,
            fontFamily: theme.fonts.mono,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          {current != null ? `$${current.toFixed(2)}` : "N/A"}
        </div>

        {/* Insight chips row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {priceTier && <Chip label={priceTier.label} color={priceTier.color} />}
          {movement && <Chip label={movement.label} color={movement.color} />}
          {trend && (
            <>
              <Chip label={trend.label} color={trend.color} />
              <span style={{ color: theme.colors.muted, fontSize: 24, fontFamily: theme.fonts.mono }}>
                · {trend.detail}
              </span>
            </>
          )}
        </div>

        {/* Price math rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PriceMathRow label="7D" current={current} pctChange={change7d} />
          <PriceMathRow label="30D" current={current} pctChange={change30d} />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 20 }}>
          <div style={{ color: theme.colors.accent, fontSize: 28, fontFamily: theme.fonts.main, fontWeight: 700, letterSpacing: 4 }}>
            @pkmnIndx
          </div>
          {date && (
            <div style={{ color: theme.colors.muted, fontSize: 26, fontFamily: theme.fonts.mono }}>
              {date}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
