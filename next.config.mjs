/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /**
     * KYC document uploads: front + back of an ID, up to 2MB each, plus the
     * bytes multipart/form-data adds for boundaries and part headers. The
     * default is 1MB, which a single phone photo already exceeds.
     *
     * Per-file size and MIME type are enforced again inside the action — this
     * limit only stops an oversized request being parsed at all.
     */
    serverActions: { bodySizeLimit: '8mb' },
  },

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
     * Listing photos live in /public today. When the public CDN bucket lands,
     * add it here:
     *   remotePatterns: [{ protocol: 'https', hostname: 'cdn.rentra.in' }]
     *
     * KYC documents deliberately do NOT go through next/image — they are
     * served as short-lived signed Cloudinary URLs to admins only, never
     * optimised, cached, or made publicly addressable.
     */
  },
};

export default nextConfig;
