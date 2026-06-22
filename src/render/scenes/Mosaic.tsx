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
}

const ChangeBadge = ({ value }: { value: number | null | undefined }) => {
  if (value === null || value === undefined) return null;
  const isUp = value >= 0;
  return (
    <div
      style={{
        backgroundColor: isUp ? theme.colors.up : theme.colors.down,
        color: "#FFFFFF",
        fontSize: 24,
        fontFamily: theme.fonts.mono,
        fontWeight: 700,
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 6,
        lineHeight: 1,
      }}
    >
      {isUp ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </div>
  );
};

export const Mosaic = ({ cards }: MosaicProps) => {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              color: theme.colors.accent,
              fontSize: 22,
              fontFamily: theme.fonts.main,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            @pkmnIndx
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
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Rank + name */}
                <div>
                  <div
                    style={{
                      color: theme.colors.accent,
                      fontSize: 20,
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
                      fontSize: 26,
                      fontFamily: theme.fonts.main,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {card.name}
                  </div>
                </div>

                {/* Price + badge */}
                <div>
                  <div
                    style={{
                      color: theme.colors.muted,
                      fontSize: 18,
                      fontFamily: theme.fonts.mono,
                      marginBottom: 8,
                    }}
                  >
                    RAW:{" "}
                    <span
                      style={{
                        color: theme.colors.text,
                        fontWeight: 700,
                      }}
                    >
                      {card.prices.rawCurrent != null
                        ? `$${card.prices.rawCurrent.toFixed(2)}`
                        : "N/A"}
                    </span>
                  </div>
                  <ChangeBadge
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
    </AbsoluteFill>
  );
};
