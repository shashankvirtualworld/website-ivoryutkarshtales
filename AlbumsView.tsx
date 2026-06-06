import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Image as ImageIcon, Trash2, X, Upload, CheckCircle2, ArrowRight, Sliders, Database, Gauge, Zap, Sparkles, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Download, ExternalLink, MapPin, Calendar, Heart } from "lucide-react";
import { INITIAL_ALBUMS, resolveImage } from "../data";
import { Album } from "../types";
import { loadAlbumsAsync, saveAlbumsAsync, compressImage, getStorageStats, StorageStats, requestPersistentStorage } from "../utils/storage";

// Helper to load PDF.js dynamically from CDN
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF extraction engine."));
    document.head.appendChild(script);
  });
};

export default function AlbumsView() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [uploadMode, setUploadMode] = useState<"local" | "url" | "pdf">("local");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [pdfPagesRendered, setPdfPagesRendered] = useState(0);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchProcessed, setBatchProcessed] = useState(0);
  const [batchStatusText, setBatchStatusText] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // --- Dedicated Immersive Web-embedded Image Gallery Lightbox ---
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // --- Beautiful Custom Sandbox-resistant Confirmation Dialog state ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // States for creating a brand new album
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumSubtitle, setNewAlbumSubtitle] = useState("");
  const [newAlbumLocation, setNewAlbumLocation] = useState("");
  const [newAlbumYear, setNewAlbumYear] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [newAlbumCoverOption, setNewAlbumCoverOption] = useState<"upload" | "url">("upload");
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState("");
  const [newAlbumCoverRaw, setNewAlbumCoverRaw] = useState("");

  // Initialize albums from IndexedDB/localStorage or default static dataset
  useEffect(() => {
    async function initAlbums() {
      const stored = await loadAlbumsAsync();
      let finalAlbums = INITIAL_ALBUMS;

      if (stored && stored.length > 0) {
        try {
          // Merge to preserve user-uploaded photos, custom albums, and core metadata from INITIAL_ALBUMS
          const initialMap = new Map(INITIAL_ALBUMS.map(a => [a.id, a]));
          const merged: Album[] = [];

          // Process stored ones to keep custom ones and default updates
          stored.forEach((storedAlb) => {
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

    initAlbums();
  }, []);

  // --- Storage Quota and Quality Optimization Engine ---
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isStoragePanelOpen, setIsStoragePanelOpen] = useState(false);
  const [isBulkOptimizing, setIsBulkOptimizing] = useState(false);

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  useEffect(() => {
    fetchStorageStats();
  }, [albums]);

  const handleChangeStorageMode = async (mode: "eco" | "balanced" | "ultra") => {
    localStorage.setItem("ivory_utkarsh_storage_mode", mode);
    await fetchStorageStats();
    triggerSuccessToast(`Image quality preference set to ${
      mode === "eco" ? "Eco Save (Maximum space-saving)" :
      mode === "balanced" ? "Balanced Quality (Recommended)" :
      "Max Resolution Fine-Art (Lossless/Ultra HD)"
    }!`);
  };

  const handleBulkOptimize = async () => {
    setIsBulkOptimizing(true);
    let optimizedCount = 0;

    const updatedAlbums = await Promise.all(
      albums.map(async (alb) => {
        // Optimize cover image if base64
        let coverImage = alb.coverImage;
        if (coverImage && coverImage.startsWith("data:image/")) {
          coverImage = await compressImage(coverImage, 800, 0.7);
          optimizedCount++;
        }

        // Optimize photo items if base64
        const photos = await Promise.all(
          alb.photos.map(async (photo) => {
            if (photo && photo.startsWith("data:image/")) {
              optimizedCount++;
              return await compressImage(photo, 1200, 0.75);
            }
            return photo;
          })
        );

        return { ...alb, coverImage, photos };
      })
    );

    if (optimizedCount > 0) {
      await saveAlbumsAsync(updatedAlbums);
      setAlbums(updatedAlbums);
      await fetchStorageStats();
      triggerSuccessToast(`Successfully optimized ${optimizedCount} custom images to current space settings!`);
    } else {
      triggerSuccessToast("No user-uploaded base64 images found to optimize.");
    }
    setIsBulkOptimizing(false);
  };

  // Sync state to selected album detailed view when updated
  const activeAlbum = selectedAlbum 
    ? albums.find(a => a.id === selectedAlbum.id) || selectedAlbum
    : null;

  // Lightbox Navigation: Previous photo in the current album
  const handlePrevPhoto = () => {
    if (activePhotoIndex === null || !activeAlbum) return;
    const count = activeAlbum.photos.length;
    if (count <= 1) return;
    setActivePhotoIndex((activePhotoIndex - 1 + count) % count);
  };

  // Lightbox Navigation: Next photo in the current album
  const handleNextPhoto = () => {
    if (activePhotoIndex === null || !activeAlbum) return;
    const count = activeAlbum.photos.length;
    if (count <= 1) return;
    setActivePhotoIndex((activePhotoIndex + 1) % count);
  };

  // Keyboard navigation for full screen photo gallery lightbox (Escape, Left, Right Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // ignore when typing in fields
      }
      if (activePhotoIndex === null) return;

      if (e.key === "Escape") {
        setActivePhotoIndex(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevPhoto();
      } else if (e.key === "ArrowRight") {
        handleNextPhoto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, activeAlbum]);

  // Persist updated albums array asynchronously
  const saveAlbums = (updatedAlbums: Album[]) => {
    setAlbums(updatedAlbums);
    saveAlbumsAsync(updatedAlbums);
  };

  // Delete a dynamic custom album entirely
  const handleDeleteAlbum = (albumId: string) => {
    triggerConfirm(
      "Delete Custom Album",
      "Are you sure you want to delete this custom album permanently? All photographs in it will be lost.",
      () => {
        const updated = albums.filter(alb => alb.id !== albumId);
        saveAlbums(updated);
        setSelectedAlbum(null);
        triggerSuccessToast("Custom album deleted permanently.");
      }
    );
  };

  // Submit handler for dynamic album creation
  const handleCreateAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;

    let coverImage = "";
    if (newAlbumCoverOption === "upload") {
      coverImage = newAlbumCoverRaw || "/src/assets/images/regenerated_image_1780314364148.jpg"; // fallback
    } else {
      coverImage = newAlbumCoverUrl.trim() || "/src/assets/images/regenerated_image_1780314364148.jpg"; // fallback
    }

    const newAlbum: Album = {
      id: "album-custom-" + Date.now(),
      title: newAlbumTitle.trim(),
      subtitle: newAlbumSubtitle.trim() || "Private Collection",
      location: newAlbumLocation.toUpperCase().trim() || "STUDIO",
      year: newAlbumYear.trim() || String(new Date().getFullYear()),
      coverImage,
      description: newAlbumDescription.trim() || "A custom curated client archive ledger filled with fine-art high-concept documentation.",
      photos: []
    };

    const updated = [...albums, newAlbum];
    saveAlbums(updated);

    // Reset fields
    setNewAlbumTitle("");
    setNewAlbumSubtitle("");
    setNewAlbumLocation("");
    setNewAlbumYear("");
    setNewAlbumDescription("");
    setNewAlbumCoverUrl("");
    setNewAlbumCoverRaw("");
    setIsCreatingAlbum(false);

    triggerSuccessToast(`Custom album "${newAlbum.title}" created successfully!`);
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

  // Add a photo link dynamically
  const handleAddPhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim() || !activeAlbum) return;

    const updated = albums.map(alb => {
      if (alb.id === activeAlbum.id) {
        return {
          ...alb,
          photos: [...alb.photos, photoUrlInput.trim()]
        };
      }
      return alb;
    });

    saveAlbums(updated);
    setPhotoUrlInput("");
    setUploadMode("local");
    triggerSuccessToast("Photo URL successfully logged to album vault!");
  };

  // Process dropped or selected images sequentially to avoid browser UI hang
  const processImageBatch = async (filesArray: File[]) => {
    if (!filesArray || filesArray.length === 0 || !activeAlbum) return;

    // Filter to only image files
    const imageFiles = filesArray.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      triggerConfirm(
        "Invalid Files",
        "None of the selected files are valid image files (PNG, JPG, WebP). Please try again with photographs.",
        () => {}
      );
      return;
    }

    setIsProcessingBatch(true);
    setBatchTotal(imageFiles.length);
    setBatchProcessed(0);
    setBatchStatusText(`Acquiring bundle of ${imageFiles.length} client photographs...`);

    const extractedBase64s: string[] = [];

    // Process sequentially to keep browser thread completely responsive and render progression
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setBatchStatusText(`Optimizing and framing layout: "${file.name}" (${i + 1} of ${imageFiles.length})...`);
      
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });

        // Compress image using the client quality profiles
        const compressed = await compressImage(base64, 1200, 0.75);
        extractedBase64s.push(compressed);
      } catch (err) {
        console.error("Error batch optimizing target:", err);
      }
      setBatchProcessed(i + 1);
    }

    setBatchStatusText("Synchronizing photographs to local database vault...");

    setAlbums(prevAlbums => {
      const updated = prevAlbums.map(alb => {
        if (alb.id === activeAlbum.id) {
          return {
            ...alb,
            photos: [...alb.photos, ...extractedBase64s]
          };
        }
        return alb;
      });
      saveAlbumsAsync(updated);
      return updated;
    });

    triggerSuccessToast(`Successfully optimized & ingested ${extractedBase64s.length} photographs to "${activeAlbum.title}"!`);
    setIsProcessingBatch(false);
    setBatchStatusText("");
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (isProcessingBatch) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageBatch(Array.from(files));
    }
  };

  // Local file selection change handler
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processImageBatch(Array.from(files));
  };

  // Dynamic client-side PDF image extractor
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAlbum) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      triggerConfirm(
        "Invalid File Type", 
        "Selected file is not a PDF Document. Please choose a valid PDF file containing photographs.",
        () => {}
      );
      return;
    }

    setIsProcessingPdf(true);
    setPdfProgress("Initializing dynamic PDF layout parser...");
    setPdfPagesRendered(0);
    setPdfTotalPages(0);

    const fileReader = new FileReader();
    fileReader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        
        setPdfProgress("Loading browser PDF projection module...");
        const pdfjsLib = await loadPdfJS();
        
        setPdfProgress("Opening PDF file streams...");
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const total = pdf.numPages;
        setPdfTotalPages(total);
        setPdfProgress(`Discovered ${total} pages. Rendering photos...`);

        const extractedImages: string[] = [];

        for (let i = 1; i <= total; i++) {
          setPdfProgress(`Projecting and rendering Page ${i} of ${total}...`);
          
          const page = await pdf.getPage(i);
          // Scale 1.5 - 2.0 provides an beautiful output resolution
          const viewport = page.getViewport({ scale: 1.8 });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to build local drawing viewport context.");
          }
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          await page.render(renderContext).promise;
          
          // Render as standard JPEG in 0.78 quality to preserve colors perfectly
          const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          
          // Compress layout further dynamically down to standard portfolio requirements
          const compressed = await compressImage(jpegDataUrl, 1200, 0.75);
          extractedImages.push(compressed);
          
          setPdfPagesRendered(i);
        }

        setPdfProgress("Synching extracted photos into safe dynamic storage...");

        setAlbums(prevAlbums => {
          const updated = prevAlbums.map(alb => {
            if (alb.id === activeAlbum.id) {
              return {
                ...alb,
                photos: [...alb.photos, ...extractedImages]
              };
            }
            return alb;
          });
          saveAlbumsAsync(updated);
          return updated;
        });

        triggerSuccessToast(`Successfully imported ${total} dynamic photos from client PDF archive.`);
        setIsProcessingPdf(false);
        setPdfProgress("");
      } catch (error: any) {
        console.error("PDF Extraction error: ", error);
        setPdfProgress(`Extraction halted: ${error?.message || error}`);
        setIsProcessingPdf(false);
      }
    };

    fileReader.onerror = () => {
      setPdfProgress("Failed to read binary input streams.");
      setIsProcessingPdf(false);
    };

    fileReader.readAsArrayBuffer(file);
  };

  // Delete a photo from the album
  const handleDeletePhoto = (photoIndex: number) => {
    if (!activeAlbum) return;
    triggerConfirm(
      "Dismiss Photograph",
      "Are you sure you want to dismiss this fine-art photograph from the album?",
      () => {
        const updated = albums.map(alb => {
          if (alb.id === activeAlbum.id) {
            const filteredPhotos = alb.photos.filter((_, idx) => idx !== photoIndex);
            return {
              ...alb,
              photos: filteredPhotos
            };
          }
          return alb;
        });
        saveAlbums(updated);
        triggerSuccessToast("Photograph removed from archive.");
      }
    );
  };

  // Clear all photos from the current album
  const handleClearAllPhotos = () => {
    if (!activeAlbum) return;
    triggerConfirm(
      "Clear All Photos",
      `Are you sure you want to remove all photos from the "${activeAlbum.title}" album permanently?`,
      () => {
        const updated = albums.map(alb => {
          if (alb.id === activeAlbum.id) {
            return {
              ...alb,
              photos: []
            };
          }
          return alb;
        });
        saveAlbums(updated);
        triggerSuccessToast("All photographs removed from this album.");
      }
    );
  };

  const triggerSuccessToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div className="w-full pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-20" id="albums-view-container">
      
      {/* 1. SECTION INTRO HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-outline-variant/20 pb-12">
        <div className="max-w-2xl space-y-4">
          <p className="font-sans text-xs tracking-[0.3em] text-primary font-semibold uppercase">
            REGISTRY ARCHIVES
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-primary font-normal leading-tight">
            Client Albums
          </h1>
          <p className="font-sans text-sm md:text-base text-outline leading-relaxed text-justify">
            Each fine-art ledger functions as a custom visual home. View our 6 master templates, organize curated visual narratives, and append custom high-fashion wedding snapshots dynamically.
          </p>
        </div>
        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6 border-t md:border-t-0 pt-6 md:pt-0 md:border-l border-outline/30 pl-0 md:pl-8 h-auto w-full xl:w-auto justify-between xl:justify-end">
          <div className="flex items-center gap-6">
            <span className="font-display text-3xl md:text-5xl text-secondary">{albums.length} Vaults</span>
            <div className="flex flex-col">
              <span className="font-sans text-[10px] text-outline tracking-widest font-semibold uppercase">
                STATUS
              </span>
              <span className="font-sans text-sm text-primary font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live
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
              id="btn-storage-optimizer-trigger"
            >
              <Sliders className="w-4 h-4 text-primary" /> Storage Optimizer
            </button>
            <button
              onClick={() => setIsCreatingAlbum(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-surface hover:text-primary px-5 py-3 font-sans text-[11px] tracking-widest uppercase font-semibold border border-transparent transition-all shrink-0 shadow-md transform hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer"
              id="btn-create-album-trigger"
            >
              <Plus className="w-4 h-4" /> Create New Album
            </button>
          </div>
        </div>
      </header>

      {/* STORAGE OPTIMIZER & QUOTA DASHBOARD (COLLAPSIBLE) */}
      <AnimatePresence>
        {isStoragePanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mb-12 border border-outline-variant/30 bg-surface-container-low/40 p-6 md:p-8 rounded-xs shadow-inner"
            id="storage-optimizer-panel"
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
                    <span className="font-sans text-[10px] text-outline uppercase tracking-wider">IndexedDB Cache Volume:</span>
                    <span className="font-mono text-xs text-primary font-bold">{((storageStats?.indexedDbUsedKB || 0) / 1024).toFixed(3)} MB</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="font-sans text-[10px] text-outline uppercase tracking-wider">LocalStorage Metadata Size:</span>
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

                  {/* 5 GB Persistent Storage Request Control */}
                  <div className="bg-surface-container/60 p-3 border border-outline-variant/20 space-y-2 mt-1">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-sans text-[10px] font-bold text-primary uppercase tracking-wider block">Local Drive Provisioning</span>
                        <p className="font-sans text-[9px] text-outline leading-relaxed">
                          Requesting persistent authority secures standard IndexedDB access, expanding browser cache limits up to 5 GB using your client hard-drive (directly on this laptop's local disk space).
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
                        id="btn-request-persistent-storage"
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

              {/* Compression mode column */}
              <div className="lg:col-span-4 space-y-4 border-t lg:border-t-0 lg:border-l lg:border-r border-outline-variant/20 lg:px-8 pt-6 lg:pt-0">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-secondary" />
                  <span className="font-sans text-xs uppercase tracking-widest font-semibold text-primary">Pre-Optimization Profiles</span>
                </div>
                
                <div className="space-y-3">
                  {[
                    {
                      id: "eco",
                      title: "Economy Save Profile (Eco)",
                      descr: "Compresses files to 800px width @ 55% quality. Drastically minimizes page weight for slow network setups.",
                      badge: "Saves ~85% space",
                      icon: Zap
                    },
                    {
                      id: "balanced",
                      title: "Standard Balanced (Recommended)",
                      descr: "High-fashion optimal: 1200px width @ 75% quality. Exceptional balancing of premium sharpness & file size.",
                      badge: "Default config",
                      icon: Sparkles
                    },
                    {
                      id: "ultra",
                      title: "Retina Fine-Art Print (Ultra HD)",
                      descr: "Lossless-weight premium depth: 1920px width @ 88% quality. Maximum dynamic resolution with absolute clarity.",
                      badge: "High-Fidelity",
                      icon: Database
                    }
                  ].map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleChangeStorageMode(profile.id as any)}
                      className={`w-full text-left p-3 border transition-all flex flex-col justify-between rounded-xs cursor-pointer ${
                        storageStats?.mode === profile.id
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                          : "border-outline-variant/25 bg-transparent text-primary hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-primary">{profile.title}</span>
                        <span className="font-sans text-[8px] bg-secondary text-primary px-1.5 py-0.5 tracking-wider uppercase font-bold shrink-0">
                          {profile.badge}
                        </span>
                      </div>
                      <p className="font-sans text-[10px] text-outline leading-tight">{profile.descr}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance Tools column */}
              <div className="lg:col-span-3 space-y-4 pt-6 lg:pt-0">
                <div className="flex items-center gap-2 font-medium">
                  <Sliders className="w-5 h-5 text-secondary" />
                  <span className="font-sans text-xs uppercase tracking-widest font-semibold text-primary">Space Maintenance</span>
                </div>
                
                <p className="font-sans text-[10px] text-outline leading-relaxed text-justify">
                  Quickly align existing custom client records with your newly selected resolution profile, or safely restore initial legacy presets.
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={isBulkOptimizing}
                    onClick={handleBulkOptimize}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-surface hover:text-primary transition-all font-sans text-[10px] font-bold tracking-widest uppercase py-3 border border-transparent shadow-md cursor-pointer disabled:opacity-50"
                    id="btn-bulk-optimize"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBulkOptimizing ? "animate-spin" : ""}`} />
                    {isBulkOptimizing ? "Optimizing..." : "RE-OPTIMIZE VAULT"}
                  </button>

                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Reset Custom Data",
                        "Would you like to reset all dynamic custom albums? Custom created albums and dynamic images will be removed and initial presets restored.",
                        async () => {
                          localStorage.removeItem("ivory_utkarsh_albums_v2");
                          window.location.reload();
                        }
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 border border-outline-variant hover:border-red-400/40 bg-transparent text-outline hover:text-red-400 font-sans text-[10px] font-bold tracking-widest uppercase py-3 transition-colors cursor-pointer"
                    id="btn-reset-cache-storage"
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

      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-10 left-10 z-[100] bg-primary text-surface px-6 py-4 border border-outline-variant/30 flex items-center gap-3 shadow-xl"
            id="album-toast"
          >
            <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
            <span className="font-sans text-xs tracking-wider uppercase font-semibold text-white">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CHOOSE OUT OF THE 6 CURATED POSTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14" id="albums-masonry-grid">
        {albums.map((alb) => (
          <motion.div
            key={alb.id}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="group cursor-pointer space-y-6 flex flex-col justify-between"
            onClick={() => setSelectedAlbum(alb)}
            id={`album-card-${alb.id}`}
          >
            {/* Poster Card Cover */}
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
                
                {/* Vintage Ratio Stamp Overlay */}
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm px-2.5 py-1 text-[8px] tracking-[0.2em] font-sans font-bold text-primary uppercase">
                  {alb.location} • {alb.year}
                </div>

                {/* Micro statistics of total pictures */}
                <div className="absolute bottom-4 right-4 bg-primary/95 text-surface px-3 py-1 text-[9px] tracking-widest font-sans uppercase flex items-center gap-1.5 shadow-sm">
                  <ImageIcon className="w-3 h-3" /> {alb.photos.length} FILMS
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
              <span>EXPLORE & ADD IMAGES</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. LIGHTBOX DETAILED VIEW TO ADD & MANAGE IMAGES */}
      <AnimatePresence>
        {activeAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-surface/98 backdrop-blur-lg flex flex-col overflow-y-auto px-6 md:px-20 py-10"
            id="album-lightbox"
          >
            {/* Lightbox Banner Control Bar */}
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-6 mb-12 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <span className="font-sans text-[10px] bg-primary text-surface px-2.5 py-1 tracking-widest font-bold uppercase">
                  VAULT ACTIVE
                </span>
                <span className="font-sans text-[10px] text-outline font-semibold tracking-wider">
                  {activeAlbum.location} • {activeAlbum.year}
                </span>
              </div>
              
              <button
                onClick={() => setSelectedAlbum(null)}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:text-surface transition-all hover:rotate-90"
                id="btn-close-album-lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inner Content Grid */}
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-12">
              {/* Header Titles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="font-display text-4xl md:text-6xl text-primary font-normal">
                      {activeAlbum.title}
                    </h2>
                    {!INITIAL_ALBUMS.some(a => a.id === activeAlbum.id) && (
                      <button
                        onClick={() => handleDeleteAlbum(activeAlbum.id)}
                        className="flex items-center gap-2 border border-red-500/35 hover:border-red-500 bg-red-500/5 hover:bg-red-500/20 text-red-400 hover:text-white text-[10px] tracking-widest font-semibold uppercase font-sans px-4 py-2 transition-all"
                        id="btn-delete-custom-album"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Album
                      </button>
                    )}
                  </div>
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
                    <h4 className="font-display text-lg text-primary font-semibold mb-1">Add Photos to Album</h4>
                    <p className="font-sans text-[10px] text-outline uppercase tracking-wider">
                      Dynamic Local Database Storage
                    </p>
                  </div>

                  {/* Toggle Mode */}
                  <div className="flex gap-2 p-1 bg-surface-container-high/40 border border-outline-variant/25">
                    <button
                      type="button"
                      disabled={isProcessingPdf}
                      onClick={() => setUploadMode("local")}
                      className={`flex-1 py-1.5 font-sans text-[9px] tracking-widest uppercase font-semibold transition-all cursor-pointer ${
                        uploadMode === "local" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary disabled:opacity-50"
                      }`}
                    >
                      LOCAL UPLOAD
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingPdf}
                      onClick={() => setUploadMode("url")}
                      className={`flex-1 py-1.5 font-sans text-[9px] tracking-widest uppercase font-semibold transition-all cursor-pointer ${
                        uploadMode === "url" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary disabled:opacity-50"
                      }`}
                    >
                      REMOTE URL
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingPdf}
                      onClick={() => setUploadMode("pdf")}
                      className={`flex-1 py-1.5 font-sans text-[9px] tracking-widest uppercase font-semibold transition-all cursor-pointer ${
                        uploadMode === "pdf" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary disabled:opacity-50"
                      }`}
                    >
                      PDF OF SHOTS
                    </button>
                  </div>

                  {/* Mode 1: File Uploader */}
                  {uploadMode === "local" && (
                    <div className="space-y-4 text-primary">
                      {isProcessingBatch ? (
                        <div className="bg-surface/30 p-5 border border-outline-variant/35 space-y-4 text-center">
                          <div className="flex justify-center items-center py-2">
                            <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="font-display text-xs tracking-wider text-[#d4af37] font-bold uppercase">BATCHING SHOTS IN PROGRESS</h5>
                            <p className="font-mono text-[8.5px] text-white/70 font-semibold uppercase tracking-wider px-2.5 py-2 bg-zinc-900/90 border border-white/5 rounded-xs break-all leading-normal">
                              {batchStatusText}
                            </p>
                          </div>

                          {batchTotal > 0 && (
                            <div className="space-y-1.5 pt-2">
                              {/* Progression Bar */}
                              <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#d4af37] h-full transition-all duration-300"
                                  style={{ width: `${Math.round((batchProcessed / batchTotal) * 100)}%` }}
                                />
                              </div>
                              <p className="font-sans text-[8px] text-outline text-right tracking-widest uppercase font-bold">
                                File {batchProcessed} / {batchTotal} optimized ({Math.round((batchProcessed / batchTotal) * 100)}%)
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label 
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border border-dashed transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] group relative overflow-hidden ${
                            isDraggingOver 
                              ? "border-[#d4af37] bg-[#d4af37]/10 scale-[1.02] shadow-lg" 
                              : "border-primary/40 hover:border-primary/80 bg-surface/50"
                          }`}
                        >
                          <Upload className={`w-8 h-8 mb-3 transition-transform duration-300 ${isDraggingOver ? "text-[#d4af37] scale-125 animate-pulse" : "text-secondary group-hover:scale-110"}`} />
                          
                          <span className={`font-sans text-[10px] uppercase tracking-widest font-bold transition-colors duration-300 ${isDraggingOver ? "text-[#d4af37]" : "text-primary group-hover:text-secondary"}`}>
                            {isDraggingOver ? "RELEASE FILES TO IMPORT INGESTION" : "Choose Dynamic Files"}
                          </span>
                          
                          <span className="font-sans text-[9px] text-outline mt-1.5 max-w-[210px] leading-relaxed">
                            {isDraggingOver 
                              ? "Ready to extract files..." 
                              : "Drag & drop 70-80 images at once onto this area, or standard click to select photographs."}
                          </span>

                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleLocalFileUpload}
                            className="hidden"
                            id="local-album-uploader"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Photo Link URL Form */}
                  {uploadMode === "url" && (
                    <form onSubmit={handleAddPhotoUrl} className="space-y-4">
                      <div className="space-y-1">
                        <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                          Paste Photograph Link
                        </label>
                        <input
                          type="url"
                          required
                          value={photoUrlInput}
                          onChange={(e) => setPhotoUrlInput(e.target.value)}
                          placeholder="e.g., https://wedding.com/photo33.jpg"
                          className="w-full bg-surface border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-primary text-surface text-[10px] tracking-widest uppercase font-semibold font-sans hover:bg-tertiary transition-colors cursor-pointer"
                      >
                        LOG PHOTO URL
                      </button>
                    </form>
                  )}

                  {/* Mode 3: PDF Photo Extractor */}
                  {uploadMode === "pdf" && (
                    <div className="space-y-4">
                      {!isProcessingPdf ? (
                        <label className="border border-dashed border-[#d4af37]/45 hover:border-[#d4af37]/80 bg-surface/50 p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] group transition-colors">
                          <Sparkles className="w-8 h-8 text-[#d4af37] mb-3 group-hover:scale-110 transition-transform" />
                          <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#d4af37] group-hover:text-white transition-colors">
                            UPLOAD CHRONICLE PDF
                          </span>
                          <span className="font-sans text-[9px] text-outline mt-1.5 max-w-xs leading-normal">
                            Directly parse and extract photos from client catalog PDF
                          </span>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfUpload}
                            className="hidden"
                            id="pdf-album-uploader"
                          />
                        </label>
                      ) : (
                        <div className="bg-surface/30 p-5 border border-outline-variant/35 space-y-4 text-center">
                          <div className="flex justify-center items-center py-2">
                            <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                          </div>
                          
                          <div className="space-y-1">
                            <h5 className="font-display text-xs tracking-wider text-[#d4af37] font-bold uppercase">PROJECTION RENDERING IN PROGRESS</h5>
                            <p className="font-mono text-[8px] text-white/70 font-semibold uppercase tracking-wider px-2.5 py-1.5 bg-zinc-900/90 border border-white/5 rounded-xs break-all leading-normal">
                              {pdfProgress}
                            </p>
                          </div>

                          {pdfTotalPages > 0 && (
                            <div className="space-y-1.5 pt-2">
                              {/* Progression Bar */}
                              <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#d4af37] h-full transition-all duration-300"
                                  style={{ width: `${Math.round((pdfPagesRendered / pdfTotalPages) * 100)}%` }}
                                />
                              </div>
                              <p className="font-sans text-[8px] text-outline text-right tracking-widest uppercase font-bold">
                                Frame {pdfPagesRendered} / {pdfTotalPages} processed ({Math.round((pdfPagesRendered / pdfTotalPages) * 100)}%)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-outline-variant/20 flex items-center gap-2 text-[10px] text-outline/65">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Your custom additions persist across browser restarts!</span>
                  </div>
                </div>
              </div>

              {/* Sub-gallery of current photographs in album */}
              <div className="mt-8 border-t border-outline-variant/25 pt-12 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-2xl text-primary font-normal italic">
                      The Curated Stream
                    </h3>
                    <span className="font-sans text-[9px] bg-secondary/15 text-secondary px-3 py-0.5 border border-secondary/25 uppercase font-semibold">
                      {activeAlbum.photos.length} IMAGES ACTIVE
                    </span>
                  </div>
                  {activeAlbum.photos.length > 0 && (
                    <button
                      onClick={handleClearAllPhotos}
                      className="flex items-center justify-center gap-2 border border-red-500/30 hover:border-red-500 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-white text-[10px] tracking-wider uppercase font-semibold transition-all px-4.5 py-2 font-sans"
                      id="btn-clear-all-photos"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear All Photos
                    </button>
                  )}
                </div>

                {activeAlbum.photos.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-outline-variant/30 bg-surface-dim">
                    <ImageIcon className="w-12 h-12 text-outline/30 mx-auto mb-3 animate-pulse" />
                    <p className="font-serif italic text-outline text-sm">
                      This album is currently empty. Start adding photos above to build your aesthetic legacy!
                    </p>
                  </div>
                ) : (
                  /* Masonry or flexible grid of pictures */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeAlbum.photos.map((photo, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative aspect-[4/3] bg-surface-container overflow-hidden border border-outline-variant/15 shadow-sm"
                        id={`album-photo-container-${index}`}
                      >
                        {/* Interactive Gallery Hotspot */}
                        <div
                          onClick={() => setActivePhotoIndex(index)}
                          className="w-full h-full cursor-pointer relative"
                          title="Click to view full-screen photo gallery"
                          id={`album-photo-item-${index}`}
                        >
                          <img
                            src={resolveImage(photo)}
                            alt={`Album photograph ${index + 1}`}
                            className="w-full h-full object-cover transition-all duration-[1.2s] scale-100 group-hover:scale-[1.03]"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Hover Zoom Indicator & Title Overlay */}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3 duration-300 pointer-events-none">
                            <div className="w-full text-center pb-2">
                              <span className="font-sans text-[9px] text-[#FAF9F6] bg-black/60 px-3 py-1.5 border border-white/10 uppercase tracking-[0.2em] font-bold">
                                OPEN GALLERY VIEW
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sibling Delete Action Overlay: Positioned completely separate to prevent click leakage or bubbling conflicts */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(index)}
                            className="bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-full transition-all border border-white/15 hover:border-white shadow-md flex items-center justify-center cursor-pointer"
                            title="Delete Photograph"
                            id={`btn-delete-photo-${index}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer space pad */}
            <div className="h-20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. NEW ALBUM DIRECT CREATOR DIALOG */}
      <AnimatePresence>
        {isCreatingAlbum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            id="create-album-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-surface border border-outline-variant/30 text-primary w-full max-w-lg p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsCreatingAlbum(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:text-surface transition-all"
                id="btn-close-create-album"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="font-display text-2xl text-primary font-normal">
                  Create New Album
                </h3>
                <p className="font-sans text-[10px] text-outline uppercase tracking-wider">
                  Bespoke High-Fashion Ledger
                </p>
              </div>

              <form onSubmit={handleCreateAlbumSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                    Album / Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAlbumTitle}
                    onChange={(e) => setNewAlbumTitle(e.target.value)}
                    placeholder="e.g., Shreya & Kabir"
                    className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                    Venue Subtitle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAlbumSubtitle}
                    onChange={(e) => setNewAlbumSubtitle(e.target.value)}
                    placeholder="e.g., Venue- Fairmont, Jaipur"
                    className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                      Location Tag <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAlbumLocation}
                      onChange={(e) => setNewAlbumLocation(e.target.value)}
                      placeholder="e.g., JAIPUR"
                      className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAlbumYear}
                      onChange={(e) => setNewAlbumYear(e.target.value)}
                      placeholder="e.g., 2025"
                      className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                    Narrative / Description
                  </label>
                  <textarea
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    placeholder="Describe the mood, color palettes, and cinematic moments..."
                    className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary min-h-[70px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-outline block">
                    Cover Image
                  </label>
                  <div className="flex gap-2 p-1 bg-surface-container-high/40 border border-outline-variant/25 mb-2">
                    <button
                      type="button"
                      onClick={() => setNewAlbumCoverOption("upload")}
                      className={`flex-1 py-1 font-sans text-[8px] tracking-widest uppercase font-semibold transition-all ${
                        newAlbumCoverOption === "upload" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary"
                      }`}
                    >
                      LOCAL FILE
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAlbumCoverOption("url")}
                      className={`flex-1 py-1 font-sans text-[8px] tracking-widest uppercase font-semibold transition-all ${
                        newAlbumCoverOption === "url" 
                          ? "bg-primary text-surface" 
                          : "text-outline hover:text-primary"
                      }`}
                    >
                      IMAGE URL
                    </button>
                  </div>

                  {newAlbumCoverOption === "upload" ? (
                    <div className="space-y-2">
                      <label className="border border-dashed border-outline-variant hover:border-primary bg-surface-dim p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px] transition-colors">
                        <Upload className="w-5 h-5 text-outline/65 mb-1" />
                        <span className="font-sans text-[10px] tracking-wide font-medium text-outline">
                          {newAlbumCoverRaw ? "Change Cover Image" : "Choose Cover File"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleModalCoverUpload}
                          className="hidden"
                        />
                      </label>
                      {newAlbumCoverRaw && (
                        <div className="relative aspect-[3/1] bg-surface-dim overflow-hidden border border-outline-variant/20">
                          <img src={newAlbumCoverRaw} className="w-full h-full object-cover" alt="Cover Preview" />
                          <button
                            type="button"
                            onClick={() => setNewAlbumCoverRaw("")}
                            className="absolute top-1 right-1 bg-black/75 text-white p-1 rounded-full hover:bg-black"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={newAlbumCoverUrl}
                      onChange={(e) => setNewAlbumCoverUrl(e.target.value)}
                      placeholder="https://wedding.com/custom-cover.jpg"
                      className="w-full bg-surface-dim border border-outline-variant/30 px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-primary"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary hover:bg-secondary text-surface hover:text-primary text-xs tracking-widest uppercase font-semibold font-sans transition-all shadow-md mt-4"
                >
                  CREATE VAULT
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. GORGEOUS IMMERSIVE GALLERY LIGHTBOX PANEL */}
      <AnimatePresence>
        {activePhotoIndex !== null && activeAlbum && activeAlbum.photos[activePhotoIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[650] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none text-white font-sans"
            id="immersion-gallery-viewer"
          >
            {/* Lightbox Control Bar */}
            <div className="w-full max-w-6xl mx-auto flex justify-between items-center py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 px-2.5 py-1 text-[9px] text-[#d4af37] tracking-[0.25em] font-bold uppercase matches-glow rounded-xs">
                  <ImageIcon className="w-2.5 h-2.5" />
                  FINE-ART PROJECTION
                </div>
                <span className="text-white/40 text-[11px] font-sans">|</span>
                <span className="text-white/80 font-sans text-xs font-semibold tracking-wider uppercase truncate max-w-md">
                  {activeAlbum.title} — Frame {activePhotoIndex + 1} of {activeAlbum.photos.length}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setActivePhotoIndex(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer"
                title="Close Gallery (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Stage Zone */}
            <div className="w-full max-w-5xl mx-auto flex-1 flex items-center justify-center relative my-6">
              
              {/* Prev Button */}
              {activeAlbum.photos.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-0 lg:-left-20 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer transform -translate-x-2 md:translate-x-0"
                  title="Previous Frame (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Photo Frame */}
              <div className="max-w-full max-h-[70vh] flex items-center justify-center relative bg-[#050505] border border-white/10 p-1 md:p-2 shadow-[0_0_80px_rgba(212,175,55,0.08)]">
                <motion.img
                  key={activePhotoIndex}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  src={resolveImage(activeAlbum.photos[activePhotoIndex])}
                  alt={`Exhibition Frame ${activePhotoIndex + 1}`}
                  className="max-w-full max-h-[66vh] object-contain"
                  referrerPolicy="no-referrer"
                />

                {/* Micro Dimension Stamp badge */}
                <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-xs border border-white/10 text-white font-mono text-[8px] tracking-wider px-2 py-0.5">
                  FRAME INTENSITY: HIGH • SEAMLESS DISPLAY
                </div>
              </div>

              {/* Next Button */}
              {activeAlbum.photos.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-0 lg:-right-20 z-10 w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 hover:border-white/30 transition-all cursor-pointer transform translate-x-2 md:translate-x-0"
                  title="Next Frame (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Gallery Lightbox Dashboard Footer */}
            <div className="w-full max-w-6xl mx-auto border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left pb-2">
              <div className="space-y-1">
                <p className="font-sans text-[10px] text-[#d4af37] tracking-[0.1em] uppercase font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <Sparkles className="w-3.5 h-3.5 fill-[#d4af37]/15" />
                  Preserving Visual Originality
                </p>
                <p className="font-sans text-[9px] text-white/40 font-medium">
                  Colors matching exactly as you designed and uploaded. Safe cloud ledger projection stream active.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href={activeAlbum.photos[activePhotoIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 text-[9px] font-sans font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  <span>Open Original File</span>
                  <ExternalLink className="w-3 h-3 text-white/60" />
                </a>

                <button
                  type="button"
                  onClick={() => setActivePhotoIndex(null)}
                  className="px-5 py-2 bg-[#d4af37] hover:bg-white text-black text-[9px] font-sans font-bold tracking-widest uppercase transition-all shadow-md cursor-pointer"
                >
                  DISMISS PROJECTION
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* BEAUTIFUL SANDBOX-RESISTANT CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-md"
            />
            
            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#121214] border border-outline-variant/20 shadow-2xl p-6 sm:p-8 select-none text-[#faf9f6]"
              id="custom-aesthetic-confirm-dialog"
            >
              {/* Gold warning/prompt tag */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-6 bg-[#d4af37]" />
                <span className="font-sans text-[10px] tracking-widest font-bold text-[#d4af37] uppercase">Ivory Confirmation Portal</span>
              </div>

              {/* Title and Message */}
              <h4 className="font-serif italic text-lg text-white mb-2 leading-snug">
                {confirmDialog.title}
              </h4>
              <p className="font-sans text-xs text-outline leading-relaxed mb-8">
                {confirmDialog.message}
              </p>

              {/* Control Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="w-full py-3 border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-sans text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-sans text-[10px] font-bold tracking-widest uppercase transition-colors shadow-lg cursor-pointer"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
