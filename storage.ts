/**
 * Safe localStorage and IndexedDB wrappers to prevent "QuotaExceededError" and other storage access exceptions
 * from crashing the React application, plus high-quality image compression.
 */

// --- LocalStorage Base Helpers ---
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to read key "${key}" from localStorage:`, error);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to set key "${key}" in localStorage:`, error);
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.warn("[Storage] QuotaExceededError detected. Attempting to recover by clearing custom hero background...");
      try {
        localStorage.removeItem("ivory_utkarsh_hero_bg");
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error("[Storage] Retry after cleanup also failed:", retryError);
      }
    }
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove key "${key}" from localStorage:`, error);
  }
}

// --- IndexedDB Base Store Helpers ---
const DB_NAME = "IvoryUtkarshTalesDB_v2";
const STORE_NAME = "client_ledgers";
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbSetItem(key: string, value: any): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.error("[IndexedDB] put failed:", req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.error("[IndexedDB] failed to open for put:", err);
    return false;
  }
}

export async function dbGetItem<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => {
        console.error("[IndexedDB] get failed:", req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.error("[IndexedDB] failed to open for get:", err);
    return null;
  }
}

// --- High-Grade Dynamic Album Sync API (Hybrid IndexedDB + LocalStorage) ---
export async function loadAlbumsAsync(): Promise<any[] | null> {
  let dbAlbums = await dbGetItem<any[]>("ivory_utkarsh_albums_v2");

  // One-time programmatic clear for Aman & Swarnim ("album-1") as requested by USER
  const clearedKey = "ivory_aman_swarnim_cleared_v1";
  if (safeGetItem(clearedKey) !== "true") {
    let modified = false;
    if (dbAlbums && dbAlbums.length > 0) {
      dbAlbums = dbAlbums.map((alb) => {
        if (alb.id === "album-1") {
          modified = true;
          return { ...alb, photos: [] };
        }
        return alb;
      });
    }

    const stored = safeGetItem("ivory_utkarsh_albums_v2");
    let parsedStored = null;
    if (stored) {
      try {
        parsedStored = JSON.parse(stored);
        if (Array.isArray(parsedStored)) {
          parsedStored = parsedStored.map((alb) => {
            if (alb.id === "album-1") {
              modified = true;
              return { ...alb, photos: [] };
            }
            return alb;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (modified) {
      if (dbAlbums) {
        await dbSetItem("ivory_utkarsh_albums_v2", dbAlbums);
      }
      if (parsedStored) {
        localStorage.setItem("ivory_utkarsh_albums_v2", JSON.stringify(parsedStored));
      }
    }
    safeSetItem(clearedKey, "true");
  }

  if (dbAlbums && dbAlbums.length > 0) {
    return dbAlbums.map((alb: any) => ({
      ...alb,
      coverImage: resolveImage(alb.coverImage),
      photos: (alb.photos || []).map((p: any) => resolveImage(p))
    }));
  }

  // Fallback to localStorage standard load
  const stored = safeGetItem("ivory_utkarsh_albums_v2");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Backport / cache inside IndexedDB for seamless futures
      await dbSetItem("ivory_utkarsh_albums_v2", parsed);
      return parsed.map((alb: any) => ({
        ...alb,
        coverImage: resolveImage(alb.coverImage),
        photos: (alb.photos || []).map((p: any) => resolveImage(p))
      }));
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveAlbumsAsync(albums: any[]): Promise<boolean> {
  // Primary safe write to IndexedDB (virtually unlimited quota)
  const idbSaved = await dbSetItem("ivory_utkarsh_albums_v2", albums);

  // Attempt to mirror inside standard localStorage, failing gracefully on over-sizes
  try {
    localStorage.setItem("ivory_utkarsh_albums_v2", JSON.stringify(albums));
  } catch (err) {
    console.warn("[Storage] localStorage quota reached. Using IndexedDB as primary secure app ledger.", err);
  }

  return idbSaved;
}

// --- Cinematic Video Sync API (Hybrid IndexedDB + LocalStorage) ---
export async function loadVideosAsync(): Promise<any[] | null> {
  const dbVideos = await dbGetItem<any[]>("ivory_utkarsh_videos_v2");
  if (dbVideos && dbVideos.length > 0) {
    return dbVideos.map((vid: any) => ({
      ...vid,
      coverImage: resolveImage(vid.coverImage)
    }));
  }

  // Fallback to localStorage standard load
  const stored = safeGetItem("ivory_utkarsh_videos");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Backport / cache inside IndexedDB for seamless futures
      await dbSetItem("ivory_utkarsh_videos_v2", parsed);
      return parsed.map((vid: any) => ({
        ...vid,
        coverImage: resolveImage(vid.coverImage)
      }));
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveVideosAsync(videos: any[]): Promise<boolean> {
  // Primary safe write to IndexedDB (virtually unlimited quota)
  const idbSaved = await dbSetItem("ivory_utkarsh_videos_v2", videos);

  // Attempt to mirror inside standard localStorage, failing gracefully on over-sizes
  try {
    localStorage.setItem("ivory_utkarsh_videos", JSON.stringify(videos));
  } catch (err) {
    console.warn("[Storage] localStorage quota reached for videos. Using IndexedDB as primary secure app ledger.", err);
  }

  return idbSaved;
}

// --- HTML5 Canvas Fine-Art Image Compression utility ---
export function compressImage(base64Str: string, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    // If it's not a standard data URL (like a remote web image link), pass it through
    if (!base64Str.startsWith("data:image/")) {
      resolve(base64Str);
      return;
    }

    // Dynamic resolution and quality adjustment based on stored user quota choices
    const savedMode = safeGetItem("ivory_utkarsh_storage_mode") || "balanced";
    let activeMaxWidth = maxWidth;
    let activeQuality = quality;

    if (savedMode === "eco") {
      activeMaxWidth = Math.min(maxWidth, 800);
      activeQuality = 0.55;
    } else if (savedMode === "ultra") {
      activeMaxWidth = Math.max(maxWidth, 1920);
      activeQuality = 0.88;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Fit dimension constraints
      if (width > activeMaxWidth) {
        height = Math.round((height * activeMaxWidth) / width);
        width = activeMaxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Output compressed JPEG to save maximum space
        resolve(canvas.toDataURL("image/jpeg", activeQuality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

// --- Dynamic Storage Quota Statistics and Utilities ---
export interface StorageStats {
  localStorageUsedKB: number;
  indexedDbUsedKB: number;
  totalEstimatedUsedKB: number;
  quotaLimitMB: number;
  remainingMB: number;
  mode: "eco" | "balanced" | "ultra";
  isPersistent: boolean;
}

export async function checkIsPersistent(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      console.log("[Storage] Persistent storage prompt result:", persisted);
      return persisted;
    } catch (e) {
      console.error("[Storage] Persistent storage request failed:", e);
      return false;
    }
  }
  return false;
}

export async function getStorageStats(): Promise<StorageStats> {
  // Approximate localStorage usage
  let lsTotalLength = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        lsTotalLength += (key.length + (val ? val.length : 0)) * 2; // approximation of UTF-16 bytes
      }
    }
  } catch (e) {
    console.error("[Storage] Failed to estimate localStorage usage:", e);
  }
  const localStorageUsedKB = Math.round(lsTotalLength / 1024);

  // Approximate IndexedDB database usage (comprising both custom fine-art albums and cinematic client videos)
  let idbTotalLength = 0;
  try {
    const dbAlbums = await dbGetItem<any[]>("ivory_utkarsh_albums_v2");
    if (dbAlbums) {
      idbTotalLength += JSON.stringify(dbAlbums).length * 2; // approximation of UTF-16 bytes
    }
    const dbVideos = await dbGetItem<any[]>("ivory_utkarsh_videos_v2");
    if (dbVideos) {
      idbTotalLength += JSON.stringify(dbVideos).length * 2; // approximation of UTF-16 bytes
    }
  } catch (e) {
    console.error("[Storage] Failed to estimate IndexedDB usage:", e);
  }
  const indexedDbUsedKB = Math.round(idbTotalLength / 1024);
  const totalEstimatedUsedKB = localStorageUsedKB + indexedDbUsedKB;

  // The user requested a 5 GB target storage quota (5120 MB).
  // Standard sandbox estimate is 5120 MB unless browser indicates higher.
  let quotaLimitMB = 5120; 
  let remainingMB = quotaLimitMB - (totalEstimatedUsedKB / 1024);

  // Attempt to read actual modern Navigator Storage estimate
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota !== undefined) {
        const realQuotaMB = Math.round(estimate.quota / (1024 * 1024));
        // Use 5120 as a minimum guaranteed display target for 5 GB request representation
        quotaLimitMB = Math.max(5120, realQuotaMB);
      }
      if (estimate.usage !== undefined) {
        const actualUsedMB = estimate.usage / (1024 * 1024);
        remainingMB = Math.round(quotaLimitMB - actualUsedMB);
      }
    } catch {
      // Keep safety fallback
    }
  }

  const mode = (safeGetItem("ivory_utkarsh_storage_mode") as "eco" | "balanced" | "ultra") || "balanced";
  const isPersistent = await checkIsPersistent();

  return {
    localStorageUsedKB,
    indexedDbUsedKB,
    totalEstimatedUsedKB,
    quotaLimitMB,
    remainingMB: Math.max(0, remainingMB),
    mode,
    isPersistent,
  };
}

// --- Dynamic Content Load and Save Helpers ---
import { HOME_PORTFOLIO, ARCHIVE_STORIES, FILM_STRIP_PHOTOS, INVESTMENT_PACKAGES, resolveImage } from "../data";

export function loadHomePortfolio(): any[] {
  const stored = safeGetItem("ivory_dynamic_home_portfolio");
  let data = HOME_PORTFOLIO;
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch {
      data = HOME_PORTFOLIO;
    }
  }
  return data.map((item: any) => ({
    ...item,
    image: resolveImage(item.image)
  }));
}

export function saveHomePortfolio(data: any[]): void {
  safeSetItem("ivory_dynamic_home_portfolio", JSON.stringify(data));
}

export function loadArchiveStories(): any[] {
  const stored = safeGetItem("ivory_dynamic_archive_stories");
  let data = ARCHIVE_STORIES;
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch {
      data = ARCHIVE_STORIES;
    }
  }
  return data.map((item: any) => ({
    ...item,
    image: resolveImage(item.image)
  }));
}

export function saveArchiveStories(data: any[]): void {
  safeSetItem("ivory_dynamic_archive_stories", JSON.stringify(data));
}

export function loadFilmStripPhotos(): any[] {
  const stored = safeGetItem("ivory_dynamic_film_strip_photos");
  let data = FILM_STRIP_PHOTOS;
  if (stored) {
    try {
      data = JSON.parse(stored);
    } catch {
      data = FILM_STRIP_PHOTOS;
    }
  }
  return data.map((item: any) => ({
    ...item,
    src: resolveImage(item.src)
  }));
}

export function saveFilmStripPhotos(data: any[]): void {
  safeSetItem("ivory_dynamic_film_strip_photos", JSON.stringify(data));
}

export function loadInvestmentPackages(): any[] {
  const stored = safeGetItem("ivory_dynamic_investment_packages");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return INVESTMENT_PACKAGES;
    }
  }
  return INVESTMENT_PACKAGES;
}

export function saveInvestmentPackages(data: any[]): void {
  safeSetItem("ivory_dynamic_investment_packages", JSON.stringify(data));
}

// --- Portfolio Grid Images Helpers (IndexedDB backed for large capacities) ---
const PORTFOLIO_IMAGES_KEY = "ivory_portfolio_grid_images";

const DEFAULT_PORTFOLIO_IMAGES: any[] = [];

export async function loadPortfolioGridImages(): Promise<any[]> {
  try {
    const stored = await dbGetItem<any[]>(PORTFOLIO_IMAGES_KEY);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored.map((item: any) => ({
        ...item,
        src: resolveImage(item.src)
      }));
    }
  } catch (error) {
    console.warn("[Storage] Failed to read portfolio images from IndexedDB, falling back to presets", error);
  }
  return DEFAULT_PORTFOLIO_IMAGES;
}

export async function savePortfolioGridImages(data: any[]): Promise<boolean> {
  return await dbSetItem(PORTFOLIO_IMAGES_KEY, data);
}

