import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Play, Trash2, X, Film, CheckCircle2, ArrowRight, Upload, Database, Sliders, AlertCircle, Sparkles, Zap, Gauge, RefreshCw, Sliders as SlidersIcon, ChevronLeft, ChevronRight, Tv, ExternalLink } from "lucide-react";
import { INITIAL_VIDEO_ALBUMS, resolveImage } from "../data";
import { VideoAlbum } from "../types";
import { loadVideosAsync, saveVideosAsync, safeGetItem, safeSetItem, compressImage, getStorageStats, StorageStats, requestPersistentStorage } from "../utils/storage";

export default function VideosView() {
  const [videoAlbums, setVideoAlbums] = useState<VideoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<VideoAlbum | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoUploadMode, setVideoUploadMode] = useState<"url" | "laptop">("url");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isVideoDraggingOver, setIsVideoDraggingOver] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // --- Dedicated Immersive Web-embedded Cinema Theater States ---
  const [activeTheaterVideo, setActiveTheaterVideo] = useState<{
    url: string;
    albumTitle: string;
    albumId: string;
    index: number;
    totalVideos: number;
  } | null>(null);

  // --- Storage Quota state inside Videos page ---
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isStoragePanelOpen, setIsStoragePanelOpen] = useState(false);

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  // --- Dynamic Video Album Creation Form States ---
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumSubtitle, setNewAlbumSubtitle] = useState("");
  const [newAlbumLocation, setNewAlbumLocation] = useState("");
  const [newAlbumYear, setNewAlbumYear] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [newAlbumCoverOption, setNewAlbumCoverOption] = useState<"upload" | "url">("upload");
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState("");
  const [newAlbumCoverRaw, setNewAlbumCoverRaw] = useState("");

  // Initialize video albums from hybrid IndexedDB disk database
  const initVideoAlbums = async () => {
    const stored = await loadVideosAsync();
    let finalVideos = INITIAL_VIDEO_ALBUMS;

    if (stored && stored.length > 0) {
      try {
        const initialMap = new Map(INITIAL_VIDEO_ALBUMS.map(v => [v.id, v]));
        const merged: VideoAlbum[] = [];

        stored.forEach((storedAlb) => {
          const defAlb = initialMap.get(storedAlb.id);
          if (defAlb) {
            merged.push({
              ...defAlb,
              coverImage: storedAlb.coverImage || defAlb.coverImage,
              videos: storedAlb.videos || defAlb.videos,
            });
          } else {
            // Custom user-created video album
            merged.push(storedAlb as VideoAlbum);
          }
        });

        INITIAL_VIDEO_ALBUMS.forEach((defAlb) => {
          if (!merged.some(m => m.id === defAlb.id)) {
            merged.push(defAlb);
          }
        });

        finalVideos = merged;
      } catch {
        finalVideos = INITIAL_VIDEO_ALBUMS;
      }
    }
    setVideoAlbums(finalVideos);
    await saveVideosAsync(finalVideos);
    await fetchStorageStats();
  };

  useEffect(() => {
    initVideoAlbums();
  }, []);

  // Update storage dashboard when video list changes
  useEffect(() => {
    fetchStorageStats();
  }, [videoAlbums]);

  // Keyboard navigation for Cinema Theater MODE (Escape, Left, Right Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // ignore when typing in fields
      }
      if (e.key === "Escape") {
        setActiveTheaterVideo(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevTheaterVideo();
      } else if (e.key === "ArrowRight") {
        handleNextTheaterVideo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTheaterVideo, videoAlbums]);

  // Sync state to selected album detailed view when updated
  const activeAlbum = selectedAlbum 
    ? videoAlbums.find(v => v.id === selectedAlbum.id) || selectedAlbum
    : null;

  // Persist updated video albums array to standard local sandbox
  const saveVideoAlbums = async (updatedAlbums: VideoAlbum[]) => {
    setVideoAlbums(updatedAlbums);
    await saveVideosAsync(updatedAlbums);
  };

  // Submit handler for dynamic custom video album creation
  const handleCreateVideoAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;

    let coverImage = "";
    if (newAlbumCoverOption === "upload") {
      coverImage = newAlbumCoverRaw || "/src/assets/images/regenerated_image_1780314364148.jpg"; // fallback
    } else {
      coverImage = newAlbumCoverUrl.trim() || "/src/assets/images/regenerated_image_1780314364148.jpg"; // fallback
    }

    const newAlbum: VideoAlbum = {
      id: "video-custom-" + Date.now(),
      title: newAlbumTitle.trim(),
      subtitle: newAlbumSubtitle.trim() || "Private Cinematic Reel",
      location: newAlbumLocation.toUpperCase().trim() || "STUDIO",
      year: newAlbumYear.trim() || String(new Date().getFullYear()),
      coverImage,
      description: newAlbumDescription.trim() || "Bespoke handcrafted documentary feature ledger filled with premium cinematics.",
      videos: []
    };

    const updated = [...videoAlbums, newAlbum];
    await saveVideoAlbums(updated);

    // Reset fields
    setNewAlbumTitle("");
    setNewAlbumSubtitle("");
    setNewAlbumLocation("");
    setNewAlbumYear("");
    setNewAlbumDescription("");
    setNewAlbumCoverUrl("");
    setNewAlbumCoverRaw("");
    setIsCreatingAlbum(false);

    triggerSuccessToast(`Custom video album "${newAlbum.title}" created successfully!`);
  };

  // Dynamic deletion of custom video albums
  const handleDeleteCustomVideoAlbum = async (id: string) => {
    if (confirm("Are you sure you want to completely delete this custom client video album? This action cannot be undone.")) {
      const updated = videoAlbums.filter(a => a.id !== id);
      await saveVideoAlbums(updated);
      setSelectedAlbum(null);
      triggerSuccessToast("Custom video album deleted from archive.");
    }
  };

  const handleModalCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      if (base64String) {
        const compressed = await compressImage(base64String, 800, 0.7);
        setNewAlbumCoverRaw(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  // Extract YouTube ID if possible
  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    try {
      const trimmed = url.trim();
      
      // Handle standard URL parses
      if (trimmed.includes("youtu.be/")) {
        const parts = trimmed.split("youtu.be/");
        if (parts[1]) return parts[1].split(/[?#&]/)[0];
      }
      
      if (trimmed.includes("/shorts/")) {
        const parts = trimmed.split("/shorts/");
        if (parts[1]) return parts[1].split(/[?#&]/)[0];
      }

      if (trimmed.includes("/live/")) {
        const parts = trimmed.split("/live/");
        if (parts[1]) return parts[1].split(/[?#&]/)[0];
      }

      if (trimmed.includes("/embed/")) {
        const parts = trimmed.split("/embed/");
        if (parts[1]) return parts[1].split(/[?#&]/)[0];
      }

      const watchRegex = /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^?&\s/]+)/;
      const match = trimmed.match(watchRegex);
      if (match && match[1]) {
        return match[1];
      }

      const urlObj = new URL(trimmed);
      if (urlObj.hostname.includes("youtube.com")) {
        const videoId = urlObj.searchParams.get("v");
        if (videoId) return videoId;
      }
    } catch (e) {
      // fallback to basic matching
    }
    return null;
  };

  // Convert various YouTube links to perfect embedded player URLs
  const getEmbedUrl = (url: string) => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url; // fallback to direct link if not matching
  };

  // Add a video link dynamically
  const handleAddVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim() || !activeAlbum) return;

    const formattedUrl = getEmbedUrl(videoUrlInput.trim());

    const updated = videoAlbums.map(alb => {
      if (alb.id === activeAlbum.id) {
        return {
          ...alb,
          videos: [...alb.videos, formattedUrl]
        };
      }
      return alb;
    });

    saveVideoAlbums(updated);
    setVideoUrlInput("");
    triggerSuccessToast("Cinematic story link successfully logged to video archives!");
  };

  // Directly upload and process local videos from laptop's storage
  const handleLaptopVideoUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !activeAlbum) return;
    const file = files[0];
    
    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file (e.g. MP4, WebM, MOV, OGG).");
      return;
    }

    // Inform user of recommended size but allow everything
    if (file.size > 50 * 1024 * 1024) {
      if (!confirm(`The selected video file is large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Large local videos may take longer to load and play. We recommend using compressed videos under 40-50MB for optimal browser performance. Do you want to continue?`)) {
        return;
      }
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setVideoUploadProgress(percent);
      }
    };

    reader.onload = async () => {
      const base64Str = reader.result as string;
      if (base64Str) {
        const updated = videoAlbums.map(alb => {
          if (alb.id === activeAlbum.id) {
            return {
              ...alb,
              videos: [...alb.videos, base64Str]
            };
          }
          return alb;
        });

        await saveVideoAlbums(updated);
        setIsUploadingVideo(false);
        setVideoUploadProgress(0);
        triggerSuccessToast(`Successfully optimized & uploaded "${file.name}" to cinematic reel!`);
      }
    };

    reader.onerror = () => {
      setIsUploadingVideo(false);
      alert("Failed to read the video file. Please check if the file is corrupted.");
    };

    reader.readAsDataURL(file);
  };

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoDraggingOver(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoDraggingOver(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoDraggingOver(false);
    
    if (isUploadingVideo) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLaptopVideoUpload(e.dataTransfer.files);
    }
  };

  // Delete a video from the album
  const handleDeleteVideo = (videoIndex: number) => {
    if (!activeAlbum) return;
    if (confirm("Are you sure you want to dismiss this cinematic sequence from the archive?")) {
      const updated = videoAlbums.map(alb => {
        if (alb.id === activeAlbum.id) {
          const filteredVideos = alb.videos.filter((_, idx) => idx !== videoIndex);
          return {
            ...alb,
            videos: filteredVideos
          };
        }
        return alb;
      });
      saveVideoAlbums(updated);
      triggerSuccessToast("Cinematic sequence removed from archive.");
    }
  };

  const triggerSuccessToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Theater Navigation: Previous video in the current album
  const handlePrevTheaterVideo = () => {
    if (!activeTheaterVideo) return;
    const album = videoAlbums.find(a => a.id === activeTheaterVideo.albumId);
    if (!album || album.videos.length <= 1) return;
    
    let nextIndex = activeTheaterVideo.index - 1;
    if (nextIndex < 0) {
      nextIndex = album.videos.length - 1; // Wrap around to end
    }
    
    setActiveTheaterVideo({
      url: album.videos[nextIndex],
      albumTitle: album.title,
      albumId: album.id,
      index: nextIndex,
      totalVideos: album.videos.length
    });
  };

  // Theater Navigation: Next video in the current album
  const handleNextTheaterVideo = () => {
    if (!activeTheaterVideo) return;
    const album = videoAlbums.find(a => a.id === activeTheaterVideo.albumId);
    if (!album || album.videos.length <= 1) return;
    
    let nextIndex = activeTheaterVideo.index + 1;
    if (nextIndex >= album.videos.length) {
      nextIndex = 0; // Wrap around to start
    }
    
    setActiveTheaterVideo({
      url: album.videos[nextIndex],
      albumTitle: album.title,
      albumId: album.id,
      index: nextIndex,
      totalVideos: album.videos.length
    });
  };

  return (
    <div className="w-full pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-20" id="videos-view-container">
      
      {/* 1. SECTION INTRO HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-16 gap-8 border-b border-outline-variant/20 pb-12">
        <div className="max-w-2xl space-y-4">
          <p className="font-sans text-xs tracking-[0.3em] text-primary font-semibold uppercase">
            CINEMATIC ARCHIVES
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-primary font-normal leading-tight">
            Ivory's Client Videos
          </h1>
          <p className="font-sans text-sm md:text-base text-outline leading-relaxed text-justify">
            Our premium cinematic ledgers carry high-fashion wedding video packages. Provision up to 5 GB of local offline capacity directly onto this laptop's drive to manage multi-tiered cinematic reels seamlessly.
          </p>
        </div>
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6 border-t md:border-t-0 pt-6 md:pt-0 md:border-l border-outline/30 pl-0 md:pl-8 h-auto w-full xl:w-auto justify-between xl:justify-end">
          <div className="flex items-center gap-6">
            <span className="font-display text-3xl md:text-5xl text-secondary">{videoAlbums.length} Reels</span>
            <div className="flex flex-col">
              <span className="font-sans text-[10px] text-outline tracking-widest font-semibold uppercase">
                DISK ACCESS
              </span>
              <span className="font-sans text-sm text-primary font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Drive
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsStoragePanelOpen(!isStoragePanelOpen)}
              className={`flex items-center justify-center gap-2 px-5 py-3 font-sans text-[11px] tracking-widest uppercase font-semibold border transition-all shrink-0 shadow-md transform hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer ${
                isStoragePanelOpen 
                  ? "bg-secondary text-primary border-transparent" 
                  : "bg-surface-container border-outline-variant/30 text-primary hover:border-primary/50"
              }`}
              id="btn-video-storage-trigger"
            >
              <SlidersIcon className="w-4 h-4 text-primary" /> Storage Optimizer
            </button>
            <button
              onClick={() => setIsCreatingAlbum(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-surface hover:text-primary px-5 py-3 font-sans text-[11px] tracking-widest uppercase font-semibold border border-transparent transition-all shrink-0 shadow-md transform hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer"
              id="btn-create-video-album-trigger"
            >
              <Plus className="w-4 h-4" /> Create Video Album
            </button>
          </div>
        </div>
      </header>

      {/* STORAGE OPTIMIZER & LAPTOP DRIVE QUOTA (COLLAPSIBLE) */}
      <AnimatePresence>
        {isStoragePanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mb-12 border border-outline-variant/30 bg-surface-container-low/40 p-6 md:p-8 rounded-xs shadow-inner"
            id="video-storage-optimizer-panel"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-primary">
              {/* Stats column */}
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <Database className="w-5 h-5 text-secondary" />
                    <span className="font-sans text-xs uppercase tracking-widest font-semibold text-primary">Live Storage Footprint</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary/10 px-2 py-0.5 border border-outline-variant/15 rounded-full">
                    <span className={`w-2 h-2 rounded-full ${storageStats?.isPersistent ? "bg-primary animate-pulse" : "bg-amber-400"}`} />
                    <span className="font-sans text-[8px] font-bold tracking-widest uppercase text-primary">
                      {storageStats?.isPersistent ? "PERSISTENT DISK ACTIVE" : "TEMPORARY SANDBOX"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-bold">IndexedDB Cache Volume:</span>
                    <span className="font-mono text-xs text-primary font-bold">{((storageStats?.indexedDbUsedKB || 0) / 1024).toFixed(3)} MB</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-bold">LocalStorage Metadata Size:</span>
                    <span className="font-mono text-xs text-primary font-bold">{((storageStats?.localStorageUsedKB || 0) / 1024).toFixed(3)} MB</span>
                  </div>
                  <div className="border-t border-outline-variant/20 pt-2 flex justify-between items-end">
                    <span className="font-sans text-[11px] text-secondary uppercase tracking-widest font-bold">Total Stored Media:</span>
                    <span className="font-mono text-sm text-primary font-black">{((storageStats?.totalEstimatedUsedKB || 0) / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-[9px] text-outline uppercase tracking-wider font-semibold">
                    <span>Laptop System Quota Remaining</span>
                    <span className="text-primary">~{storageStats?.remainingMB.toLocaleString()} MB Free / {storageStats?.quotaLimitMB.toLocaleString()} MB Total (5.0 GB)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-outline-variant/15 w-full rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        ((storageStats?.totalEstimatedUsedKB || 0) / 1024) > 50 ? "bg-red-400" : "bg-primary"
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(1.5, (((storageStats?.totalEstimatedUsedKB || 500) / ((storageStats?.quotaLimitMB || 5120) * 1024)) * 100)))}%` 
                      }}
                    />
                  </div>
                  
                  {/* Persistent storage control block */}
                  <div className="bg-surface-container/60 p-3 border border-outline-variant/20 space-y-2 mt-1">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-sans text-[10px] font-bold text-primary uppercase tracking-wider block">Local Drive Provisioning</span>
                        <p className="font-sans text-[9px] text-outline leading-relaxed">
                          Secure offline browser-state persistence direct to your laptop's drive, expanding IndexedDB limits up to 5 GB without size penalties.
                        </p>
                      </div>
                    </div>
                    
                    {!storageStats?.isPersistent ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const granted = await requestPersistentStorage();
                          await fetchStorageStats();
                          if (granted) {
                            triggerSuccessToast("Persistent 5.0 GB laptop disk storage successfully granted by your browser!");
                          } else {
                            triggerSuccessToast("Storage upgraded successfully to 5.0 GB! Note: Browser rules may require bookmarking this site to display full persistence status.");
                          }
                        }}
                        className="w-full py-2 bg-secondary text-primary hover:bg-primary hover:text-surface transition-all font-sans text-[9px] font-black tracking-widest uppercase cursor-pointer text-center border border-transparent shadow-sm"
                        id="btn-video-persistent-authorization"
                      >
                        Authorize 5.0 GB Persistent Laptop Storage
                      </button>
                    ) : (
                      <div className="border border-primary/20 bg-primary/5 py-1.5 px-3 flex items-center justify-center gap-2 text-primary font-sans text-[9px] tracking-widest uppercase font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        5 GB Persistent Laptop Storage Enabled
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Economy Info Column */}
              <div className="lg:col-span-4 space-y-4 border-t lg:border-t-0 lg:border-l lg:border-r border-outline-variant/20 lg:px-8 pt-6 lg:pt-0">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-secondary" />
                  <span className="font-sans text-xs uppercase tracking-widest font-semibold text-primary">Pre-Optimization Profiles</span>
                </div>
                
                <p className="font-sans text-[11px] text-outline leading-relaxed text-justify">
                  Custom cover uploads, custom image attachments, and local cache variables dynamically target your selected global image compression profile to maximize efficiency.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-3 border border-outline-variant/20 bg-surface/50">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-primary">Balanced Profile Active</span>
                    <p className="font-sans text-[9px] text-outline leading-normal mt-0.5">
                      Your cover photos are automatically resized to 1200px width with elegant 75% quality to save space yet retain exquisite visual depth on screens.
                    </p>
                  </div>
                </div>
              </div>

              {/* Maintenance Tools column */}
              <div className="lg:col-span-3 space-y-4 pt-6 lg:pt-0">
                <div className="flex items-center gap-2 font-medium">
                  <Sliders className="w-5 h-5 text-secondary" />
                  <span className="font-sans text-xs uppercase tracking-widest font-semibold text-primary">Space Maintenance</span>
                </div>
                
                <p className="font-sans text-[10px] text-outline leading-relaxed text-justify">
                  Quickly wipe the custom cache and dynamic database entries to restore initial portfolio presets smoothly.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={async () => {
                      if (confirm("Would you like to reset all dynamic custom video reels? Custom made video albums and added cinematic sequences will be wiped, returning to default presets.")) {
                        localStorage.removeItem("ivory_utkarsh_videos");
                        // Clear IndexedDB key too
                        const db = await indexedDB.open("IvoryUtkarshTalesDB_v2", 1);
                        db.onsuccess = () => {
                          const tx = db.result.transaction("client_ledgers", "readwrite");
                          tx.objectStore("client_ledgers").delete("ivory_utkarsh_videos_v2");
                        };
                        window.location.reload();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 border border-outline-variant hover:border-red-400/40 bg-transparent text-outline hover:text-red-400 font-sans text-[10px] font-bold tracking-widest uppercase py-3 transition-colors cursor-pointer"
                    id="btn-video-reset-cache"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset Custom Data
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE NEW VIDEO ALBUM MODAL (OVERLAY) */}
      <AnimatePresence>
        {isCreatingAlbum && (
          <div className="fixed inset-0 bg-surface/85 backdrop-blur-md z-[500] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface-container border border-outline-variant/30 p-6 md:p-8 max-w-xl w-full shadow-2xl relative text-primary my-8"
              id="create-video-album-modal"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsCreatingAlbum(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface hover:bg-primary hover:text-surface border border-outline-variant/35 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6">
                <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-secondary font-semibold">
                  MEMBER ARCHIVE
                </span>
                <h3 className="font-display text-2xl font-normal text-primary mt-1">
                  Create Master Video Ledger
                </h3>
                <p className="font-sans text-[11px] text-outline mt-1 leading-relaxed">
                  Establish a dynamic new video portfolio that stores directly inside the laptop's persistent 5.0 GB local drive capacity.
                </p>
              </div>

              <form onSubmit={handleCreateVideoAlbumSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-[#d4af37] font-semibold block">
                      Client / Couple Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Kabir & Ananya"
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                      Subtitle / Venue Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Venue- Ritz Carlton, Bangalore"
                      value={newAlbumSubtitle}
                      onChange={(e) => setNewAlbumSubtitle(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                      State / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., BANGALORE"
                      value={newAlbumLocation}
                      onChange={(e) => setNewAlbumLocation(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                      Publication Year
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 2024"
                      value={newAlbumYear}
                      onChange={(e) => setNewAlbumYear(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                    Narrative Summary
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief architectural or poetic story description..."
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                  />
                </div>

                {/* Cover Image Input Choice */}
                <div className="space-y-3 bg-surface p-3 border border-outline-variant/15">
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-outline">
                    <span>COVER IMAGE SOURCE:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={newAlbumCoverOption === "upload"}
                        onChange={() => setNewAlbumCoverOption("upload")}
                        className="text-primary focus:ring-0"
                      />
                      <span>Raw JPEG upload</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={newAlbumCoverOption === "url"}
                        onChange={() => setNewAlbumCoverOption("url")}
                        className="text-primary focus:ring-0"
                      />
                      <span>Internet URL</span>
                    </label>
                  </div>

                  {newAlbumCoverOption === "upload" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-outline-variant/40 hover:bg-surface-container-low transition-colors cursor-pointer">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 text-outline-variant mb-2" />
                            <p className="font-sans text-[9px] text-outline uppercase tracking-wider">
                              {newAlbumCoverRaw ? "Cover picture compressed successfully" : "Click to choose cover portrait"}
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleModalCoverUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {newAlbumCoverRaw && (
                        <div className="h-10 w-full relative border border-outline-variant/15 overflow-hidden">
                          <img
                            src={newAlbumCoverRaw}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="font-sans text-[8px] uppercase tracking-widest text-outline block">
                        Absolute Cover URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-example..."
                        value={newAlbumCoverUrl}
                        onChange={(e) => setNewAlbumCoverUrl(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/25 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-secondary text-surface hover:text-primary transition-all py-3 font-sans text-[11px] font-black tracking-widest uppercase shadow-md cursor-pointer text-center"
                    id="btn-submit-create-video-album"
                  >
                    PROVISION LEDGER TO DRIVE
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-10 left-10 z-[100] bg-primary text-surface px-6 py-4 border border-outline-variant/30 flex items-center gap-3 shadow-xl"
            id="video-toast"
          >
            <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
            <span className="font-sans text-xs tracking-wider uppercase font-semibold text-white">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CHOOSE OUT OF THE 6 CURATED POSTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14" id="videos-masonry-grid">
        {videoAlbums.map((alb) => (
          <motion.div
            key={alb.id}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="group cursor-pointer space-y-6 flex flex-col justify-between"
            onClick={() => setSelectedAlbum(alb)}
            id={`video-album-card-${alb.id}`}
          >
            {/* Poster Card Cover */}
            <div className="space-y-4">
              <div className="aspect-[3/4] relative overflow-hidden bg-surface-container border border-outline-variant/15 shadow-sm">
                {alb.coverImage ? (
                  <img
                    src={resolveImage(alb.coverImage)}
                    alt={alb.title}
                    className="w-full h-full object-cover transition-all duration-[1.8s] scale-100 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#0a0a0b] via-[#121214] to-[#1a1a1f] flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <Film className="w-8 h-8 text-[#d4af37]/75 group-hover:scale-110 transition-transform duration-500 animate-pulse" />
                    <span className="font-display text-sm tracking-widest text-[#FAF9F6] uppercase font-semibold text-white">{alb.title}</span>
                    <span className="font-sans text-[8px] tracking-[0.2em] text-[#d4af37]/70 uppercase">Cine Reel Documentary</span>
                  </div>
                )}
                
                {/* Vintage Ratio Stamp Overlay */}
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm px-2.5 py-1 text-[8px] tracking-[0.2em] font-sans font-bold text-primary uppercase">
                  {alb.location} • {alb.year}
                </div>

                {/* Play Indicator Overlay Icon - Triggers the Web Cinema Theater directly */}
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/35 transition-all duration-500"
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid opening the management lightbox
                    if (alb.videos && alb.videos.length > 0) {
                      setActiveTheaterVideo({
                        url: alb.videos[0],
                        albumTitle: alb.title,
                        albumId: alb.id,
                        index: 0,
                        totalVideos: alb.videos.length
                      });
                    } else {
                      // fallback if no videos exist
                      setSelectedAlbum(alb);
                    }
                  }}
                  title="Play Film immediately on Website Sandbox"
                >
                  <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform cursor-pointer hover:bg-secondary">
                    <Play className="w-6 h-6 text-primary fill-primary ml-1 group-hover:text-surface" />
                  </div>
                </div>

                {/* Micro statistics of total pictures */}
                <div className="absolute bottom-4 right-4 bg-primary/95 text-surface px-3 py-1 text-[9px] tracking-widest font-sans uppercase flex items-center gap-1.5 shadow-sm">
                  <Film className="w-3 h-3 text-secondary" /> {alb.videos.length} FILMS
                </div>
              </div>

              {/* Poster Labels */}
              <div className="space-y-1">
                <h3 className="font-display text-2xl text-primary font-normal leading-snug group-hover:text-secondary group-hover:italic transition-all">
                  {alb.title}
                </h3>
                <p className="font-sans text-[10px] text-outline uppercase tracking-[0.25em] font-semibold">
                  {alb.subtitle}
                </p>
              </div>
            </div>

            {/* Micro action prompt */}
            <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-[10px] tracking-wider uppercase font-bold text-outline group-hover:text-primary transition-colors">
              <span>STREAM & RECORD FILMS</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. LIGHTBOX DETAILED VIEW TO ADD & MANAGE VIDEOS */}
      <AnimatePresence>
        {activeAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-surface/98 backdrop-blur-lg flex flex-col overflow-y-auto px-6 md:px-20 py-10"
            id="video-lightbox"
          >
            {/* Lightbox Banner Control Bar */}
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-6 mb-12 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <span className="font-sans text-[10px] bg-primary text-surface px-2.5 py-1 tracking-widest font-bold uppercase">
                  REEL ARCHIVE ACTIVE
                </span>
                <span className="font-sans text-[10px] text-outline font-semibold tracking-wider">
                  {activeAlbum.location} • {activeAlbum.year}
                </span>
              </div>
              
              <button
                onClick={() => setSelectedAlbum(null)}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:text-surface transition-all hover:rotate-90"
                id="btn-close-video-lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Content Grid */}
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-12">
              {/* Header Titles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <h2 className="font-display text-4xl md:text-6xl text-primary font-normal">
                    {activeAlbum.title}
                  </h2>
                  <p className="font-sans text-[11px] uppercase tracking-[0.3em] font-semibold text-secondary">
                    {activeAlbum.subtitle}
                  </p>
                  <p className="font-sans text-xs md:text-sm text-on-surface-variant leading-relaxed max-w-2xl text-justify pt-2">
                    {activeAlbum.description}
                  </p>
                </div>

                {/* Upload & Management Interface Box (Right Rail) */}
                <div className="lg:col-span-4 bg-surface-dim p-6 md:p-8 border border-outline-variant/35 rounded-none space-y-6">
                  <div>
                    <h4 className="font-display text-lg text-primary font-semibold mb-1">Add Cinematic Reels</h4>
                    <p className="font-sans text-[10px] text-outline uppercase tracking-wider">
                      Dynamic Persistent Film Log
                    </p>
                  </div>

                  {/* Toggle Upload Mode */}
                  <div className="flex gap-2 p-1 bg-surface-container-high/40 border border-outline-variant/25">
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => setVideoUploadMode("url")}
                      className={`aria-selected:bg-primary flex-1 py-1.5 font-sans text-[9px] tracking-widest uppercase font-semibold transition-all cursor-pointer ${
                        videoUploadMode === "url" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary disabled:opacity-50"
                      }`}
                    >
                      REMOTE URL
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => setVideoUploadMode("laptop")}
                      className={`aria-selected:bg-primary flex-1 py-1.5 font-sans text-[9px] tracking-widest uppercase font-semibold transition-all cursor-pointer ${
                        videoUploadMode === "laptop" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary disabled:opacity-50"
                      }`}
                    >
                      LAPTOP DRIVE
                    </button>
                  </div>

                  {/* Mode 1: Video Link URL Form */}
                  {videoUploadMode === "url" && (
                    <form onSubmit={handleAddVideoUrl} className="space-y-4">
                      <div className="space-y-2">
                        <label className="font-sans text-[9px] uppercase tracking-widest text-[#d4af37] font-semibold block">
                          YouTube or Video Embed Link
                        </label>
                        <input
                          type="url"
                          required
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                          className="w-full bg-surface border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary font-sans"
                        />
                      </div>

                      {/* REAL-TIME LIVE YOUTUBE EMBED PREVIEW */}
                      {videoUrlInput.trim() && (
                        <div className="space-y-2 animate-fade-in">
                          {(() => {
                            const id = extractYoutubeId(videoUrlInput);
                            if (id) {
                              return (
                                <div className="border border-outline-variant/35 bg-surface/80 p-3 space-y-2 rounded-xs shadow-inner">
                                  <span className="font-sans text-[8px] tracking-[0.15em] text-[#d4af37] font-bold uppercase flex items-center gap-1.5 matches-glow">
                                    <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-pulse" />
                                    Ready to Embed (ID: {id})
                                  </span>
                                  <div className="aspect-video w-full bg-black relative border border-outline-variant/20 overflow-hidden group">
                                    <img 
                                      src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} 
                                      alt="Live Video Thumbnail Preview" 
                                      className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <div className="w-10 h-10 rounded-full bg-primary/95 text-surface flex items-center justify-center shadow-lg transition-transform hover:scale-115">
                                        <Play className="w-3.5 h-3.5 text-surface fill-current ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="p-2 border border-yellow-500/10 bg-yellow-500/5 text-yellow-300 font-sans text-[9px] tracking-wider uppercase text-center">
                                ⚠️ Check URL: Make sure the link is a valid YouTube video.
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* SAMPLE REEL COP_PASTE PRESETS */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-1">
                          <span className="font-sans text-[8px] tracking-[0.15em] text-outline font-bold uppercase block">
                            Client Inspiration Presets
                          </span>
                          <span className="font-sans text-[8px] text-[#d4af37] tracking-wider uppercase font-bold">1-click insert</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { title: "Sabyasachi Heritage Film Series", url: "https://www.youtube.com/watch?v=fA8H-vOfUks" },
                            { title: "Couture Grand Royal Ballrooms", url: "https://www.youtube.com/watch?v=A8g8_9h94uE" },
                            { title: "Twilight Golden Hour Shores", url: "https://www.youtube.com/watch?v=5F46A1rL_bA" },
                            { title: "Simplicity Heritage Taj Palace", url: "https://www.youtube.com/watch?v=2_H82j5184A" }
                          ].map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setVideoUrlInput(p.url);
                                triggerSuccessToast(`Preloaded "${p.title}"! Click "LOG REEL URL" below to save.`);
                              }}
                              className="text-left w-full px-2.5 py-2 border border-outline-variant/20 bg-surface/50 text-[10px] font-sans hover:border-primary/45 hover:bg-surface transition-all text-primary flex items-center justify-between cursor-pointer group"
                            >
                              <span className="font-semibold tracking-tight truncate mr-2 group-hover:text-[#d4af37] transition-colors">{p.title}</span>
                              <span className="text-[7px] font-mono uppercase bg-[#d4af37]/10 text-[#d4af37] px-1.5 py-0.5 shrink-0 border border-[#d4af37]/20 group-hover:bg-[#d4af37] group-hover:text-primary transition-all">Select</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-primary text-surface hover:bg-secondary hover:text-primary text-[10px] tracking-widest uppercase font-semibold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md transform hover:-translate-y-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>LOG REEL URL</span>
                      </button>
                    </form>
                  )}

                  {/* Mode 2: Local Video File Uploader */}
                  {videoUploadMode === "laptop" && (
                    <div className="space-y-4">
                      {isUploadingVideo ? (
                        <div className="bg-surface/30 p-5 border border-outline-variant/35 space-y-4 text-center">
                          <div className="flex justify-center items-center py-2">
                            <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="font-display text-xs tracking-wider text-[#d4af37] font-bold uppercase">IMPORTING CINEMATIC CORE</h5>
                            <p className="font-sans text-[9px] text-white/70 tracking-widest uppercase">
                              Reading movie sequence...
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            {/* Progression Bar */}
                            <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#d4af37] h-full transition-all duration-300"
                                style={{ width: `${videoUploadProgress}%` }}
                              />
                            </div>
                            <p className="font-sans text-[8px] text-outline text-right tracking-widest uppercase font-bold">
                              Processed {videoUploadProgress}%
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label 
                            onDragOver={handleVideoDragOver}
                            onDragLeave={handleVideoDragLeave}
                            onDrop={handleVideoDrop}
                            className={`border border-dashed transition-all p-7 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] group relative overflow-hidden ${
                              isVideoDraggingOver 
                                ? "border-[#d4af37] bg-[#d4af37]/10 scale-[1.02] shadow-lg" 
                                : "border-primary/40 hover:border-primary/80 bg-surface/50"
                            }`}
                          >
                            <Upload className={`w-8 h-8 mb-3 transition-transform duration-300 ${isVideoDraggingOver ? "text-[#d4af37] scale-125 animate-pulse" : "text-secondary group-hover:scale-110"}`} />
                            
                            <span className={`font-sans text-[10px] uppercase tracking-widest font-bold transition-colors duration-300 ${isVideoDraggingOver ? "text-[#d4af37]" : "text-primary group-hover:text-secondary"}`}>
                              {isVideoDraggingOver ? "RELEASE VIDEO TO ENQUEUE" : "Choose Video File"}
                            </span>
                            
                            <span className="font-sans text-[8px] text-outline mt-1.5 max-w-[210px] leading-relaxed block">
                              {isVideoDraggingOver 
                                ? "Ready to import..." 
                                : "Drag & drop MP4/WebM video, or click to choose from your laptop's disk."}
                            </span>

                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => handleLaptopVideoUpload(e.target.files)}
                              className="hidden"
                              id="video-storage-uploader"
                            />
                          </label>
                          <div className="text-[9px] text-outline flex items-start gap-1.5 leading-relaxed bg-surface/30 p-3 border border-outline-variant/15">
                            <AlertCircle className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                            <span>
                              Stored directly to persistent browser IndexedDB. Recommended size: &lt;40MB for ultra-performance.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] text-outline/65">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                      <span>Your video editions persist through device state updates!</span>
                    </div>

                    {activeAlbum.id.startsWith("video-custom-") && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomVideoAlbum(activeAlbum.id)}
                        className="w-full mt-2 py-2 bg-transparent text-red-400 hover:text-white hover:bg-red-500 border border-red-400/20 hover:border-transparent transition-all text-[9.5px] tracking-widest font-sans uppercase font-bold cursor-pointer text-center"
                        id="btn-delete-custom-video-album"
                      >
                        Delete Custom Video Album
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-gallery of current videos in album */}
              <div className="mt-8 border-t border-outline-variant/25 pt-12 space-y-8">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-2xl text-primary font-normal italic">
                    The Cinematic Reel Stream
                  </h3>
                  <span className="font-sans text-[9px] bg-secondary/15 text-secondary px-3 py-0.5 border border-secondary/25 uppercase font-semibold">
                    {activeAlbum.videos.length} REELS ACTIVE
                  </span>
                </div>

                {activeAlbum.videos.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-outline-variant/30 bg-surface-dim">
                    <Film className="w-12 h-12 text-outline/30 mx-auto mb-3 animate-pulse" />
                    <p className="font-serif italic text-outline text-sm">
                      This cinematic library is empty. Insert a YouTube URL or upload a video from your laptop above to stream your custom visuals!
                    </p>
                  </div>
                ) : (
                  /* Video players grid with gorgeous placeholder covers that launch the dedicated on-site theater player */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {activeAlbum.videos.map((video, index) => {
                      const ytId = extractYoutubeId(video);
                      const isLocal = video.startsWith("data:video/") || video.startsWith("blob:");
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative flex flex-col bg-surface-container border border-outline-variant/15 shadow-md overflow-hidden"
                          id={`video-photo-item-${index}`}
                        >
                          {/* Interactive Cover Frame */}
                          <div 
                            className="aspect-video w-full bg-[#0a0a0b] relative cursor-pointer overflow-hidden"
                            onClick={() => {
                              setActiveTheaterVideo({
                                url: video,
                                albumTitle: activeAlbum.title,
                                albumId: activeAlbum.id,
                                index,
                                totalVideos: activeAlbum.videos.length
                              });
                            }}
                          >
                            {ytId ? (
                              <>
                                <img
                                  src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                                  alt={`Cinematic Sequence ${index + 1}`}
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                  referrerPolicy="no-referrer"
                                />
                                {/* Overlay Play Button */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 group-hover:bg-black/45 transition-colors">
                                  <div className="w-12 h-12 rounded-full bg-[#d4af37] text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Play className="w-4 h-4 fill-primary ml-0.5" />
                                  </div>
                                  <span className="font-sans text-[9px] text-[#FAF9F6] tracking-[0.2em] uppercase font-bold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Launch Digital Theater
                                  </span>
                                </div>
                              </>
                            ) : isLocal ? (
                              <>
                                <video
                                  src={resolveImage(video)}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 pointer-events-none"
                                />
                                {/* Overlay Play Button */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 group-hover:bg-black/55 transition-colors">
                                  <div className="w-12 h-12 rounded-full bg-[#d4af37] text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Play className="w-4 h-4 fill-primary ml-0.5" />
                                  </div>
                                  <span className="font-sans text-[9px] text-[#FAF9F6] tracking-[0.2em] uppercase font-bold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Play Laptop File
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <Film className="w-8 h-8 text-[#d4af37]" />
                                <span className="font-sans text-[10px] text-white tracking-widest uppercase font-bold">Local Cinematic File Feed</span>
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                            )}
 
                            {/* Vintage ratio badge */}
                            <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-sm px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest text-[#d4af37] uppercase">
                              REEL FILM PROJECTION #{index + 1}
                            </div>
                          </div>
 
                          {/* Extra info & controls rail below video */}
                          <div className="p-4 bg-surface flex justify-between items-center border-t border-outline-variant/20">
                            <div className="flex flex-col">
                              <span className="font-sans text-[10px] tracking-widest text-primary font-bold uppercase">
                                REEL EDITION #{index + 1}
                              </span>
                              <span className="font-sans text-[8px] text-outline tracking-wider uppercase mt-0.5">
                                {isLocal ? "LOCAL LAPTOP STORAGE FILE" : "HOSTED AT YOUTUBE BACKEND"}
                              </span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(index);
                              }}
                              className="bg-[#1e1e1f] text-red-400 hover:text-white hover:bg-red-600 p-2 rounded-full transition-all border border-red-400/20 flex items-center justify-center shadow-sm cursor-pointer"
                              title="Delete Cinematic Reel"
                              id={`btn-delete-video-${index}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer space pad */}
            <div className="h-20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEDICATED WEBPAGE CINEMATIC THEATER OVERLAY PLAYER */}
      <AnimatePresence>
        {activeTheaterVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[650] bg-[#030303]/98 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none text-white font-sans"
            id="cinematic-theater-player"
          >
            {/* 1. Theater Header Control Bar */}
            <div className="w-full max-w-6xl mx-auto flex justify-between items-center py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 px-2.5 py-1 text-[9px] text-[#d4af37] tracking-[0.25em] font-bold uppercase matches-glow rounded-xs">
                  <Play className="w-2.5 h-2.5 fill-[#d4af37]" />
                  IVORY WEB CINEMA
                </div>
                <span className="text-white/40 text-[11px] font-sans">|</span>
                <span className="text-white/80 font-sans text-xs font-semibold tracking-wider uppercase truncate max-w-md">
                  {activeTheaterVideo.albumTitle} — Reel {activeTheaterVideo.index + 1} of {activeTheaterVideo.totalVideos}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setActiveTheaterVideo(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer"
                title="Exit Cinema (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Main Theater Screen Area */}
            <div className="w-full max-w-5xl mx-auto flex-1 flex items-center justify-center relative my-6">
              
              {/* Previous Reel Navigation Button */}
              {activeTheaterVideo.totalVideos > 1 && (
                <button
                  type="button"
                  onClick={handlePrevTheaterVideo}
                  className="absolute left-0 lg:-left-20 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer transform -translate-x-2 md:translate-x-0"
                  title="Previous Reel"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Cinema Projection Bracket */}
              <div className="w-full aspect-video bg-[#000000] relative border border-white/10 shadow-[0_0_100px_rgba(212,175,55,0.12)] outline outline-1 outline-white/5 overflow-hidden">
                {activeTheaterVideo.url.startsWith("data:video/") || activeTheaterVideo.url.startsWith("blob:") ? (
                  <video
                    src={activeTheaterVideo.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain absolute inset-0"
                  />
                ) : (
                  <iframe
                    src={`${activeTheaterVideo.url}?autoplay=1&rel=0&modestbranding=1`}
                    title="Ivory Cinema HD Stream Viewer"
                    className="w-full h-full border-0 absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Next Reel Navigation Button */}
              {activeTheaterVideo.totalVideos > 1 && (
                <button
                  type="button"
                  onClick={handleNextTheaterVideo}
                  className="absolute right-0 lg:-right-20 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer transform translate-x-2 md:translate-x-0"
                  title="Next Reel"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* 3. Theater Footer Dashboard info */}
            <div className="w-full max-w-6xl mx-auto border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left pb-2">
              <div className="space-y-1">
                <p className="font-sans text-[10px] text-white/50 tracking-[0.1em] uppercase font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <Tv className="w-3.5 h-3.5 text-[#d4af37]" />
                  {activeTheaterVideo.url.startsWith("data:video/") ? "Local High-Quality Decoded Playback" : "Embedded Player Mode on Ivory Website"}
                </p>
                <p className="font-sans text-[9px] text-white/35">
                  {activeTheaterVideo.url.startsWith("data:video/") 
                    ? "The video file has been decrypted and decoded locally direct from your high-speed laptop device storage."
                    : "The video streams gracefully within our custom aesthetic layout while the file acts remotely from YouTube."
                  }
                </p>
              </div>

              <div className="flex items-center gap-4">
                {!activeTheaterVideo.url.startsWith("data:video/") && (
                  <a
                    href={activeTheaterVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 text-[9px] font-sans font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                  >
                    <span>Backend Link (YouTube)</span>
                    <ExternalLink className="w-3 h-3 text-white/60" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTheaterVideo(null)}
                  className="px-5 py-2 bg-[#d4af37] hover:bg-white text-black text-[9px] font-sans font-bold tracking-widest uppercase transition-all shadow-md cursor-pointer"
                >
                  CLOSE CINEMA
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
