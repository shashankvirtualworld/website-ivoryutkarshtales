import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Trash2,
  Lock,
  Unlock,
  Sliders,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Loader,
  Grid,
  Filter,
  Image as ImageIcon
} from "lucide-react";
import { loadPortfolioGridImages, savePortfolioGridImages, compressImage } from "../utils/storage";
import { resolveImage } from "../data";

interface PortfolioGridImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  dateAdded: number;
}

export default function PortfolioGrid() {
  const [images, setImages] = useState<PortfolioGridImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<PortfolioGridImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Administrative / Editor control state
  const [isEditorUnlocked, setIsEditorUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [showPassModal, setShowPassModal] = useState<boolean>(false);

  // Drag and Drop upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightroom Viewer State
  const [lightBoxIndex, setLightBoxIndex] = useState<number | null>(null);

  // Pagination for heavy grids (120-150 count)
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Aesthetic Customization State (Enables custom arrangement)
  const [cols, setCols] = useState<number>(4); // Default 4 dynamic columns
  const [aspectRatio, setAspectRatio] = useState<string>("3/4"); // Default classic portrait
  const [sortBy, setSortBy] = useState<string>("newest"); // Sequence order configuration

  // Load portfolio images on mount
  useEffect(() => {
    async function initPortfolio() {
      setIsLoading(true);
      const data = await loadPortfolioGridImages();
      setImages(data);
      setIsLoading(false);

      // Auto-unlock workspace if empty to let user begin curation effortlessly
      if (data.length === 0) {
        setIsEditorUnlocked(true);
        localStorage.setItem("ivory_portfolio_unlocked", "true");
      }
    }
    initPortfolio();

    // Recover admin session if saved
    const isUnlocked = localStorage.getItem("ivory_portfolio_unlocked") === "true";
    if (isUnlocked) {
      setIsEditorUnlocked(true);
    }
  }, []);

  // Periodic real-time background sync loop with IndexedDB
  useEffect(() => {
    let active = true;
    const syncLoop = setInterval(async () => {
      if (!active) return;
      const currentList = await loadPortfolioGridImages();
      // Compare both structure and content to avoid redundant updates
      const isModified = currentList.length !== images.length || currentList.some((img, idx) => {
        const item = images[idx];
        return !item || item.id !== img.id || item.src !== img.src || item.alt !== img.alt || item.category !== img.category;
      });
      if (isModified && active) {
        setImages(currentList);
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(syncLoop);
    };
  }, [images]);

  // Sync / Filter and Sort images dynamically
  useEffect(() => {
    let result = [...images];

    // 1. Dynamic Category Filter
    if (selectedCategory !== "All") {
      result = result.filter((img) => img.category === selectedCategory);
    }

    // 2. Real-time Curation Sorting Sequence
    if (sortBy === "newest") {
      result.sort((a, b) => b.dateAdded - a.dateAdded);
    } else if (sortBy === "oldest") {
      result.sort((a, b) => a.dateAdded - b.dateAdded);
    } else if (sortBy === "alphabetical") {
      result.sort((a, b) => (a.alt || "untitled").localeCompare(b.alt || "untitled"));
    } else if (sortBy === "category") {
      result.sort((a, b) => a.category.localeCompare(b.category));
    }

    setFilteredImages(result);
  }, [images, selectedCategory, sortBy]);

  const categories = ["All", "Couture", "Editorial", "Intimate", "Ceremony", "Scenic", "Landscape"];

  // Unlock Admin Auth
  const handleUnlockCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passwordInput.trim().toUpperCase();
    if (clean === "IVORY" || clean === "UTKARSH2026") {
      setIsEditorUnlocked(true);
      localStorage.setItem("ivory_portfolio_unlocked", "true");
      setPasswordInput("");
      setAuthError("");
      setShowPassModal(false);
    } else {
      setAuthError("Signature mismatch. Try 'IVORY' or 'UTKARSH2026'");
    }
  };

  const handleLockSession = () => {
    setIsEditorUnlocked(false);
    localStorage.removeItem("ivory_portfolio_unlocked");
  };

  // Safe file loader and compression loop (batch size of 4 to prevent frame freeze)
  const processFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    setUploadProgress({ current: 0, total: validFiles.length, label: "Initializing fine-art compression..." });

    const newUploadedImages: PortfolioGridImage[] = [];

    // Compress concurrently in smaller batches
    const batchSize = 4;
    for (let i = 0; i < validFiles.length; i += batchSize) {
      const batch = validFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map((file) => {
        return new Promise<PortfolioGridImage | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Str = reader.result as string;
              // Compress to 1200px max width which offers pristine visual quality at around 60KB
              const compressed = await compressImage(base64Str, 1200, 0.72);
              
              resolve({
                id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                src: compressed,
                alt: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "), // readable default alt
                category: selectedCategory === "All" ? "Editorial" : selectedCategory,
                dateAdded: Date.now() + Math.random() // avoid duplicate stamps
              });
            } catch (err) {
              console.error("[Curation] Compression failed for file:", file.name, err);
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      });

      const batchResults = await Promise.all(batchPromises);
      const filteredResults = batchResults.filter((item): item is PortfolioGridImage => item !== null);
      newUploadedImages.push(...filteredResults);

      const currentProcessed = Math.min(i + batchSize, validFiles.length);
      setUploadProgress({
        current: currentProcessed,
        total: validFiles.length,
        label: `Calibrated ${currentProcessed} of ${validFiles.length} luxury plates...`
      });
    }

    // Append to existing images and save
    const updatedImages = [...newUploadedImages, ...images];
    setImages(updatedImages);
    await savePortfolioGridImages(updatedImages);
    setUploadProgress(null);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditorUnlocked) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isEditorUnlocked) return;
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  // Delete Individual Image
  const handleDeleteImage = async (id: string) => {
    if (confirm("Permanently dismiss this fine-art photo from the portfolio grid?")) {
      const remainingArr = images.filter((img) => img.id !== id);
      setImages(remainingArr);
      await savePortfolioGridImages(remainingArr);
      
      // adjust lightbox index if active
      if (lightBoxIndex !== null && lightBoxIndex >= remainingArr.length) {
        setLightBoxIndex(null);
      }
    }
  };

  // Update image properties
  const handleUpdateImageDetails = async (id: string, updatedFields: Partial<PortfolioGridImage>) => {
    const updated = images.map((img) => {
      if (img.id === id) {
        return { ...img, ...updatedFields };
      }
      return img;
    });
    setImages(updated);
    await savePortfolioGridImages(updated);
  };

  // Bulk Delete option
  const handleClearAllDrafts = async () => {
    if (confirm("WARNING: Are you sure you want to delete ALL portfolio images? This cannot be undone.")) {
      setImages([]);
      await savePortfolioGridImages([]);
    }
  };

  // Artistic Random Shuffle algorithm
  const handleShufflePlates = async () => {
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    setImages(shuffled);
    await savePortfolioGridImages(shuffled);
  };

  // Convert column count selection to exact Tailwind grid layout classes
  const getGridColsClass = () => {
    switch (cols) {
      case 2:
        return "grid-cols-2 gap-1.5 sm:gap-2";
      case 3:
        return "grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2";
      case 5:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-1.5";
      case 6:
        return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1";
      case 4:
      default:
        return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2";
    }
  };

  // Convert aspect crop ratio selection to exact responsive aspect-ratio utilities
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "1/1":
        return "aspect-square";
      case "16/9":
        return "aspect-video";
      case "auto":
        return "aspect-auto h-auto";
      case "3/4":
      default:
        return "aspect-[3/4]";
    }
  };

  // Lightbox Navigation
  const navigateLightBox = (direction: "prev" | "next") => {
    if (lightBoxIndex === null) return;
    if (direction === "prev") {
      setLightBoxIndex(lightBoxIndex === 0 ? filteredImages.length - 1 : lightBoxIndex - 1);
    } else {
      setLightBoxIndex(lightBoxIndex === filteredImages.length - 1 ? 0 : lightBoxIndex + 1);
    }
  };

  return (
    <section className="bg-[#FAF9F6] py-24 border-b border-outline-variant/15 relative z-10" id="curator-portfolio-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
        {/* Dynamic Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-sans text-[9px] tracking-[0.4em] text-outline uppercase block font-semibold">
                FINE ART ARCHIVAL LEDGER
              </span>
              <span className="w-1 md:w-2 h-[1px] bg-secondary/60"></span>
              <span className="font-mono text-[9px] text-secondary tracking-widest uppercase">
                {images.length} Captured Plates
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary font-normal leading-none tracking-wide">
              The Curator's <span className="italic font-light">Portfolio Grid</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {isEditorUnlocked ? (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-green-700 bg-green-500/10 px-2 py-1 font-mono uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                  Editor Mode Unlocked
                </span>
                <button
                  onClick={handleLockSession}
                  className="flex items-center gap-1.5 border border-outline-variant/30 hover:border-red-500/50 hover:bg-red-500/5 px-3 py-1.5 text-[9px] uppercase tracking-wider font-semibold text-outline transition-colors duration-200"
                >
                  <Lock className="w-3 h-3" /> Secure Vault
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPassModal(true)}
                className="flex items-center gap-1.5 border border-primary/20 hover:border-primary hover:bg-primary/5 px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-primary transition-all duration-300 shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" /> Unlock Editor Mode
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Filtering Bar */}
        <div className="flex flex-wrap gap-2 items-center justify-between border-b border-outline-variant/15 pb-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(24); // Reset pagination index
                }}
                className={`px-4 py-1.5 text-[10px] tracking-widest uppercase font-semibold transition-all duration-300 ${
                  selectedCategory === cat
                    ? "bg-primary text-surface shadow-xs"
                    : "text-outline hover:text-primary bg-surface-container-low/40 hover:bg-surface-container-low/90 border border-outline-variant/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isEditorUnlocked && images.length > 0 && (
            <button
              onClick={handleClearAllDrafts}
              className="text-[9px] text-outline-variant hover:text-red-600 uppercase font-semibold tracking-wider font-sans flex items-center gap-1 px-2 py-1 hover:bg-red-500/5 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Purge Portfolio
            </button>
          )}
        </div>

        {/* Drag and drop panel (Only visible when logged in) */}
        {isEditorUnlocked && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer mb-8 border-2 border-dashed rounded-xs p-10 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-outline-variant/40 hover:border-primary/50 bg-surface-container-low/20"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-outline bg-[#FAF9F6] shadow-2xs group-hover:bg-primary/5">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-lg text-primary">
                  Drag & Drop up to <span className="font-semibold italic">120 - 150 Fine Art Images</span> here
                </p>
                <p className="font-sans text-[10px] text-outline uppercase tracking-wider">
                  Or click on this console frame to browse your system files
                </p>
                <p className="font-serif text-[11px] text-secondary italic block">
                  Automatic compression pipeline calibrated for {selectedCategory === "All" ? "Editorial" : selectedCategory} list
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing/Compression Progress Modal Banner */}
        <AnimatePresence>
          {uploadProgress && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-[#EFEFE4] border-l-4 border-primary p-4 mb-8 flex flex-col justify-center space-y-2 text-xs"
            >
              <div className="flex justify-between items-center text-primary font-bold">
                <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  {uploadProgress.label}
                </span>
                <span className="font-mono text-[10px]">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#DFDFD3] h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-primary h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-[9px] text-[#707060] uppercase block">
                Sequential fine-art curation ensures maximum frame performance with high density images. Please do not close this window.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Aesthetic Alignment & Curation Deck */}
        {images.length > 0 && (
          <div className="bg-[#FAF9F5] border border-outline-variant/20 p-5 rounded-xs mb-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between text-xs text-primary shadow-xs">
            <div className="flex flex-wrap items-center gap-6">
              {/* Columns layout selector */}
              <div className="space-y-1.5">
                <span className="font-sans text-[8px] tracking-[0.2em] text-[#707060]/80 uppercase block font-bold">
                  Grid Columns Layout
                </span>
                <div className="flex bg-[#E9E8DF] p-0.5 rounded-xs gap-0.5">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setCols(num)}
                      className={`px-3 py-1 text-[9px] font-mono rounded-xs transition-all ${
                        cols === num ? "bg-primary text-surface font-semibold shadow-xs" : "text-primary/70 hover:text-primary"
                      }`}
                      title={`${num} Columns`}
                    >
                      {num} Col
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect crop ratios selector */}
              <div className="space-y-1.5">
                <span className="font-sans text-[8px] tracking-[0.2em] text-[#707060]/80 uppercase block font-bold">
                  Plate Crop Ratio
                </span>
                <div className="flex bg-[#E9E8DF] p-0.5 rounded-xs gap-0.5">
                  {[
                    { value: "3/4", label: "Classic (3:4)" },
                    { value: "1/1", label: "Square (1:1)" },
                    { value: "16/9", label: "Cinematic" },
                    { value: "auto", label: "Organic" },
                  ].map((aspect) => (
                    <button
                      key={aspect.value}
                      onClick={() => setAspectRatio(aspect.value)}
                      className={`px-3 py-1 text-[9px] rounded-xs font-sans font-medium uppercase tracking-wider transition-all ${
                        aspectRatio === aspect.value ? "bg-primary text-surface shadow-xs" : "text-primary/70 hover:text-primary"
                      }`}
                    >
                      {aspect.value === "3/4" ? "3:4" : aspect.value === "1/1" ? "1:1" : aspect.value === "16/9" ? "16:9" : "Organic"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curation sequence sorting options */}
              <div className="space-y-1.5">
                <span className="font-sans text-[8px] tracking-[0.2em] text-[#707060]/80 uppercase block font-bold">
                  Aesthetic Sequence Sort
                </span>
                <div className="flex bg-[#E9E8DF] p-0.5 rounded-xs gap-0.5">
                  {[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "alphabetical", label: "A - Z (Name)" },
                    { value: "category", label: "Category" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={`px-3 py-1 text-[9px] rounded-xs font-sans font-medium uppercase tracking-wider transition-all ${
                        sortBy === opt.value ? "bg-primary text-surface shadow-xs" : "text-primary/70 hover:text-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions / Shuffle and arrangement trigger */}
            <div className="flex items-center gap-3 self-stretch lg:self-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-outline-variant/10">
              <button
                onClick={handleShufflePlates}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 border border-primary/20 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all duration-300 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-[#707060] rounded-xs cursor-pointer"
                title="Randomly shuffle the wedding plates sequence"
              >
                <Sliders className="w-3 h-3" /> SHUFFLE PLATES
              </button>
            </div>
          </div>
        )}

        {/* Portfolio Area Content Container */}
        <div>
          {isLoading ? (
            <div className="text-center py-24">
              <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="font-serif text-sm italic text-outline">Polishing fine-art canvas...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-20 px-6 bg-surface-container-low border border-dashed border-outline-variant/30 rounded-xs">
              <ImageIcon className="w-12 h-12 text-outline-variant/60 mx-auto mb-4" />
              <h3 className="font-display text-2xl text-primary font-normal mb-2">
                Your Empty Portfolio Canvas is Prepped
              </h3>
              <p className="font-serif text-sm italic text-secondary leading-relaxed max-w-lg mx-auto mb-6">
                "Every great curated presentation begins with an absolutely clean archival ledger."
                You can populate up to 120 - 150 fine-art plates from your laptop's local storage.
              </p>
              {isEditorUnlocked ? (
                <div className="space-y-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-primary text-surface text-[10px] uppercase font-bold tracking-widest hover:bg-secondary active:scale-95 transition-all shadow-md inline-flex items-center gap-2 rounded-xs"
                  >
                    <Upload className="w-4 h-4" /> Select Fine Art Files
                  </button>
                  <p className="text-[10px] text-outline uppercase tracking-widest block font-sans">
                    Or drag and drop your high-resolution images anywhere on this workspace box
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowPassModal(true)}
                  className="px-6 py-2.5 border border-primary text-primary hover:bg-primary/5 text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer rounded-xs"
                >
                  <Unlock className="w-3.5 h-3.5 inline mr-1" /> Access Curator Desk
                </button>
              )}
            </div>
          ) : (
            /* PORTFOLIO MASONRY / DENSE INTERACTIVE GRID */
            <div className="space-y-12">
              <div className={`grid ${getGridColsClass()}`} id="portfolio-images-grid">
                {filteredImages.slice(0, visibleCount).map((img, idx) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: Math.min((idx % cols) * 0.08, 0.3) }}
                    className="group relative flex flex-col overflow-hidden transition-all duration-300 rounded-sm bg-[#EAE8E0]"
                  >
                    {/* Photo Frame Container - Tightly fitted without padding, margins, or card borders */}
                    <div
                      onClick={() => setLightBoxIndex(filteredImages.indexOf(img))}
                      className={`relative ${getAspectRatioClass()} overflow-hidden cursor-pointer`}
                    >
                      <img
                        src={resolveImage(img.src)}
                        alt={img.alt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                      />

                      {/* Integrated Premium Hover Overlay with all curation tools inside */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5 duration-300 z-10 select-none">
                        
                        {/* Top Control Bar: Category & Trash Delete button */}
                        <div className="flex justify-between items-center w-full gap-2" onClick={(e) => e.stopPropagation()}>
                          {isEditorUnlocked ? (
                            <select
                              value={img.category}
                              onChange={(e) => handleUpdateImageDetails(img.id, { category: e.target.value })}
                              className="bg-black/90 text-[8px] text-white/90 py-0.5 px-1.5 border border-white/20 rounded-xs focus:outline-none font-sans font-medium uppercase tracking-wider cursor-pointer"
                            >
                              {categories.filter(c => c !== "All").map(c => (
                                <option key={c} value={c} className="bg-neutral-950 text-white/90">{c}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="bg-white/95 text-primary py-0.5 px-2 text-[8px] tracking-widest uppercase font-bold rounded-2xs shadow-xs">
                              {img.category}
                            </span>
                          )}

                          {/* Functional Delete trash trigger */}
                          {isEditorUnlocked && (
                            <button
                              onClick={(e) => {
                                // Essential to block opening lightbox
                                e.stopPropagation();
                                handleDeleteImage(img.id);
                              }}
                              className="bg-red-600 hover:bg-red-700 active:scale-90 text-white p-1.5 rounded-xs transition-all duration-200 cursor-pointer flex items-center justify-center shadow-md relative z-30 pointer-events-auto"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Middle View Indicator */}
                        <div className="flex justify-center items-center flex-1 pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Bottom Caption Overlay */}
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                          {isEditorUnlocked ? (
                            <input
                              type="text"
                              value={img.alt}
                              onChange={(e) => handleUpdateImageDetails(img.id, { alt: e.target.value })}
                              className="w-full bg-neutral-900/90 text-white/95 text-[9px] px-2 py-1 border border-white/10 focus:border-white/30 focus:outline-none font-sans rounded-xs shadow-inner"
                              placeholder="Change plate title..."
                            />
                          ) : (
                            img.alt && (
                              <p className="text-[10px] text-white/90 text-center truncate font-serif italic max-w-full px-1 leading-snug tracking-wide">
                                {img.alt}
                              </p>
                            )
                          )}
                        </div>

                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination Load More control for heavy density sheets */}
              {filteredImages.length > visibleCount && (
                <div className="text-center pt-8">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="px-8 py-3.5 border border-primary text-primary hover:bg-primary hover:text-surface text-[10px] uppercase tracking-widest font-bold transition-all duration-300 shadow-sm"
                  >
                    LOAD MORE FINE-ART WORKS ({filteredImages.length - visibleCount} REMAINING)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* SECURE POPUP: MASTER PASSWORD SYSTEM LOCK */}
      <AnimatePresence>
        {showPassModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPassModal(false)}
              className="fixed inset-0 bg-primary/40 backdrop-blur-xs z-[60]"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-1/4 max-w-sm mx-auto bg-[#FAF9F6] border border-outline-variant/30 p-8 shadow-2xl z-[70] rounded-xs"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-sans text-[8px] tracking-[0.3em] text-outline uppercase block font-semibold">
                    MANAGED CURATION DESK
                  </span>
                  <h3 className="font-display text-xl text-primary font-bold">Unlocking Portfolio Vault</h3>
                </div>
                <button
                  onClick={() => setShowPassModal(false)}
                  className="text-primary hover:text-[#9C8F6E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUnlockCredentials} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block font-semibold">
                    Master Entry Key
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/30 px-3 py-2 text-xs focus:border-primary focus:outline-none transition-colors text-primary"
                    placeholder="Enter Private Authority Key (IVORY)"
                    required
                    autoFocus
                  />
                </div>

                {authError && (
                  <p className="text-[10px] text-red-600 italic font-medium">{authError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary hover:bg-secondary transition-colors text-surface font-sans text-xs tracking-widest font-semibold uppercase shadow-xs duration-300"
                >
                  Validate Signature
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN DIGITAL LIGHTROOM VIEWER MODAL */}
      <AnimatePresence>
        {lightBoxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col justify-between p-6 select-none"
          >
            {/* Top Bar controls */}
            <div className="flex justify-between items-center text-white/70 text-xs">
              <div>
                <span className="font-sans text-[9px] tracking-wider text-white/45 max-w-xs block uppercase">
                  ACTIVE EXHIBITION PLATE
                </span>
                <span className="font-serif italic text-white text-sm">
                  {filteredImages[lightBoxIndex]?.alt || "Curated Wedding Frame"}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-xs">
                  {lightBoxIndex + 1} / {filteredImages.length}
                </span>
                <button
                  onClick={() => setLightBoxIndex(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Middle Container for Navigation & Image Plate */}
            <div className="relative flex-1 flex items-center justify-center">
              {/* Previous Button Left */}
              <button
                onClick={() => navigateLightBox("prev")}
                className="absolute left-0 md:left-4 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/85 hover:text-white transition-all"
                title="Previous Image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Image Frame */}
              <motion.div
                key={lightBoxIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="max-h-[80vh] max-w-[85vw] overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl p-2 bg-neutral-900"
              >
                <img
                  src={resolveImage(filteredImages[lightBoxIndex]?.src)}
                  alt={filteredImages[lightBoxIndex]?.alt}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] max-w-[80vw] object-contain"
                />
              </motion.div>

              {/* Next Button Right */}
              <button
                onClick={() => navigateLightBox("next")}
                className="absolute right-0 md:right-4 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/85 hover:text-white transition-all"
                title="Next Image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom metadata tags overlay */}
            <div className="text-center text-white/45 text-[10px] tracking-widest uppercase">
              CATEGORY: <strong className="text-white/80">{filteredImages[lightBoxIndex]?.category}</strong> • PRESERVATION LEDGER PROJECTION
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
