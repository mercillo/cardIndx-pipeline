import { Img } from "remotion";

export const CardArt = ({ src }: { src: string }) => (
  <Img
    src={src}
    style={{
      width: "100%",
      height: "100%",
      objectFit: "contain", // Keeps aspect ratio but forces it to stay inside the box
    }}
  />
);
