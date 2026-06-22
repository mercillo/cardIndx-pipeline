import { theme } from "../styles/theme";

export const PriceBadge = ({ change }: { change: number | null }) => {
  if (change === null) return null;
  const isPositive = change >= 0;
  return (
    <div
      style={{
        color: isPositive ? theme.colors.up : theme.colors.down,
        fontSize: "32px",
        fontWeight: "bold",
      }}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(change)}%
    </div>
  );
};
