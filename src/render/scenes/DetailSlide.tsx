import { AbsoluteFill, useCurrentFrame, interpolate, Img } from "remotion";
import { getPriceTier, getMovementLabel, getTrendSignal, getPriceMath } from "../utils/insights";
import { detailStyles, chipStyle, priceMathChangeStyle, priceMathDeltaStyle } from "../styles/detailSlide";

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

const Chip = ({ label, color }: { label: string; color: string }) => (
  <div style={chipStyle(color)}>{label}</div>
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

  return (
    <div style={detailStyles.priceMathRow}>
      <span style={detailStyles.priceMathLabel}>{label}</span>
      <span style={detailStyles.priceMathValue}>${pastPrice.toFixed(2)}</span>
      <span style={detailStyles.priceMathArrow}>→</span>
      <span style={priceMathChangeStyle(changeColor)}>
        {isUp ? "+" : ""}{pct.toFixed(1)}%
      </span>
      <span style={detailStyles.priceMathArrow}>→</span>
      <span style={detailStyles.priceMathValue}>${current!.toFixed(2)}</span>
      <span style={priceMathDeltaStyle(changeColor)}>
        ({isUp ? "↑" : "↓"} ${Math.abs(dollarChange).toFixed(2)})
      </span>
    </div>
  );
};

export const DetailSlide = ({ card, rank, date }: { card: CardData; rank: number; date?: string }) => {
  const frame = useCurrentFrame();

  const opacity     = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const infoOpacity = interpolate(frame, [6, 20], [0, 1], { extrapolateRight: "clamp" });

  const current  = card.prices.rawCurrent;
  const change7d = card.prices.psa10Change7d;
  const change30d = card.prices.psa10Change30d;

  const priceTier = getPriceTier(current);
  const movement  = getMovementLabel(change7d);
  const trend     = getTrendSignal(change7d, change30d);

  return (
    <AbsoluteFill style={{ opacity, display: "flex", flexDirection: "column" }}>
      <div style={detailStyles.safeZoneTop} />

      <div style={detailStyles.cardArtContainer}>
        <Img src={card.artUrl} style={detailStyles.cardArt} />
      </div>

      <div style={detailStyles.accentLine} />

      <div style={{ ...detailStyles.infoPanel, opacity: infoOpacity }}>
        <div style={detailStyles.infoPanelContent}>

          <div style={detailStyles.rankRow}>
            <div style={detailStyles.rankBadge}>#{rank}</div>
            <div style={detailStyles.setName}>
              {card.setName}{card.rarity ? ` · ${card.rarity}` : ""}
            </div>
          </div>

          <div style={detailStyles.cardName}>{card.name}</div>
          <div style={detailStyles.marketPriceLabel}>MARKET PRICE</div>
          <div style={detailStyles.priceHero}>
            {current != null ? `$${current.toFixed(2)}` : "N/A"}
          </div>

          <div style={detailStyles.chipRow}>
            {priceTier && <Chip label={priceTier.label} color={priceTier.color} />}
            {movement && <Chip label={movement.label} color={movement.color} />}
            {trend && (
              <>
                <Chip label={trend.label} color={trend.color} />
                <span style={detailStyles.trendDetail}>· {trend.detail}</span>
              </>
            )}
          </div>

          <div style={detailStyles.priceMathRows}>
            <PriceMathRow label="7D"  current={current} pctChange={change7d} />
            <PriceMathRow label="30D" current={current} pctChange={change30d} />
          </div>

          <div style={detailStyles.footer}>
            <div style={detailStyles.footerHandle}>@pkmnIndx</div>
            {date && <div style={detailStyles.footerDate}>{date}</div>}
          </div>

        </div>
        <div style={detailStyles.bottomSafeZone} />
      </div>
    </AbsoluteFill>
  );
};
