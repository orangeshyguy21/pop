// Mock content for the landing page so first-time visitors can see what a Pop
// looks like before signing in. Self-contained: the banner is an inline SVG
// (a warm sunset gradient, no external fetch) and the picture is the bundled
// logo, so nothing here can render as a broken image.

const SAMPLE_BANNER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6e6c8"/>
      <stop offset="0.55" stop-color="#e3ad4b"/>
      <stop offset="1" stop-color="#c4623d"/>
    </linearGradient>
  </defs>
  <rect width="600" height="200" fill="url(#g)"/>
</svg>`.trim();

const SAMPLE_BANNER = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_BANNER_SVG)}`;

/** A friendly stand-in event used for the home-page example card. */
export const SAMPLE_POP = {
  name: "Sarah & Tom's Wedding",
  description:
    "Thanks for celebrating with us! Leave a note, drop a photo from the day, and help us remember every moment.",
  picture: "/pop.png",
  banner: SAMPLE_BANNER,
};
