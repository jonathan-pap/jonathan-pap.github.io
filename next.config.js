/**
// * @type {import('next').NextConfig}
 */

//const nextConfig = {
//  reactStrictMode: true,
//};

//module.exports = nextConfig;
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable static export
  output: 'export',
  
  // GitHub Pages does not support image optimization
  images: {
    unoptimized: true,
  },
  
  // Specify the base path if your project is not at the root of the domain
  basePath: '/jonathan-pap.github.io',  // Replace with your repository name
  assetPrefix: '/jonathan-pap.github.io/',  // Ensure assets are correctly linked
};

module.exports = nextConfig;
