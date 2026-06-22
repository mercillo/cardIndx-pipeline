import "./styles/styles.css";
import { registerRoot, Composition } from "remotion";
import { MainComposition } from "./compositions/MainComposition";
import mockData from "./mock-data.json";

const MOSAIC_DURATION = 90;
const SLIDE_DURATION = 60;
const OUTRO_DURATION = 120;

const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MainComposition as any}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: mockData }}
        calculateMetadata={({ props }: { props: { data: unknown[] } }) => ({
          durationInFrames: MOSAIC_DURATION + props.data.length * SLIDE_DURATION + OUTRO_DURATION,
        })}
      />
    </>
  );
};

registerRoot(RemotionRoot);
