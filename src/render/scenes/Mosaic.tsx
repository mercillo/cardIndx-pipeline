import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { theme } from "../styles/theme";

interface CardData {
  id: string;
  name: string;
  setName: string;
  artUrl: string;
  prices: {
    psa10Current: number | null;
    psa10Change30d: number | null;
    psa10Change7d?: number | null;
    rawCurrent: number | null;
  };
}

interface MosaicProps {
  cards: CardData[];
  date?: string;
}

const ChangeText = ({ value }: { value: number | null | undefined }) => {
  if (value == null) return null;
  const isUp = value >= 0;
  return (
    <div style={{ color: isUp ? "#22C55E" : "#EF4444", fontSize: 19, fontFamily: theme.fonts.mono, fontWeight: 700 }}>
      {isUp ? "+" : ""}{value.toFixed(1)}% 7d
    </div>
  );
};

export const Mosaic = ({ cards, date }: MosaicProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        padding: 40,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 6 }}>
          <div
            style={{
              color: theme.colors.accent,
              fontSize: 22,
              fontFamily: theme.fonts.main,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            @pkmnIndx
          </div>
          {date && (
            <div style={{ color: theme.colors.muted, fontSize: 20, fontFamily: theme.fonts.mono }}>
              {date}
            </div>
          )}
        </div>
        <div
          style={{
            color: theme.colors.text,
            fontSize: 52,
            fontFamily: theme.fonts.main,
            fontWeight: 700,
          }}
        >
          {cards[0]?.setName ?? "Pokémon"} · Daily Price Guide
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 3,
          backgroundColor: theme.colors.accent,
          borderRadius: 2,
          marginBottom: 28,
          flexShrink: 0,
        }}
      />

      {/* 2x4 Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "repeat(4, 1fr)",
          gap: 16,
          minHeight: 0,
        }}
      >
        {cards.slice(0, 8).map((card, i) => {
          const cardOpacity = interpolate(frame, [i * 6, i * 6 + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const cardScale = interpolate(frame, [i * 6, i * 6 + 12], [0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={card.id}
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
                backgroundColor: theme.colors.surface,
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
              }}
            >
              {/* Card art */}
              <div
                style={{
                  width: "62%",
                  flexShrink: 0,
                  backgroundColor: "#11131A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                }}
              >
                <Img
                  src={card.artUrl}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
              </div>

              {/* Info */}
              <div
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {/* Rank + name */}
                <div style={{ minHeight: 0 }}>
                  <div
                    style={{
                      color: theme.colors.accent,
                      fontSize: 18,
                      fontFamily: theme.fonts.mono,
                      fontWeight: 700,
                      marginBottom: 2,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div
                    style={{
                      color: theme.colors.text,
                      fontSize: 22,
                      fontFamily: theme.fonts.main,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {card.name}
                  </div>
                </div>

                {/* Price + 7d badge — always pinned to bottom */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      color: theme.colors.muted,
                      fontSize: 13,
                      fontFamily: theme.fonts.mono,
                      marginBottom: 2,
                      letterSpacing: 1,
                    }}
                  >
                    MARKET
                  </div>
                  <div
                    style={{
                      color: theme.colors.text,
                      fontSize: 20,
                      fontFamily: theme.fonts.mono,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {card.prices.rawCurrent != null
                      ? `$${card.prices.rawCurrent.toFixed(2)}`
                      : "N/A"}
                  </div>
                  <ChangeText value={card.prices.psa10Change7d ?? card.prices.psa10Change30d} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
