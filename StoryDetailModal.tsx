import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, MapPin, Film, Share2, Eye, Camera, ImageIcon } from "lucide-react";
import { Story } from "../types";
import { loadAlbumsAsync } from "../utils/storage";

interface StoryDetailModalProps {
  story: Story | null;
  onClose: () => void;
  onInquire: () => void;
}

export default function StoryDetailModal({
  story,
  onClose,
  onInquire,
}: StoryDetailModalProps) {
  const [albums, setAlbums] = useState<any[]>([]);

  useEffect(() => {
    async function loadAlbums() {
      const stored = await loadAlbumsAsync();
      if (stored) setAlbums(stored);
    }
    loadAlbums();
  }, [story]);

  if (!story) return null;

  const allUploadedPhotos = albums.flatMap(a => a.photos || []);
  const mappedPhoto = allUploadedPhotos.length > 0 
    ? allUploadedPhotos[Math.abs(story.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % allUploadedPhotos.length]
    : "";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-primary/45 backdrop-blur-md"
          id="story-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 150 }}
          className="relative bg-surface w-full max-w-4xl shadow-2xl overflow-hidden border border-outline-variant/30 z-[120] flex flex-col md:flex-row h-auto max-h-[90vh]"
          id="story-detail-modal"
        >
          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-surface/80 backdrop-blur-sm hover:bg-surface flex items-center justify-center text-primary transition-colors border border-outline-variant/20 shadow-sm"
            aria-label="Close"
            id="btn-close-story"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left Media Content */}
          <div className="w-full md:w-3/5 bg-surface-container relative flex items-center justify-center h-64 md:h-auto overflow-hidden group">
            {(story.image || mappedPhoto) ? (
              <img
                src={story.image || mappedPhoto}
                alt={story.photogAlt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-100"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#121212] to-[#222222] flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                <ImageIcon className="w-10 h-10 text-[#d4af37]/60 animate-pulse" />
                <span className="font-display text-sm tracking-widest text-[#FAF9F6] uppercase font-medium">Bespoke Storyboard Image Pending</span>
              </div>
            )}
            {story.isVideo && (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="w-16 h-16 rounded-full bg-surface/90 text-primary flex items-center justify-center shadow-lg cursor-pointer hover:bg-surface transition-colors"
                >
                  <Film className="w-6 h-6 fill-current animate-pulse pl-0.5" />
                </motion.div>
                <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-surface mt-4 bg-primary/40 px-3 py-1 font-medium">
                  CINEMA ARCHIVE
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/40 text-[10px] text-surface/85 px-2 py-0.5 font-sans uppercase tracking-widest">
              Shot on CineFilm Medium Format
            </div>
          </div>

          {/* Right Text Description */}
          <div className="w-full md:w-2/5 p-6 md:p-10 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-full bg-surface-container-lowest">
            <div className="space-y-6">
              {/* Metadata badge block */}
              <div className="flex flex-wrap items-center gap-6 text-[11px] font-sans text-outline tracking-wider uppercase border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{story.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{story.year}</span>
                </div>
              </div>

              {/* Title & Tagline */}
              <div>
                <h3 className="font-display text-2xl md:text-3xl text-primary leading-tight font-normal">
                  {story.title}
                </h3>
                {story.tagline && (
                  <p className="font-display text-md italic text-tertiary mt-2">
                    "{story.tagline}"
                  </p>
                )}
              </div>

              {/* Long narrative descriptive text */}
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed text-justify">
                {story.description ||
                  "The fleeting glances, raw smiles, and custom visual layers are documented with editorial dedication. Each photo in this gallery is color-tonalized back to vintage celluloid standards to stand the test of time."}
              </p>

              {/* Cinematic technical parameters */}
              <div className="bg-surface-container p-4 space-y-2 border-t border-b border-outline-variant/10">
                <p className="font-sans text-[10px] text-outline font-semibold tracking-wider uppercase">
                  CREATIVITY SIGNALS:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant font-sans">
                  <div>
                    <span className="font-medium">Director:</span> Utkarsh Abhijit
                  </div>
                  <div>
                    <span className="font-medium">Format:</span> ARRI Alexa / GFX100s
                  </div>
                  <div>
                    <span className="font-medium">Theme:</span> Editorial Noir
                  </div>
                  <div>
                    <span className="font-medium">Coherency:</span> Ivory Green / Sand
                  </div>
                </div>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-8 space-y-4">
              <button
                onClick={onInquire}
                className="w-full py-3.5 bg-primary text-surface font-sans text-[10px] tracking-widest font-semibold hover:bg-tertiary transition-colors uppercase"
                id="btn-inquire-story-detail"
              >
                REQUEST COVERAGE PATHWAY
              </button>
              <div className="flex justify-between items-center text-[10px] text-outline font-sans">
                <button
                  onClick={() => alert("Unique connection shared in preview space.")}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors text-xs"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Story
                </button>
                <div className="flex items-center gap-1 text-xs">
                  <Eye className="w-3.5 h-3.5" /> 1.2k views
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
