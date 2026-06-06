import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ArrowDown, Send, CheckCircle2, BookOpen, ArrowRight, Film, Play, Facebook, Instagram, Sliders, Upload, RotateCcw, Image as ImageIcon } from "lucide-react";
import { INITIAL_ALBUMS, INITIAL_VIDEO_ALBUMS, resolveImage } from "../data";
import { Story, Album, VideoAlbum } from "../types";
import { safeGetItem, safeSetItem, loadAlbumsAsync, saveAlbumsAsync, loadVideosAsync, saveVideosAsync } from "../utils/storage";
import PortfolioGrid from "./PortfolioGrid";


interface HomeViewProps {
  onSelectStory: (story: Story) => void;
  onInquire: () => void;
  onNavigateToArchive: () => void;
  onNavigateToAlbums: () => void;
  onNavigateToVideos: () => void;
  homeStories: Story[];
  heroTitle?: string;
  heroTagline?: string;
}

export default function HomeView({
  onSelectStory,
  onInquire,
  onNavigateToArchive,
  onNavigateToAlbums,
  onNavigateToVideos,
  homeStories,
  heroTitle = "Ivory Utkarsh Tales",
  heroTagline = "Poetic Wedding Storytelling • Pan India & Global",
}: HomeViewProps) {
  // Local state for synchronized albums and video albums
  const [albums, setAlbums] = useState<Album[]>([]);
  const [videoAlbums, setVideoAlbums] = useState<VideoAlbum[]>([]);

  // Local state for customized backdrop image
  const [heroBg, setHeroBg] = useState<string>(() => {
    return safeGetItem("ivory_utkarsh_hero_bg") || "solid-1";
  });
  const [heroBgGrayscale, setHeroBgGrayscale] = useState<boolean>(() => {
    return safeGetItem("ivory_utkarsh_hero_bg_grayscale") !== "false";
  });
  const [isBgSelectorOpen, setIsBgSelectorOpen] = useState(false);

  // Derive all uploaded photos dynamically
  const allUploadedPhotos = React.useMemo(() => {
    return albums.flatMap(a => a.photos || []);
  }, [albums]);

  const activeHeroBg = React.useMemo(() => {
    if (heroBg && !heroBg.startsWith("http")) {
      return heroBg;
    }
    if (allUploadedPhotos.length > 0) {
      return allUploadedPhotos[0];
    }
    return "solid-1";
  }, [heroBg, allUploadedPhotos]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setHeroBg(base64String);
      safeSetItem("ivory_utkarsh_hero_bg", base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleResetBg = () => {
    const defaultBg = "solid-1";
    setHeroBg(defaultBg);
    setHeroBgGrayscale(true);
    safeSetItem("ivory_utkarsh_hero_bg", defaultBg);
    safeSetItem("ivory_utkarsh_hero_bg_grayscale", "true");
  };

  const toggleGrayscale = () => {
    const nextVal = !heroBgGrayscale;
    setHeroBgGrayscale(nextVal);
    safeSetItem("ivory_utkarsh_hero_bg_grayscale", String(nextVal));
  };

  useEffect(() => {
    // 1. Photo Albums Sync
    async function syncPhotoAlbums() {
      const storedAlbums = await loadAlbumsAsync();
      let finalAlbums = INITIAL_ALBUMS;

      if (storedAlbums && storedAlbums.length > 0) {
        try {
          // Merge to preserve user-uploaded photos, custom albums, and core metadata from INITIAL_ALBUMS
          const initialMap = new Map(INITIAL_ALBUMS.map(a => [a.id, a]));
          const merged: Album[] = [];

          // Process stored ones to keep custom ones and default updates
          storedAlbums.forEach((storedAlb) => {
            const defAlb = initialMap.get(storedAlb.id);
            if (defAlb) {
              merged.push({
                ...defAlb,
                coverImage: storedAlb.coverImage || defAlb.coverImage,
                photos: storedAlb.photos || defAlb.photos,
              });
            } else {
              // Custom user-created album
              merged.push(storedAlb);
            }
          });

          // Fallback check to add default albums if they weren't in stored at all
          INITIAL_ALBUMS.forEach((defAlb) => {
            if (!merged.some(m => m.id === defAlb.id)) {
              merged.push(defAlb);
            }
          });

          finalAlbums = merged;
        } catch {
          finalAlbums = INITIAL_ALBUMS;
        }
      }

      setAlbums(finalAlbums);
      await saveAlbumsAsync(finalAlbums);
    }

    syncPhotoAlbums();

    // 2. Video Albums Sync
    async function syncVideoAlbums() {
      const storedVideos = await loadVideosAsync();
      let finalVideos = INITIAL_VIDEO_ALBUMS;

      if (storedVideos && storedVideos.length > 0) {
        try {
          const initialMap = new Map(INITIAL_VIDEO_ALBUMS.map(v => [v.id, v]));
          const merged: VideoAlbum[] = [];

          // Process stored ones to keep custom ones and default updates
          storedVideos.forEach((storedAlb) => {
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

          // Fallback check to add default albums if they weren't in stored at all
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
    }

    syncVideoAlbums();
  }, []);

  // Live real-time background storage synchronizer
  useEffect(() => {
    const handleSync = () => {
      setHeroBg(safeGetItem("ivory_utkarsh_hero_bg") || "solid-1");
      setHeroBgGrayscale(safeGetItem("ivory_utkarsh_hero_bg_grayscale") !== "false");
    };
    window.addEventListener("storage", handleSync);
    const interval = setInterval(handleSync, 1000);
    return () => {
      window.removeEventListener("storage", handleSync);
      clearInterval(interval);
    };
  }, []);

  // Local form states for the in-page "Begin Your Story" form to ensure it is fully interactive
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dateLocation: "",
    source: "",
    details: ""
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("Please fill in your Name and Email to process the enquiry correctly.");
      return;
    }
    setFormSubmitted(true);
    // Auto-reset after a delay
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        dateLocation: "",
        source: "",
        details: ""
      });
      setFormSubmitted(false);
    }, 6000);
  };

  return (
    <div className="w-full overflow-hidden" id="home-view-container">
      
      {/* 1. HERO SECTION WITH CINEMATIC FULL SCREEN BACKDROP */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          {activeHeroBg && !activeHeroBg.startsWith("solid") ? (
            <motion.img
              key={activeHeroBg}
              initial={{ scale: 1.12, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.85 }}
              transition={{ duration: 2.5, ease: [0.25, 1, 0.5, 1] }}
              src={resolveImage(activeHeroBg)}
              alt="Aesthetic Editorial Bridal Portrait on Shoreline"
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-all duration-1000 ${
                heroBgGrayscale 
                  ? "filter grayscale contrast-[1.15] brightness-[0.6] saturate-0" 
                  : "filter brightness-[0.7] contrast-[1.05]"
              }`}
              id="hero-bg-bridal-portrait"
            />
          ) : (
            <div className={`w-full h-full transition-all duration-1000 ${
              activeHeroBg === "solid-2" 
                ? "bg-gradient-to-tr from-[#111112] to-[#1d1d20]" 
                : activeHeroBg === "solid-3"
                ? "bg-gradient-to-tr from-[#18191c] to-[#25272d]"
                : "bg-gradient-to-tr from-[#080809] to-[#121213]"
            }`} />
          )}
          {/* Subtle gradient vignette mask layered for pristine high-contrast legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        </div>

        <div className="relative z-10 text-center text-white space-y-6 px-6 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="font-display text-2xl md:text-5xl leading-tight text-white font-light tracking-[0.25em] uppercase"
            id="hero-title"
          >
            {heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
            className="uppercase tracking-[0.6em] text-[10px] md:text-xs font-light text-white/95"
            id="hero-tagline"
          >
            {heroTagline}
          </motion.p>
        </div>

        {/* Floating Background Customizer Panel */}
        <div className="absolute bottom-6 md:bottom-10 right-6 md:right-10 z-20">
          <div className="relative">
            <button
              onClick={() => setIsBgSelectorOpen(!isBgSelectorOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-black/40 hover:bg-black/65 active:bg-black border border-white/10 rounded-sm text-white/80 hover:text-white transition-all text-[10px] tracking-widest uppercase font-sans select-none backdrop-blur-md shadow-lg cursor-pointer"
              title="Aesthetic Control Panel"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AESTHETICS</span>
            </button>

            <AnimatePresence>
              {isBgSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute right-0 bottom-full mb-3 w-72 bg-black/85 backdrop-blur-lg border border-white/15 rounded-sm p-4 text-white shadow-2xl z-50 text-left"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                    <span className="font-display text-[9px] tracking-[0.2em] font-semibold text-white/60 uppercase">
                      Hero Canvas Customizer
                    </span>
                    <button 
                      onClick={() => setIsBgSelectorOpen(false)}
                      className="text-white/40 hover:text-white text-[9px] uppercase tracking-wider font-mono cursor-pointer"
                    >
                      Close [×]
                    </button>
                  </div>

                  <p className="font-sans text-[10px] leading-relaxed text-white/70 mb-3">
                    Personalize your experience. Upload your preferred photo full-screen or choose a handcrafted layout preset:
                  </p>

                  {/* Built-in high luxury presets mapped to uploaded photos or elegant solids */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={() => {
                        const bg = allUploadedPhotos[0] || "solid-1";
                        setHeroBg(bg);
                        safeSetItem("ivory_utkarsh_hero_bg", bg);
                      }}
                      className={`relative aspect-[3/4] border rounded-sm overflow-hidden group transition cursor-pointer ${
                        heroBg === "solid-1" || (allUploadedPhotos[0] && heroBg === allUploadedPhotos[0]) ? "border-amber-400/70" : "border-white/10"
                      }`}
                      title="Aesthetic Vol I"
                    >
                      {allUploadedPhotos[0] ? (
                        <img 
                          src={resolveImage(allUploadedPhotos[0])} 
                          alt="Vol I"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#080809] to-[#121213]" />
                      )}
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[7px] text-white bg-black/60 py-0.5 uppercase tracking-widest font-sans font-medium">Vol I</span>
                    </button>

                    <button
                      onClick={() => {
                        const bg = allUploadedPhotos[1] || "solid-2";
                        setHeroBg(bg);
                        safeSetItem("ivory_utkarsh_hero_bg", bg);
                      }}
                      className={`relative aspect-[3/4] border rounded-sm overflow-hidden group transition cursor-pointer ${
                        heroBg === "solid-2" || (allUploadedPhotos[1] && heroBg === allUploadedPhotos[1]) ? "border-amber-400/70" : "border-white/10"
                      }`}
                      title="Aesthetic Vol II"
                    >
                      {allUploadedPhotos[1] ? (
                        <img 
                          src={resolveImage(allUploadedPhotos[1])} 
                          alt="Vol II"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#111112] to-[#1d1d20]" />
                      )}
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[7px] text-white bg-black/60 py-0.5 uppercase tracking-widest font-sans font-medium">Vol II</span>
                    </button>

                    <button
                      onClick={() => {
                        const bg = allUploadedPhotos[2] || "solid-3";
                        setHeroBg(bg);
                        safeSetItem("ivory_utkarsh_hero_bg", bg);
                      }}
                      className={`relative aspect-[3/4] border rounded-sm overflow-hidden group transition cursor-pointer ${
                        heroBg === "solid-3" || (allUploadedPhotos[2] && heroBg === allUploadedPhotos[2]) ? "border-amber-400/70" : "border-white/10"
                      }`}
                      title="Aesthetic Vol III"
                    >
                      {allUploadedPhotos[2] ? (
                        <img 
                          src={resolveImage(allUploadedPhotos[2])} 
                          alt="Vol III"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#18191c] to-[#25272d]" />
                      )}
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[7px] text-white bg-black/60 py-0.5 uppercase tracking-widest font-sans font-medium">Vol III</span>
                    </button>
                  </div>

                  {/* Custom upload area */}
                  <label className="flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 rounded-sm p-4 text-center cursor-pointer transition-all duration-300 mb-3 group">
                    <Upload className="w-5 h-5 mb-1.5 text-white/50 group-hover:text-white transition-colors" />
                    <span className="font-sans text-[10px] uppercase tracking-widest font-semibold block text-white/90">
                      Upload Custom Photo
                    </span>
                    <span className="font-sans text-[7px] text-white/40 tracking-wider mt-0.5 block">
                      Drag over or select file
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {/* Toggle filter and reset options */}
                  <div className="space-y-2 mt-3 pt-2 border-t border-white/10 text-[9px] tracking-wider uppercase font-sans text-white/80">
                    <button
                      onClick={toggleGrayscale}
                      className="flex items-center justify-between w-full hover:bg-white/5 p-1 rounded-sm transition-colors text-left cursor-pointer"
                    >
                      <span>Noir Grayscale Filter</span>
                      <span className={`px-2 py-0.5 rounded-xs font-mono text-[8px] ${
                        heroBgGrayscale 
                          ? "bg-[#8D7B68] text-white" 
                          : "bg-white/10 text-white/60"
                      }`}>
                        {heroBgGrayscale ? "ON" : "OFF"}
                      </span>
                    </button>

                    <button
                      onClick={handleResetBg}
                      className="flex items-center justify-between w-full hover:bg-white/5 p-1 rounded-sm transition-colors text-left text-white/60 hover:text-white cursor-pointer"
                    >
                      <span>Reset to Original</span>
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 cursor-pointer opacity-70 hover:opacity-100"
            onClick={() => {
              const worksSection = document.getElementById("featured-journal-section");
              if (worksSection) worksSection.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="font-sans text-[8px] uppercase tracking-widest text-white/50">SCROLL</span>
            <ArrowDown className="w-4 h-4 text-white" />
          </motion.div>
        </div>
      </section>

      {/* 2. SACRED QUOTE BANNER */}
      <section className="py-20 md:py-28 bg-[#FAF9F6] border-b border-outline-variant/10 relative z-20">
        <div className="max-w-4xl mx-auto px-6 text-center select-none">
          <div className="flex flex-col items-center justify-center space-y-6">
            <span className="block h-[1px] w-12 bg-secondary/30"></span>
            <p className="font-display italic text-xl md:text-3xl text-on-surface-variant leading-relaxed font-light tracking-wide max-w-3xl px-4">
              "A FOREVER HOME FOR TWO SOULS, WOVEN TOGETHER BY A GREATER PURPOSE"
            </p>
            <span className="block h-[1px] w-12 bg-secondary/30"></span>
          </div>
        </div>
      </section>

      {/* CURATOR'S PORTFOLIO PAGE GRID */}
      <PortfolioGrid />

      {/* 3. FEATURED STORY (FULL WIDTH PARALLAX INTERIOR STYLE) */}
      <section id="featured-journal-section" className="bg-[#FAF9F6] py-24 md:py-32 border-b border-outline-variant/10 relative z-10">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden aspect-[4/3] md:aspect-[16/10] bg-surface-dim border border-outline-variant/10 shadow-sm rounded-xs">
                <motion.img
                  initial={{ scale: 1.05 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                  src={resolveImage("/src/assets/images/regenerated_image_1780314355808.jpg")}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-[1.5s]"
                  alt="Featured Documentary Vows"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="lg:col-span-5 space-y-6 md:space-y-8">
              <div className="space-y-2">
                <span className="text-secondary text-[10px] uppercase tracking-[0.5em] font-bold block">
                  The Thailand Chapter
                </span>
                <span className="text-xs font-mono text-on-surface-variant/70 tracking-widest block uppercase">
                  Le Méridien Khao Lak Resort & Spa
                </span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary font-light leading-[1.2] tracking-wide hover:text-secondary transition-colors duration-500">
                Le Méridien, Khao Lak
              </h2>
              <p className="font-sans text-xs md:text-sm text-on-surface-variant leading-relaxed max-w-md text-justify">
                A breathtaking celebration of coastal romance and tropical elegance. Staged on the serene, private shores of Khao Lak, Thailand, this editorial captures the gentle Andaman sea breeze, the warm golden sands, and the symmetrical lines of white garden chairs leading toward a magnificent, custom-sculpted white and light pink rose arch framing the oceanfront vows.
              </p>
              <div>
                <button
                  onClick={() => {
                    // Trigger a custom aesthetic selection of the first archive story or prefilled Jaipur story
                    onInquire();
                  }}
                  className="inline-block border-b border-secondary pb-1 text-[10px] uppercase tracking-[0.2em] font-bold text-secondary hover:text-primary hover:border-primary transition-colors"
                >
                  View Details & Enquire —
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. EXPERIENCE PROCESS (THE CLIENT STORY JOURNEY) */}
      <section className="py-8 md:py-28 bg-surface-dim relative z-10" id="experience-process-section">
        <div className="max-w-7xl mx-auto px-6 md:px-20 text-center animate-fade-in-up">
          <span className="font-sans text-[8px] md:text-[10px] tracking-[0.4em] text-secondary font-bold block uppercase mb-1 md:mb-3">
            METHODOLOGY
          </span>
          <h2 className="font-display text-xl md:text-5xl text-primary font-normal mb-8 md:mb-20">
            The Art of Our Process
          </h2>
          
          {/* Mobile Aesthetic Micro-Timeline: Extremely compact & sharp, taking 50% less vertical height */}
          <div className="block md:hidden text-left max-w-sm mx-auto space-y-3" id="mobile-methodology-timeline">
            <div className="relative border-l border-outline-variant/25 pl-4 ml-1 space-y-3.5">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-white border border-secondary flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display italic text-[11px] text-secondary leading-none">01.</span>
                    <h3 className="uppercase text-[8.5px] tracking-wider font-bold text-primary">Connect</h3>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-sans leading-snug">
                    Fine-art curation matching your custom stylistic aesthetics.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-white border border-secondary flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display italic text-[11px] text-secondary leading-none">02.</span>
                    <h3 className="uppercase text-[8.5px] tracking-wider font-bold text-primary">Plan</h3>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-sans leading-snug">
                    Meticulous storyboards and location scouting.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-white border border-secondary flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display italic text-[11px] text-secondary leading-none">03.</span>
                    <h3 className="uppercase text-[8.5px] tracking-wider font-bold text-primary">Capture</h3>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-sans leading-snug">
                    Documenting your day with zero intrusion and quiet cameras.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-white border border-secondary flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-secondary" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display italic text-[11px] text-secondary leading-none">04.</span>
                    <h3 className="uppercase text-[8.5px] tracking-wider font-bold text-primary">Edit</h3>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-sans leading-snug">
                    Analog color-grading and cinematic score licensing.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative">
                <div className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-secondary border border-secondary" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display italic text-[11px] text-secondary leading-none">05.</span>
                    <h3 className="uppercase text-[8.5px] tracking-wider font-bold text-primary">Deliver</h3>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-sans leading-snug">
                    Museum-grade linen-bound albums and raw archives access.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Elegant Sequence: hidden on mobile, wide grid on mid/large */}
          <div className="hidden md:grid grid-cols-5 gap-8 text-left" id="desktop-methodology-grid">
            {/* Step 1 */}
            <div className="flex md:flex-col items-start gap-3 md:gap-0 md:space-y-4 border-t border-outline-variant/20 pt-3 md:pt-6 group hover:border-secondary transition-colors duration-500 w-full">
              <span className="text-secondary text-sm md:text-2xl font-display italic flex-shrink-0 min-w-[1rem] leading-none">01.</span>
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="uppercase text-[9px] md:text-xs tracking-wider md:tracking-widest font-bold text-primary">Connect</h3>
                <p className="text-[9px] md:text-[11px] text-on-surface-variant leading-relaxed text-justify md:text-left pr-1 md:pr-0">
                  Defining your custom artistic vision and configuring your personal, fine-art wedding aesthetics.
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex md:flex-col items-start gap-3 md:gap-0 md:space-y-4 border-t border-outline-variant/20 pt-3 md:pt-6 group hover:border-secondary transition-colors duration-500 w-full">
              <span className="text-secondary text-sm md:text-2xl font-display italic flex-shrink-0 min-w-[1rem] leading-none">02.</span>
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="uppercase text-[9px] md:text-xs tracking-wider md:tracking-widest font-bold text-primary">Plan</h3>
                <p className="text-[9px] md:text-[11px] text-on-surface-variant leading-relaxed text-justify md:text-left pr-1 md:pr-0">
                  Meticulous storyboard development, cinematic timeline drafting, and advanced location scouting.
                </p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex md:flex-col items-start gap-3 md:gap-0 md:space-y-4 border-t border-outline-variant/20 pt-3 md:pt-6 group hover:border-secondary transition-colors duration-500 w-full">
              <span className="text-secondary text-sm md:text-2xl font-display italic flex-shrink-0 min-w-[1rem] leading-none">03.</span>
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="uppercase text-[9px] md:text-xs tracking-wider md:tracking-widest font-bold text-primary">Capture</h3>
                <p className="text-[9px] md:text-[11px] text-on-surface-variant leading-relaxed text-justify md:text-left pr-1 md:pr-0">
                  Documenting your celebratory days with absolute zero intrusion, quiet cameras, and elegant precision.
                </p>
              </div>
            </div>
            {/* Step 4 */}
            <div className="flex md:flex-col items-start gap-3 md:gap-0 md:space-y-4 border-t border-outline-variant/20 pt-3 md:pt-6 group hover:border-secondary transition-colors duration-500 w-full">
              <span className="text-secondary text-sm md:text-2xl font-display italic flex-shrink-0 min-w-[1rem] leading-none">04.</span>
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="uppercase text-[9px] md:text-xs tracking-wider md:tracking-widest font-bold text-primary">Edit</h3>
                <p className="text-[9px] md:text-[11px] text-on-surface-variant leading-relaxed text-justify md:text-left pr-1 md:pr-0">
                  Signature analog color-grading, editorial montage composition, and customized score licensing.
                </p>
              </div>
            </div>
            {/* Step 5 */}
            <div className="flex md:flex-col items-start gap-3 md:gap-0 md:space-y-4 border-t border-outline-variant/20 pt-3 md:pt-6 group hover:border-secondary transition-colors duration-500 w-full">
              <span className="text-secondary text-sm md:text-2xl font-display italic flex-shrink-0 min-w-[1rem] leading-none">05.</span>
              <div className="space-y-0.5 md:space-y-1">
                <h3 className="uppercase text-[9px] md:text-xs tracking-wider md:tracking-widest font-bold text-primary">Deliver</h3>
                <p className="text-[9px] md:text-[11px] text-on-surface-variant leading-relaxed text-justify md:text-left pr-1 md:pr-0">
                  Premium digital archival vault access alongside custom museum-grade linen-bound albums.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPECIFIC SELECTED WORKS (EDITORIAL MASONRY COUTURE) */}
      <section className="py-28 md:py-36 px-6 md:px-20 max-w-7xl mx-auto relative z-10" id="selected-works-section">
        {/* Grid Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 md:mb-24 gap-8 border-b border-outline-variant/20 pb-10">
          <div className="space-y-4">
            <span className="font-sans text-xs tracking-[0.4em] text-secondary block uppercase font-bold">
              SELECTED PORTFOLIO
            </span>
            <h3 className="font-display text-4xl md:text-6xl text-primary font-light">
              Curated Memories
            </h3>
          </div>
          <p className="font-sans text-xs md:text-sm text-on-surface-variant max-w-xs md:text-right leading-relaxed">
            A visual journal of haute-couture documentation, quiet intimacy, and stunning architectural backdrops.
          </p>
        </div>

        {/* GRID LAYOUT - 12 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
          {/* Item 1: Large Vertical - Heritage Union */}
          {homeStories[0] && (
            <div className="md:col-span-7 group cursor-pointer space-y-6" id={`portfolio-item-${homeStories[0].id}`}>
              <div
                onClick={() => onSelectStory(homeStories[0])}
                className="relative overflow-hidden aspect-[3/4] border border-outline-variant/10 shadow-sm"
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-[2.2s] group-hover:scale-105 grayscale group-hover:grayscale-0"
                  src={resolveImage(homeStories[0].image || "/src/assets/images/regenerated_image_1780314364148.jpg")}
                  alt={homeStories[0].photogAlt}
                  referrerPolicy="no-referrer"
                ></img>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-500">
                  <span className="font-sans text-[10px] tracking-[0.3em] text-white border border-white/40 px-6 py-2.5 bg-black/40 backdrop-blur-sm">
                    VIEW ARCHIVAL GALLERY
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <h4 className="font-display text-2xl italic text-primary">
                  {homeStories[0].title}
                </h4>
                <span className="font-sans text-[9px] text-secondary tracking-[0.3em] uppercase font-bold">
                  {homeStories[0].location}
                </span>
              </div>
            </div>
          )}

          {/* Item 2: Offset Square - Lakeside Noir */}
          {homeStories[1] && (
            <div className="md:col-span-5 md:mt-40 group cursor-pointer space-y-6" id={`portfolio-item-${homeStories[1].id}`}>
              <div
                onClick={() => onSelectStory(homeStories[1])}
                className="relative overflow-hidden aspect-square border border-outline-variant/10 shadow-sm"
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-[2.2s] group-hover:scale-105 grayscale group-hover:grayscale-0"
                  src={resolveImage(homeStories[1].image || "/src/assets/images/regenerated_image_1780314369667.jpg")}
                  alt={homeStories[1].photogAlt}
                  referrerPolicy="no-referrer"
                ></img>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-500">
                  <span className="font-sans text-[10px] tracking-[0.3em] text-white border border-white/40 px-6 py-2.5 bg-black/40 backdrop-blur-sm">
                    VIEW ARCHIVAL GALLERY
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <span className="font-sans text-[9px] text-secondary tracking-[0.3em] block mb-1.5 uppercase font-bold">
                  {homeStories[1].location}
                </span>
                <h4 className="font-display text-2xl italic text-primary">
                  {homeStories[1].title}
                </h4>
              </div>
            </div>
          )}

          {/* Item 3: Center Wide - Florence */}
          {homeStories[2] && (
            <div className="md:col-span-12 mt-12 md:mt-20 group cursor-pointer space-y-6" id={`portfolio-item-${homeStories[2].id}`}>
              <div
                onClick={() => onSelectStory(homeStories[2])}
                className="relative overflow-hidden aspect-[16/8] md:aspect-[21/9] border border-outline-variant/10 shadow-sm"
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-[2.2s] group-hover:scale-105 grayscale group-hover:grayscale-0"
                  src={resolveImage(homeStories[2].image || "/src/assets/images/regenerated_image_1780315951259.jpg")}
                  alt={homeStories[2].photogAlt}
                  referrerPolicy="no-referrer"
                ></img>
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-500">
                  <span className="font-sans text-[10px] tracking-[0.3em] text-white border border-white/40 px-6 py-2.5 bg-black/40 backdrop-blur-sm">
                    VIEW ARCHIVAL GALLERY
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <h4 className="font-display text-2xl text-primary font-normal">
                  {homeStories[2].title}
                </h4>
                <span className="font-sans text-[9px] text-secondary tracking-[0.3em] uppercase font-bold">
                  {homeStories[2].location}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5.5 CLIENT ALBUMS PREVIEW (SHOWCASING THE SIX MASTER COVERS) */}
      <section className="py-28 md:py-36 bg-[#FAF9F6] border-t border-b border-outline-variant/15 relative z-10" id="home-album-covers-section">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 md:mb-24 gap-8 border-b border-outline-variant/20 pb-10">
            <div className="space-y-4">
              <span className="font-sans text-xs tracking-[0.4em] text-secondary block uppercase font-bold">
                DOCUMENTARY VAULTS
              </span>
              <h3 className="font-display text-4xl md:text-6xl text-primary font-light">
                Ivory's Client Albums
              </h3>
            </div>
            <div className="max-w-xs space-y-3 md:text-right">
              <p className="font-sans text-xs md:text-sm text-outline leading-relaxed text-justify">
                A showcase of six master legacy templates. Click any edition below to open its dedicated archive stream, upload dynamic photographs, or inspect high-fashion layouts.
              </p>
              <button
                onClick={onNavigateToAlbums}
                className="inline-flex items-center gap-2 font-sans text-[10px] tracking-wider uppercase font-bold text-secondary hover:text-primary transition-colors"
                id="home-btn-view-all-albums"
              >
                <span>OPEN DIGITAL REGISTRY</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Album Grid (6 Items) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14" id="home-albums-covers-grid">
            {albums.map((alb) => (
              <motion.div
                key={alb.id}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group cursor-pointer space-y-6 flex flex-col justify-between"
                onClick={onNavigateToAlbums}
                id={`home-album-cover-card-${alb.id}`}
              >
                <div className="space-y-4">
                  <div className="aspect-[3/4] relative overflow-hidden bg-surface-container border border-outline-variant/15 shadow-sm">
                    {alb.coverImage || alb.photos.length > 0 ? (
                      <img
                        src={resolveImage(alb.coverImage || alb.photos[0])}
                        alt={alb.title}
                        className="w-full h-full object-cover transition-all duration-[1.8s] scale-100 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#121212] to-[#1e1e1e] flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <ImageIcon className="w-8 h-8 text-[#d4af37]/60" />
                        <span className="font-display text-sm tracking-widest text-[#FAF9F6] uppercase font-medium">Bespoke Vault Empty</span>
                      </div>
                    )}
                    
                    {/* Location Badge Stamp */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[8px] tracking-[0.2em] font-sans font-bold text-primary uppercase">
                      {alb.location} • {alb.year}
                    </div>

                    {/* Overlay Indicator */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-500">
                      <span className="font-sans text-[9px] tracking-[0.3em] text-white border border-white/40 px-5 py-2 bg-black/45 backdrop-blur-sm uppercase">
                        Manage Ledger
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display text-2xl text-primary font-normal leading-snug group-hover:text-secondary group-hover:italic transition-all">
                      {alb.title}
                    </h4>
                    <p className="font-sans text-[10px] text-outline uppercase tracking-[0.25em] font-semibold">
                      {alb.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-[9px] tracking-wider uppercase font-bold text-outline group-hover:text-primary transition-colors">
                  <span>Explore Collection</span>
                  <BookOpen className="w-3.5 h-3.5 text-secondary" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 5.6 CLIENT VIDEOS PREVIEW (SHOWCASING THE SIX MASTER COVERS) */}
      <section className="py-28 md:py-36 bg-[#F4F3F0] border-b border-outline-variant/15 relative z-10" id="home-video-covers-section">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 md:mb-24 gap-8 border-b border-outline-variant/20 pb-10">
            <div className="space-y-4">
              <span className="font-sans text-xs tracking-[0.4em] text-secondary block uppercase font-bold">
                CINEMATIC REELS
              </span>
              <h3 className="font-display text-4xl md:text-6xl text-primary font-light">
                Ivory's Client Videos
              </h3>
            </div>
            <div className="max-w-xs space-y-3 md:text-right">
              <p className="font-sans text-xs md:text-sm text-outline leading-relaxed text-justify">
                A showcase of six master cinematic creations. Click any ledger below to open its dedicated film streams, play gorgeous documentaries, or paste custom video URLs.
              </p>
              <button
                onClick={onNavigateToVideos}
                className="inline-flex items-center gap-2 font-sans text-[10px] tracking-wider uppercase font-bold text-secondary hover:text-primary transition-colors"
                id="home-btn-view-all-videos"
              >
                <span>OPEN DIGITAL CINEMA</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Videos Grid (6 Items) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14" id="home-videos-covers-grid">
            {videoAlbums.map((alb) => (
              <motion.div
                key={alb.id}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group cursor-pointer space-y-6 flex flex-col justify-between"
                onClick={onNavigateToVideos}
                id={`home-video-cover-card-${alb.id}`}
              >
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
                        <Film className="w-8 h-8 text-[#d4af37]/75 group-hover:scale-110 transition-transform duration-500" />
                        <span className="font-display text-sm tracking-widest text-[#FAF9F6] uppercase font-semibold text-white">{alb.title}</span>
                        <span className="font-sans text-[8px] tracking-[0.2em] text-[#d4af37]/70 uppercase">Cine Reel Documentary</span>
                      </div>
                    )}
                    
                    {/* Location Badge Stamp */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[8px] tracking-[0.2em] font-sans font-bold text-primary uppercase">
                      {alb.location} • {alb.year}
                    </div>

                    {/* Play symbol on hover indicator */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/35 transition-all duration-500">
                      <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display text-2xl text-primary font-normal leading-snug group-hover:text-secondary group-hover:italic transition-all">
                      {alb.title}
                    </h4>
                    <p className="font-sans text-[10px] text-outline uppercase tracking-[0.25em] font-semibold">
                      {alb.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-[9px] tracking-wider uppercase font-bold text-outline group-hover:text-primary transition-colors">
                  <span>Stream Master Cinema</span>
                  <Film className="w-3.5 h-3.5 text-secondary" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. INTEGRATED INQUIRY booking / CONTACT AREA */}
      <section id="contact" className="py-28 md:py-36 bg-primary text-white relative z-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2 className="font-display text-5xl md:text-7xl mb-6 text-white font-normal">
              Begin Your Story
            </h2>
            <p className="text-white/60 mb-8 uppercase tracking-[0.3em] text-[10px] font-bold">
              Now registering 2024 & 2025 celebration volumes worldwide
            </p>

            {/* Direct Hotlinks & WhatsApp Connect Badges */}
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mb-16 max-w-2xl mx-auto" id="contact-live-social-badges">
              <a
                href="https://www.instagram.com/ivoryutkarshtales/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full border border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-[11px] font-sans uppercase font-bold tracking-widest group shadow-sm"
              >
                <Instagram className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
                <span>Instagram</span>
              </a>
              <a
                href="https://www.facebook.com/utkarshabhijit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full border border-white/10 hover:border-white/35 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all text-[11px] font-sans uppercase font-bold tracking-widest group shadow-sm"
              >
                <Facebook className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" />
                <span>Facebook</span>
              </a>
              <a
                href="https://wa.me/917250588087"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full border border-emerald-500/25 hover:border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-white/95 hover:text-white transition-all text-[11px] font-sans uppercase font-bold tracking-widest group shadow-md"
              >
                {/* Official WhatsApp Logo SVG */}
                <svg className="w-4 h-4 fill-emerald-400 group-hover:scale-115 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.431 2.5 1.157 3.472L6.8 17.584l2.25-.724c.951.58 2.062.913 3.253.913 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.766-5.766zm3.398 7.391c-.131.393-.787.787-1.127.787-.34 0-1.442-.458-2.361-1.378-.918-.918-1.377-2.02-1.377-2.361 0-.34.394-.996.787-1.127.131-.065.262-.065.328 0h.131l.262.656c.131.328.262.656.262.721 0 .131-.131.262-.262.393l-.262.262c-.066.066-.066.197 0 .262.394.525.853.984 1.378 1.378.066.066.197.066.262 0l.262-.262c.131-.131.262-.262.393-.262h.066l.721.262c.328.131.656.262.721.262.066.131.066.262 0 .393zm6.54-5.342c-.004 6.536-5.257 11.786-11.73 11.786-2.001-.001-3.97-.509-5.715-1.478L0 24l1.687-6.163C.646 16.033.099 13.988.1 11.891.102 5.248 5.356-.002 11.825-.002c3.136.001 6.086 1.221 8.3 3.438 2.215 2.218 3.431 5.169 3.43 8.305zm-1.554 0c.002-2.542-.99-4.933-2.793-6.737C14.417 2.547 11.995 1.55 9.461 1.55c-5.253 0-9.53 4.273-9.534 9.518-.001 1.93.536 3.8 1.554 5.437l-1.021 3.73 3.834-.999c1.624.886 3.354 1.348 5.148 1.348 5.253 0 9.53-4.27 9.533-9.516z" />
                </svg>
                <span>WhatsApp: 7250588087</span>
              </a>
            </div>
          </motion.div>

          {formSubmitted ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-md p-10 md:p-14 border border-white/20 max-w-2xl mx-auto space-y-6 text-center"
            >
              <CheckCircle2 className="w-16 h-16 text-secondary mx-auto" />
              <h3 className="font-display text-3xl text-white font-normal">
                Thank you, {formData.name || "Aesthetic Seeker"}
              </h3>
              <p className="font-sans text-xs text-white/80 leading-relaxed max-w-md mx-auto">
                Your luxury storytelling registry application has been synchronized. Utkarsh and our lead visual planners will review your request and get back to you within 24 hours.
              </p>
              <div className="h-[1px] bg-white/20 w-16 mx-auto" />
              <p className="font-sans text-[10px] uppercase text-secondary tracking-widest font-semibold">
                SEALED & ARCHIVED • REGISTRY #{(Math.floor(Math.random() * 900000) + 100000)}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-left">
              <div className="border-b border-white/20 py-2">
                <label className="text-[9px] uppercase tracking-widest block mb-1 opacity-50 font-bold">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-transparent w-full focus:outline-none py-1 text-sm text-white font-sans placeholder-white/30"
                  required
                  placeholder="e.g. Ananya Sen"
                />
              </div>
              <div className="border-b border-white/20 py-2">
                <label className="text-[9px] uppercase tracking-widest block mb-1 opacity-50 font-bold">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-transparent w-full focus:outline-none py-1 text-sm text-white font-sans placeholder-white/30"
                  required
                  placeholder="e.g. ananya@domain.com"
                />
              </div>
              <div className="border-b border-white/20 py-2">
                <label className="text-[9px] uppercase tracking-widest block mb-1 opacity-50 font-bold">Date & Location</label>
                <input
                  type="text"
                  name="dateLocation"
                  value={formData.dateLocation}
                  onChange={handleInputChange}
                  className="bg-transparent w-full focus:outline-none py-1 text-sm text-white font-sans placeholder-white/30"
                  placeholder="e.g. Dec 2024, Jaipur Fort"
                />
              </div>
              <div className="border-b border-white/20 py-2">
                <label className="text-[9px] uppercase tracking-widest block mb-1 opacity-50 font-bold">How did you find us?</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="bg-transparent w-full focus:outline-none py-1 text-sm text-white font-sans placeholder-white/30"
                  placeholder="e.g. Vogue, Instagram, Friends"
                />
              </div>
              <div className="md:col-span-2 border-b border-white/20 py-2">
                <label className="text-[9px] uppercase tracking-widest block mb-1 opacity-50 font-bold">Tell us more</label>
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleInputChange}
                  className="bg-transparent w-full focus:outline-none py-1 text-sm text-white font-sans h-24 placeholder-white/30 resize-none"
                  placeholder="Describe your design aesthetics, guests volume, or custom film details..."
                />
              </div>
              <div className="md:col-span-2 text-center pt-8">
                <button
                  type="submit"
                  className="px-12 py-4 font-sans text-xs uppercase tracking-[3px] border border-white text-white hover:bg-white hover:text-black transition-all duration-700 bg-black/10"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
