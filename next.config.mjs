// Deployed as a GitHub Pages *project* site (github.com/wongjessica/mahjongisfun),
// which GitHub serves at wongjessica.github.io/mahjongisfun -- so production
// builds need every asset URL prefixed with /mahjongisfun. Local dev stays
// unprefixed (GITHUB_PAGES is only set by the deploy workflow) so
// `npm run dev` keeps working at plain localhost:3000.
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/mahjongisfun";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  // next/image with unoptimized:true does NOT auto-prefix the src we pass
  // it with basePath (that only happens for Next's own internally-resolved
  // assets, e.g. the favicon), so components read this to prefix manual
  // asset URLs themselves -- see tileImageSrc() in TileFace.tsx.
  env: { NEXT_PUBLIC_BASE_PATH: isGithubPagesBuild ? repoBasePath : "" },
  ...(isGithubPagesBuild ? { basePath: repoBasePath, assetPrefix: `${repoBasePath}/` } : {}),
};

export default nextConfig;
