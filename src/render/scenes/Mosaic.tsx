import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { getMovementLabel } from "../utils/insights";
import { mosaicStyles } from "../styles/mosaic";

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
  title?: string;
}

const ChangeText = ({ value }: { value: number | null | undefined }) => {
  if (value == null) return null;
  const isUp     = value >= 0;
  const movement = getMovementLabel(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={mosaicStyles.changeText(isUp)}>
        {isUp ? "+" : ""}{value.toFixed(1)}% 7d
      </div>
      {movement && (
        <div style={mosaicStyles.movementBadge(movement.color)}>
          {movement.label}
        </div>
      )}
    </div>
  );
};

export const Mosaic = ({ cards, date, title }: MosaicProps) => {
  const frame = useCurrentFrame();

  const lineWidth = interpolate(frame, [54, 70], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={mosaicStyles.container}>

      <div style={mosaicStyles.header}>
        <div style={mosaicStyles.headerRow}>
          <div style={mosaicStyles.handle}>@pkmnIndx</div>
          {date && <div style={mosaicStyles.date}>{date}</div>}
        </div>
        <div style={mosaicStyles.title}>
          {title ?? cards[0]?.setName ?? "Pokémon"} · Daily Price Guide
        </div>
      </div>

      <div style={mosaicStyles.divider} />

      <div style={mosaicStyles.grid}>
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
              style={{ ...mosaicStyles.card, opacity: cardOpacity, transform: `scale(${cardScale})` }}
            >
              <div style={mosaicStyles.cardArtContainer}>
                <Img src={card.artUrl} style={mosaicStyles.cardArt} />
              </div>

              <div style={mosaicStyles.cardInfo}>
                <div style={mosaicStyles.cardNameSection}>
                  <div style={mosaicStyles.rank}>#{i + 1}</div>
                  <div style={mosaicStyles.cardName}>{card.name}</div>
                </div>

                <div style={mosaicStyles.priceSection}>
                  <div style={mosaicStyles.marketLabel}>MARKET</div>
                  <div style={mosaicStyles.price}>
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

      <div style={{ ...mosaicStyles.accentLine, width: `${lineWidth}%` }} />
      <div style={mosaicStyles.bottomSection} />

    </AbsoluteFill>
  );
};
