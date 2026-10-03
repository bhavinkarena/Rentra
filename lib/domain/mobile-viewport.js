// A keyboard removes substantial usable height; pinch zoom must retain navigation.
export const keyboardOccludesViewport = (baseline, height, scale = 1) =>
  scale === 1 && baseline - height > 150;
