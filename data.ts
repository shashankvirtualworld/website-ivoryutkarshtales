import { Story, Package, Album, VideoAlbum } from "./types";

// Import all preset images using ESM so they are compiled/copied by Vite for production/GitHub Pages
import img1780314355808 from "./assets/images/regenerated_image_1780314355808.jpg";
import img1780314364148 from "./assets/images/regenerated_image_1780314364148.jpg";
import img1780314369667 from "./assets/images/regenerated_image_1780314369667.jpg";
import img1780315951259 from "./assets/images/regenerated_image_1780315951259.jpg";
import img1780327624832 from "./assets/images/regenerated_image_1780327624832.jpg";
import img1780327641335 from "./assets/images/regenerated_image_1780327641335.jpg";
import img1780327659964 from "./assets/images/regenerated_image_1780327659964.jpg";
import img1780327670393 from "./assets/images/regenerated_image_1780327670393.jpg";
import img1780327674210 from "./assets/images/regenerated_image_1780327674210.jpg";
import img1780327686916 from "./assets/images/regenerated_image_1780327686916.jpg";

export const IMAGE_MAP: Record<string, string> = {
  "/src/assets/images/regenerated_image_1780314355808.jpg": img1780314355808,
  "/src/assets/images/regenerated_image_1780314364148.jpg": img1780314364148,
  "/src/assets/images/regenerated_image_1780314369667.jpg": img1780314369667,
  "/src/assets/images/regenerated_image_1780315951259.jpg": img1780315951259,
  "/src/assets/images/regenerated_image_1780327624832.jpg": img1780327624832,
  "/src/assets/images/regenerated_image_1780327641335.jpg": img1780327641335,
  "/src/assets/images/regenerated_image_1780327659964.jpg": img1780327659964,
  "/src/assets/images/regenerated_image_1780327670393.jpg": img1780327670393,
  "/src/assets/images/regenerated_image_1780327674210.jpg": img1780327674210,
  "/src/assets/images/regenerated_image_1780327686916.jpg": img1780327686916,
};

export function resolveImage(path: string): string {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:")) {
    return path;
  }
  let key = path;
  if (key.startsWith("./")) {
    key = key.slice(1);
  }
  if (!key.startsWith("/")) {
    key = "/" + key;
  }
  if (IMAGE_MAP[key]) {
    return IMAGE_MAP[key];
  }
  // Try matching via filename suffix or substring if path contains variations (e.g. static prefixing)
  const filename = key.split("/").pop();
  if (filename) {
    const matchedKey = Object.keys(IMAGE_MAP).find(k => {
      if (k.endsWith(filename)) return true;
      const match = filename.match(/(regenerated_image_\d+)/);
      if (match) {
        return k.includes(match[1]);
      }
      return false;
    });
    if (matchedKey) {
      return IMAGE_MAP[matchedKey];
    }
  }
  return path;
}

