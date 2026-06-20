import React from "react";
import { Composition } from "remotion";
import { MainVideo, VARIANTS } from "./MainVideo";

type Size = { w: number; h: number; label: string };
const SIZES: Size[] = [
  { w: 1920, h: 1080, label: "h-1080" },
  { w: 1280, h: 720,  label: "h-720"  },
  { w: 1080, h: 1920, label: "v-1080" },
  { w: 720,  h: 1280, label: "v-720"  },
];

const VARIANT_IDS = Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>;

export const RemotionRoot: React.FC = () => (
  <>
    {VARIANT_IDS.flatMap((vid) =>
      SIZES.map((s) => (
        <Composition
          key={`${vid}-${s.label}`}
          id={`${vid}-${s.label}`}
          component={MainVideo}
          durationInFrames={450}
          fps={30}
          width={s.w}
          height={s.h}
          defaultProps={{ variantId: vid }}
        />
      ))
    )}
    {/* Back-compat: keep the original "main" id */}
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ variantId: "original" as const }}
    />
  </>
);