/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /**
     * Required from Next 16 — an unrestricted allowlist would let anyone
     * hammer the optimizer with arbitrary quality values.
     *
     * 60 is the hero/gallery setting. Photography of sunlit farmhouses tolerates
     * it well, and it keeps a full-bleed hero comfortably under 150KB on the
     * mid-range Android connections this product is actually browsed on.
     * 75 stays for small card crops where artefacts would show.
     */
    qualities: [60, 75],

    /** AVIF first — meaningfully smaller than WebP on photographic content. */
    formats: ['image/avif', 'image/webp'],

    /**
     * Photos live in /public today. When the S3/R2 bucket lands, add it here:
     *   remotePatterns: [{ protocol: 'https', hostname: 'cdn.rentra.in' }]
     */
  },
};

export default nextConfig;