export const HOME_PORTFOLIO: Story[] = [
  {
    id: "story-shoreline",
    title: "The Shoreline Chapter",
    location: "THAILAND SHORES",
    year: "2024",
    image: img1780314364148,
    photogAlt: "Elegant editorial wedding photograph of a bride on a sandy beach holding up her traditional wedding saree in Thailand",
    tagline: "Symmetry of shorelines, silk, and sacred vows",
    description: "An elegant study of texture and waiting. Staged on a pristine, quiet sandy beach shoreline, the bride wearing a pure silk robe holds a beautifully pleated and embroidered wedding saree against the vast ocean horizon. Capturing a quiet prelude of grace.",
    locationType: "Global",
    mediumType: "Black & White"
  },
  {
    id: "story-1",
    title: "Hotel Taj",
    location: "PATNA",
    year: "2024",
    image: img1780314369667,
    photogAlt: "High-fashion wedding portrait set against historic architecture of Hotel Taj in Patna, bride in flowing ivory gown at twilight",
    tagline: "A majestic modern union of vintage souls",
    description: "Draped in custom archival couture, the bride's journey through Patna's magnificent Hotel Taj was captured in ambient blue-hour twilight. This collection captures the high-fashion grandeur combined with intimate, whispered documentation.",
    locationType: "India",
    mediumType: "Black & White"
  },
  {
    id: "story-2",
    title: "Seafacing Goa",
    location: "GOA",
    year: "2024",
    image: img1780315951259,
    photogAlt: "Stunning cinematic wedding portrait of a couple on a sandy beach in Goa during twilight, groom kissing the bride on her forehead",
    tagline: "A cinematic glide on the warm shores of Goa",
    description: "An isolated embrace on a serene sandy beach in Goa, framed by the gentle tide and warm, golden twilight sky. Highly editorialized framing leveraging elegant negative space.",
    locationType: "India",
    mediumType: "CineFilm"
  },
  {
    id: "story-3",
    title: "An Evening in Florence",
    location: "FLORENCE",
    year: "2023",
    image: img1780327641335,
    photogAlt: "Wedding reception dining in candlelit hall in Florence, featuring chiaroscuro shadows and soft bokeh of couple sharing a laugh",
    tagline: "Unrehearsed chiaroscuro dreams",
    description: "Symphony of candlelit long tables, where centuries-old stone walls bounced the warm, flickering flares over laughter and vintage Brunello wine. A masterclass in documentary wedding filmography.",
    locationType: "Global",
    mediumType: "CineFilm"
  }
];

export const ARCHIVE_STORIES: Story[] = [
  {
    id: "archive-1",
    title: "[Zaker & Shreya ]",
    location: "Phuket, Thailand",
    year: "2024",
    image: img1780314364148,
    photogAlt: "Atmospheric traditional wedding of Zaker and Shreya in Phuket, Thailand",
    tagline: "A tropical high-fashion union on pristine sands",
    description: "Atmospheric, tropical celebration staged along Phuket shores. Quiet glances, windswept draping, and sunset elopement portraits during twilight.",
    isVideo: true,
    locationType: "Global",
    mediumType: "CineFilm"
  },
  {
    id: "archive-2",
    title: "[ Devanshu & Prity ]",
    location: "Goa, Seafacing",
    year: "2024",
    image: img1780327674210,
    photogAlt: "Cinematic sea-facing celebration of Devanshu & Prity in Goa",
    tagline: "A breezy coastal luxury sunset romance",
    description: "An elegant coastal union staged along the glittering sands of Goa. Ocean waves, warm salt air, sunset vows, and intimate candid portraits captured in high-fidelity cinematic styling.",
    locationType: "India",
    mediumType: "CineFilm"
  },
  {
    id: "archive-3",
    title: "[ Hotel Taj ]",
    location: "Patna",
    year: "2024",
    image: img1780327686916,
    photogAlt: "Elegant wedding celebration at Hotel Taj in Patna",
    tagline: "Uncompromising heritage luxury and golden ambiance",
    description: "An extraordinary celebration of culture and family at Hotel Taj in Patna. Traditional customs, royal drapery, brilliant chandeliers, and timeless heirloom portraits captured with gorgeous warm tones.",
    locationType: "India",
    mediumType: "Black & White"
  },
  {
    id: "archive-4",
    title: "The Venetian Glimpse",
    location: "VENICE",
    year: "2023",
    image: img1780314364148,
    photogAlt: "Gondola drifting on Venice canals at twilight, reflecting golden streetlights",
    tagline: "Chiaroscuro ripples and silent architecture",
    description: "A private architectural session through secret water gates in Venice. Leverages chiaroscuro shadows and standard-ratio analog lens modeling to recreate 35mm nostalgic romance.",
    locationType: "Global",
    mediumType: "Black & White"
  },
  {
    id: "archive-5",
    title: "Under Tuscan Shrines",
    location: "TUSCANY",
    year: "2024",
    image: img1780314369667,
    photogAlt: "Linen service table decorated with local wild olives, lit by warm noon sun",
    tagline: "Rustic gold and ancient stones",
    description: "An intimate luncheon in the olive groves of Siena. Realized in true high-fashion colors of soft mints, deep sages, and rich olives under the high Mediterranean sun.",
    locationType: "Global",
    mediumType: "CineFilm"
  }
];

