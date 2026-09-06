import type { CanvasPreset } from "@/types/editor";

/** Every canvas dimension preset, grouped for the picker. */
export const CANVAS_PRESETS: CanvasPreset[] = [
  // Social — square & portrait posts
  { id: "ig-post", label: "Instagram Post", group: "Social posts", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram Portrait", group: "Social posts", width: 1080, height: 1350 },
  { id: "fb-post", label: "Facebook Post", group: "Social posts", width: 1200, height: 630 },
  { id: "x-post", label: "X / Twitter Post", group: "Social posts", width: 1600, height: 900 },
  { id: "linkedin-post", label: "LinkedIn Post", group: "Social posts", width: 1200, height: 1200 },
  { id: "pinterest-pin", label: "Pinterest Pin", group: "Social posts", width: 1000, height: 1500 },

  // Stories & reels — vertical 9:16 family
  { id: "story", label: "Story / Reel 9:16", group: "Stories & reels", width: 1080, height: 1920 },
  { id: "tiktok", label: "TikTok Video", group: "Stories & reels", width: 1080, height: 1920 },
  { id: "shorts", label: "YouTube Shorts", group: "Stories & reels", width: 1080, height: 1920 },
  { id: "snapchat", label: "Snapchat Story", group: "Stories & reels", width: 1080, height: 1920 },

  // Covers & headers
  { id: "x-header", label: "X / Twitter Header", group: "Covers & headers", width: 1500, height: 500 },
  { id: "fb-cover", label: "Facebook Cover", group: "Covers & headers", width: 820, height: 312 },
  { id: "linkedin-banner", label: "LinkedIn Banner", group: "Covers & headers", width: 1584, height: 396 },
  { id: "youtube-banner", label: "YouTube Channel Art", group: "Covers & headers", width: 2560, height: 1440 },

  // Web & marketing
  { id: "og-image", label: "Open Graph Image", group: "Web & marketing", width: 1200, height: 630 },
  { id: "youtube-thumb", label: "YouTube Thumbnail", group: "Web & marketing", width: 1280, height: 720 },
  { id: "widescreen", label: "Widescreen 16:9", group: "Web & marketing", width: 1920, height: 1080 },
  { id: "product-hunt", label: "Product Hunt Gallery", group: "Web & marketing", width: 1270, height: 760 },
  { id: "email-header", label: "Email Header", group: "Web & marketing", width: 600, height: 200 },

  // App store & devices
  { id: "app-store-iphone", label: "App Store — iPhone 6.7\"", group: "App store & devices", width: 1290, height: 2796 },
  { id: "app-store-ipad", label: "App Store — iPad 12.9\"", group: "App store & devices", width: 2048, height: 2732 },
  { id: "play-store-feature", label: "Play Store Feature Graphic", group: "App store & devices", width: 1024, height: 500 },
  { id: "macbook-wallpaper", label: "Desktop Wallpaper", group: "App store & devices", width: 2560, height: 1600 },

  // Square & print
  { id: "square", label: "Square 1:1", group: "Square & print", width: 1200, height: 1200 },
  { id: "a4-print", label: "A4 Print (300dpi)", group: "Square & print", width: 2480, height: 3508 },
  { id: "a3-poster", label: "A3 Poster (300dpi)", group: "Square & print", width: 3508, height: 4961 },
  { id: "letter-print", label: "US Letter (300dpi)", group: "Square & print", width: 2550, height: 3300 },
  { id: "business-card", label: "Business Card (300dpi)", group: "Square & print", width: 1050, height: 600 },
  { id: "postcard", label: "Postcard (300dpi)", group: "Square & print", width: 1800, height: 1200 },

  // More social — extra formats
  { id: "ig-reel-cover", label: "Instagram Reel Cover", group: "Social posts", width: 1080, height: 1920 },
  { id: "threads-post", label: "Threads Post", group: "Social posts", width: 1080, height: 1350 },
  { id: "reddit-banner", label: "Reddit Banner", group: "Social posts", width: 1920, height: 384 },
  { id: "whatsapp-status", label: "WhatsApp Status", group: "Social posts", width: 1080, height: 1920 },
  { id: "discord-embed", label: "Discord Embed", group: "Social posts", width: 1200, height: 675 },

  // Stories & reels — more
  { id: "ig-story-highlight", label: "IG Story Highlight Icon", group: "Stories & reels", width: 500, height: 500 },
  { id: "reels-teaser", label: "Reels Teaser 4:5", group: "Stories & reels", width: 1080, height: 1350 },

  // Covers & headers — more
  { id: "discord-banner", label: "Discord Server Banner", group: "Covers & headers", width: 960, height: 540 },
  { id: "twitch-banner", label: "Twitch Profile Banner", group: "Covers & headers", width: 1200, height: 480 },
  { id: "twitch-panel", label: "Twitch Panel", group: "Covers & headers", width: 320, height: 100 },
  { id: "medium-cover", label: "Medium Cover Image", group: "Covers & headers", width: 1500, height: 750 },
  { id: "notion-cover", label: "Notion Page Cover", group: "Covers & headers", width: 1500, height: 600 },
  { id: "substack-cover", label: "Substack Cover", group: "Covers & headers", width: 1456, height: 816 },

  // Web & marketing — more
  { id: "github-social", label: "GitHub Social Preview", group: "Web & marketing", width: 1280, height: 640 },
  { id: "twitter-card", label: "Twitter Card (Summary Large)", group: "Web & marketing", width: 1200, height: 675 },
  { id: "blog-banner", label: "Blog Banner", group: "Web & marketing", width: 1600, height: 840 },
  { id: "web-hero", label: "Website Hero", group: "Web & marketing", width: 1920, height: 960 },
  { id: "google-ads-leaderboard", label: "Google Ads Leaderboard", group: "Web & marketing", width: 728, height: 90 },
  { id: "google-ads-rectangle", label: "Google Ads Medium Rectangle", group: "Web & marketing", width: 300, height: 250 },

  // App store & devices — more
  { id: "app-icon", label: "App Icon (iOS/Android)", group: "App store & devices", width: 1024, height: 1024 },
  { id: "favicon", label: "Favicon (large)", group: "App store & devices", width: 512, height: 512 },
  { id: "app-store-iphone-se", label: "App Store — iPhone 5.5\"", group: "App store & devices", width: 1242, height: 2208 },
  { id: "macbook-screenshot", label: "MacBook Screenshot 16:10", group: "App store & devices", width: 2880, height: 1800 },
  { id: "chrome-web-store", label: "Chrome Web Store Tile", group: "App store & devices", width: 1400, height: 560 },

  // Video & streaming
  { id: "youtube-hd", label: "YouTube Video 1080p", group: "Video & streaming", width: 1920, height: 1080 },
  { id: "youtube-4k", label: "YouTube Video 4K", group: "Video & streaming", width: 3840, height: 2160 },
  { id: "vertical-video", label: "Vertical Video 9:16", group: "Video & streaming", width: 1080, height: 1920 },
  { id: "square-video", label: "Square Video 1:1", group: "Video & streaming", width: 1080, height: 1080 },
  { id: "podcast-cover", label: "Podcast Cover Art", group: "Video & streaming", width: 3000, height: 3000 },

  // E-commerce
  { id: "etsy-listing", label: "Etsy Listing Photo", group: "E-commerce", width: 2000, height: 2000 },
  { id: "etsy-shop-banner", label: "Etsy Shop Banner", group: "E-commerce", width: 1200, height: 300 },
  { id: "amazon-listing", label: "Amazon Product Image", group: "E-commerce", width: 2000, height: 2000 },
  { id: "shopify-product", label: "Shopify Product Image", group: "E-commerce", width: 2048, height: 2048 },
];

export const CANVAS_PRESET_GROUPS: string[] = Array.from(
  new Set(CANVAS_PRESETS.map((p) => p.group))
);

export const GRADIENT_PALETTES: { id: string; label: string; colors: string[] }[] = [
  { id: "sunset", label: "Sunset", colors: ["#ff9a56", "#ff6b95", "#845ec2"] },
  { id: "ocean", label: "Ocean", colors: ["#0f2027", "#203a43", "#2c5364"] },
  { id: "candy", label: "Candy", colors: ["#f093fb", "#f5576c"] },
  { id: "forest", label: "Forest", colors: ["#134e5e", "#71b280"] },
  { id: "midnight", label: "Midnight", colors: ["#0f0c29", "#302b63", "#24243e"] },
  { id: "peach", label: "Peach", colors: ["#ffecd2", "#fcb69f"] },
  { id: "aurora", label: "Aurora", colors: ["#00c6ff", "#0072ff", "#7b2ff7"] },
  { id: "mono", label: "Mono", colors: ["#232526", "#414345"] },
  { id: "flamingo", label: "Flamingo", colors: ["#ff6a88", "#ff99ac"] },
  { id: "lush", label: "Lush", colors: ["#56ab2f", "#a8e063"] },
  { id: "cosmic", label: "Cosmic", colors: ["#ff00cc", "#333399"] },
  { id: "citrus", label: "Citrus", colors: ["#f7971e", "#ffd200"] },
  { id: "grape", label: "Grape", colors: ["#8e2de2", "#4a00e0"] },
  { id: "mint", label: "Mint", colors: ["#00b09b", "#96c93d"] },
  { id: "royal", label: "Royal", colors: ["#141e30", "#243b55"] },
  { id: "blush", label: "Blush", colors: ["#ee9ca7", "#ffdde1"] },
  { id: "ember", label: "Ember", colors: ["#780206", "#061161"] },
  { id: "lagoon", label: "Lagoon", colors: ["#2bc0e4", "#eaecc6"] },
  { id: "dusk", label: "Dusk", colors: ["#360033", "#0b8793"] },
  { id: "gold", label: "Gold Rush", colors: ["#ffd700", "#ff8c00"] },
  { id: "steel", label: "Steel", colors: ["#3a6186", "#89253e"] },
  { id: "orchid", label: "Orchid", colors: ["#da22ff", "#9733ee"] },
  { id: "pastel-sky", label: "Pastel Sky", colors: ["#a1c4fd", "#c2e9fb"] },
  { id: "noir", label: "Noir", colors: ["#000000", "#434343"] },
];
