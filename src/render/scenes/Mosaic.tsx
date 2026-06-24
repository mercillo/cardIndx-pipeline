import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { theme, safeZone } from "../styles/theme";
import { getMovementLabel } from "../utils/insights";

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
  const movement = getMovementLabel(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          color: isUp ? "#22C55E" : "#EF4444",
          fontSize: 22,
          fontFamily: theme.fonts.mono,
          fontWeight: 700,
        }}
      >
        {isUp ? "+" : ""}
        {value.toFixed(1)}% 7d
      </div>
      {movement && (
        <div
          style={{
            border: `1px solid ${movement.color}`,
            color: movement.color,
            fontSize: 16,
            fontFamily: theme.fonts.mono,
            fontWeight: 700,
            paddingTop: 3,
            paddingBottom: 3,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 4,
            letterSpacing: 1.5,
            alignSelf: "flex-start",
          }}
        >
          {movement.label}
        </div>
      )}
    </div>
  );
};

export const Mosaic = ({ cards, date }: MosaicProps) => {
  const frame = useCurrentFrame();

  // Accent line grows after last 2 cards finish (card 7 & 8 done at frame 54)
  const lineWidth = interpolate(frame, [54, 70], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        paddingTop: safeZone.top,
        paddingBottom: 0,
        paddingLeft: 64,
        paddingRight: 40,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 6,
          }}
        >
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
            <div
              style={{
                color: theme.colors.muted,
                fontSize: 20,
                fontFamily: theme.fonts.mono,
              }}
            >
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
          paddingRight: safeZone.right,
          marginBottom: 28,
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
                  width: "48%",
                  flexShrink: 0,
                  backgroundColor: "#11131A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 10,
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
                  padding: "14px 16px",
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
                      fontSize: 22,
                      fontFamily: theme.fonts.mono,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div
                    style={{
                      color: theme.colors.text,
                      fontSize: 18,
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

                {/* Price + 7d — pinned to bottom */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      color: theme.colors.muted,
                      fontSize: 16,
                      fontFamily: theme.fonts.mono,
                      marginBottom: 4,
                      letterSpacing: 1,
                    }}
                  >
                    MARKET
                  </div>
                  <div
                    style={{
                      color: theme.colors.text,
                      fontSize: 26,
                      fontFamily: theme.fonts.mono,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    {card.prices.rawCurrent != null
                      ? `$${card.prices.rawCurrent.toFixed(2)}`
                      : "N/A"}
                  </div>
                  <ChangeText
                    value={
                      card.prices.psa10Change7d ?? card.prices.psa10Change30d
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom accent line — grows left to right after last 2 cards appear */}
      <div
        style={{
          height: 4,
          backgroundColor: theme.colors.accent,
          flexShrink: 0,
          width: `${lineWidth}%`,
        }}
      />

      {/* Black section — TikTok bottom safe zone */}
      <div
        style={{ height: 350, backgroundColor: theme.colors.bg, flexShrink: 0 }}
      />
    </AbsoluteFill>
  );
};