export const FILM_STRIP_PHOTOS = [
  {
    id: "strip-1",
    src: img1780314364148,
    alt: "B&W candid wedding dance laugh",
    title: "The First Waltz",
    subtitle: "Florence, Italy"
  },
  {
    id: "strip-2",
    src: img1780314369667,
    alt: "Groom in dark green suit adjusting cufflinks",
    title: "The Silent Pause",
    subtitle: "Green Room Archives"
  },
  {
    id: "strip-3",
    src: img1780315951259,
    alt: "Editorial white orchids and bridal bouquet on stone masonry",
    title: "Flora & Shrines",
    subtitle: "Organic Accents"
  },
  {
    id: "strip-4",
    src: img1780327641335,
    alt: "Symmetrical palace staircase with hundreds of glowing oils",
    title: "Steps of Chiaroscuro",
    subtitle: "Udaipur Palace"
  }
];

export const INVESTMENT_PACKAGES: Package[] = [
  {
    id: "pkg-1",
    name: "The Archival Legacy",
    investment: "starting from ₹4,50,000",
    intro: "A grand multi-volume visual chronicle for multi-day celebratory events.",
    includes: [
      "Principal Artist Utkarsh & a master-crew of 3 filmmakers & 2 photographers",
      "Full coverage of up to 4 days across global landscapes",
      "Signature archival 25-minute Documentary Feature & 4-minute Cinema Trailer",
      "Two handcrafted Italian museum-grade linen albums (12\" x 15\")",
      "Pre-wedding editorial couple session with custom art direction",
      "Private password-protected digital vault containing all high-res assets"
    ],
    idealFor: "Multi-day heritage celebrations demanding rigorous cinematic art direction."
  },
  {
    id: "pkg-2",
    name: "The Editorial Wedding",
    investment: "starting from ₹2,80,000",
    intro: "A classic high-fashion documentation tailored for the main union chapter.",
    includes: [
      "Utkarsh as Lead Director accompanied by 2 associate documentarians",
      "Full 12-hour day coverage of preparations, ceremony, and banquet",
      "12-minute Editorial Wedding film & 3-minute cinematic summary",
      "One premium linen-bound library album (11\" x 14\") with bespoke gold emboss",
      "500+ masterfully calibrated high-resolution imagery assets"
    ],
    idealFor: "Discerning couples centering raw intimacy, refined couture, and single-day visual prestige."
  },
  {
    id: "pkg-3",
    name: "Sailing & Intimacies",
    investment: "starting from ₹1,90,000",
    intro: "Exclusive editorial portrait sessions and elopements globally.",
    includes: [
      "Utkarsh as sole artist and creative director",
      "Upto 6 hours of high-concept cinematic elopement or pre-wedding documentation",
      "4-minute poetic cinema reel paired with professional score licenses",
      "200+ fine-art catalogued, high-resolution photographs",
      "Full-service location consulting and visual style playbook"
    ],
    idealFor: "Intimate elopements, destination pre-wedding diaries (e.g., Lake Como, Amalfi, Florence)."
  }
];

export const INITIAL_ALBUMS: Album[] = [
  {
    id: "album-1",
    title: "Aman & Swarnim",
    subtitle: "Venue- Patna",
    location: "PATNA",
    year: "2024",
    coverImage: img1780327670393,
    description: "A grand, divine convergence in Patna under the watchful gaze of the monumental Lord Shiva. Aman & Swarnim share vows at night, framed by towering vertical firework sparks, drifting gold confetti, and temple priests raising multi-tiered brass aarti fire lamps.",
    photos: []
  },
  {
    id: "album-2",
    title: "Devanshu & Prity",
    subtitle: "Venue- Goa",
    location: "GOA",
    year: "2024",
    coverImage: img1780327674210,
    description: "An authentic, leisurely gathering in Goa, shaded by palm trees and coastal horizons. Romantic exchange on the beach side under sunset skies.",
    photos: []
  },
  {
    id: "album-3",
    title: "Vedant & Gauri",
    subtitle: "Venue- Hotel Taj, Patna",
    location: "PATNA",
    year: "2023",
    coverImage: img1780327686916,
    description: "Luxury vintage celebration inside Patna's magnificent Hotel Taj halls. Dynamic range, ambient lights, and private bridal documentation.",
    photos: []
  },
  {
    id: "album-4",
    title: "Zaver & Shreya",
    subtitle: "Venue- Thailand, Phuket",
    location: "PHUKET",
    year: "2024",
    coverImage: img1780314364148,
    description: "Atmospheric, tropical celebration staged along Phuket shores. Clear skies, windswept drapery, and sunset elopement portraits.",
    photos: []
  },
  {
    id: "album-5",
    title: "Himanshu & Shivani",
    subtitle: "Venue- Rajgir",
    location: "RAJGIR",
    year: "2023",
    coverImage: img1780314369667,
    description: "A rustic, heritage celebration set in private historic properties of Rajgir. Deep tones, raw textures, and silent natural look.",
    photos: []
  },
  {
    id: "album-6",
    title: "Arnav & Shalini",
    subtitle: "Venue- Mumbai",
    location: "MUMBAI",
    year: "2024",
    coverImage: img1780315951259,
    description: "An editorial grand ballroom banquet in Mumbai, capturing cinematic light trails and high-fashion wedding couture.",
    photos: []
  }
];

export const INITIAL_VIDEO_ALBUMS: VideoAlbum[] = [
  {
    id: "video-1",
    title: "Aman & Swarnim",
    subtitle: "Venue- Patna",
    location: "PATNA",
    year: "2024",
    coverImage: "",
    description: "An authentic, deep-focus documentary. Sandstone structures, traditional acoustic echoes, and grand celebratory visual poems.",
    videos: [
      "https://www.youtube.com/embed/fA8H-vOfUks",
      "https://www.youtube.com/embed/A8g8_9h94uE"
    ]
  },
  {
    id: "video-2",
    title: "Devanshu & Prity",
    subtitle: "Venue- Goa",
    location: "GOA",
    year: "2024",
    coverImage: "",
    description: "Slow-motion cinema along the Goan shorelines, capturing intimate whispers and beautiful golden tides.",
    videos: [
      "https://www.youtube.com/embed/5F46A1rL_bA",
      "https://www.youtube.com/embed/Q0A8H7_k-n8"
    ]
  },
  {
    id: "video-3",
    title: "Vedant & Gauri",
    subtitle: "Venue- Hotel Taj, Patna",
    location: "PATNA",
    year: "2023",
    coverImage: "",
    description: "An intimate, luxury vintage wedding trailer capturing Patna's finest heritage indoor ambient designs.",
    videos: [
      "https://www.youtube.com/embed/2_H82j5184A"
    ]
  },
  {
    id: "video-4",
    title: "Zaver & Shreya",
    subtitle: "Venue- Thailand, Phuket",
    location: "PHUKET",
    year: "2024",
    coverImage: "",
    description: "Poetic ocean waves and cinematic drone tracking along isolated cliffs during twilight.",
    videos: [
      "https://www.youtube.com/embed/H0d16gW3mEs"
    ]
  },
  {
    id: "video-5",
    title: "Himanshu & Shivani",
    subtitle: "Venue- Rajgir",
    location: "RAJGIR",
    year: "2024",
    coverImage: "",
    description: "Dynamic colors, ancient temple stone settings, and deep cultural documentation.",
    videos: [
      "https://www.youtube.com/embed/fA8H-vOfUks"
    ]
  },
  {
    id: "video-6",
    title: "Arnav & Shalini",
    subtitle: "Venue- Mumbai",
    location: "MUMBAI",
    year: "2023",
    coverImage: "",
    description: "A high-fashion urban romance in Mumbai, rendering beautiful handheld vintage analog film textures.",
    videos: [
      "https://www.youtube.com/embed/8-W7zR68G58"
    ]
  }
];
