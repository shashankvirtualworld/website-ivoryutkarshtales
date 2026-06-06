import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Play, Quote, Eye, ImageIcon, Film } from "lucide-react";
import { Story, Album } from "../types";
import { loadAlbumsAsync } from "../utils/storage";

interface ArchiveViewProps {
  onSelectStory: (story: Story) => void;
  onInquire: () => void;
  archiveStories: Story[];
  filmStripPhotos: any[];
}

export default function ArchiveView({
  onSelectStory,
  onInquire,
  archiveStories,
  filmStripPhotos,
}: ArchiveViewProps) {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    async function loadAlbums() {
      const stored = await loadAlbumsAsync();
      if (stored) setAlbums(stored);
    }
    loadAlbums();
  }, []);

  const allUploadedPhotos = useMemo(() => {
    return albums.flatMap(a => a.photos || []);
  }, [albums]);

  // Filtering States
  const [selectedLand, setSelectedLand] = useState<string>("All"); // All, India, Global
  const [selectedMedium, setSelectedMedium] = useState<string>("All"); // All, CineFilm, Black & White

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Filter computation
  const filteredStories = useMemo(() => {
    return archiveStories.filter((story) => {
      const matchesLand = selectedLand === "All" || story.locationType === selectedLand;
      const matchesMedium = selectedMedium === "All" || story.mediumType === selectedMedium;
      return matchesLand && matchesMedium;
    });
  }, [archiveStories, selectedLand, selectedMedium]);

  // Paginated elements
  const paginatedStories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStories.slice(start, start + itemsPerPage);
  }, [filteredStories, currentPage]);

  const totalPages = Math.ceil(filteredStories.length / itemsPerPage) || 1;

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : totalPages));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : 1));
  };

  return (
    <div className="w-full pt-32 pb-24 max-w-7xl mx-auto px-6 md:px-20" id="archive-view-container">
      {/* 1. HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-outline-variant/20 pb-12">
        <div className="max-w-2xl space-y-4">
          <p className="font-sans text-xs tracking-[0.3em] text-primary font-semibold uppercase">
            COLLECTIONS
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-primary font-normal leading-tight">
            The Archive
          </h1>
          <p className="font-sans text-sm md:text-base text-outline leading-relaxed text-justify">
            A curated odyssey of quiet glances, heavy silks, and the timeless, custom rhythm of love. Each premium volume represents a high-fashion chapter of documentary cinema excellence.
          </p>
        </div>
        <div className="flex items-center gap-6 border-l border-outline/30 pl-8 h-20">
          <span className="font-display text-3xl md:text-5xl text-secondary">Vol. III</span>
          <div className="flex flex-col">
            <span className="font-sans text-[10px] text-outline tracking-widest font-semibold uppercase">
              EDITION
            </span>
            <span className="font-sans text-sm text-outline font-bold">2024</span>
          </div>
        </div>
      </header>

      {/* 2. INTERACTIVE FILTER SEGMENTS Choice */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-12 pb-6 border-b border-outline-variant/10">
        {/* Lands Filter */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="font-sans text-[9px] uppercase tracking-wider text-outline font-bold">Geography:</span>
          <div className="flex bg-surface-container/40 p-1 border border-outline-variant/20">
            {[
              { id: "All", label: "All Lands" },
              { id: "India", label: "India" },
              { id: "Global", label: "Global" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedLand(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 font-sans text-[9px] tracking-widest uppercase transition-all duration-350 ${
                  selectedLand === tab.id
                    ? "bg-primary text-surface font-semibold"
                    : "text-outline hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format Slate type filter */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <span className="font-sans text-[9px] uppercase tracking-wider text-outline font-bold">Medium:</span>
          <div className="flex bg-surface-container/40 p-1 border border-outline-variant/20">
            {[
              { id: "All", label: "All Formats" },
              { id: "CineFilm", label: "CineFilm" },
              { id: "Black & White", label: "B&W Mono" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedMedium(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 font-sans text-[9px] tracking-widest uppercase transition-all duration-350 ${
                  selectedMedium === tab.id
                    ? "bg-primary text-surface font-semibold"
                    : "text-outline hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC STORIES GRID */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedLand}-${selectedMedium}-${currentPage}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
          className="space-y-16"
        >
          {filteredStories.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-outline-variant/30 bg-surface-container-low">
              <Quote className="w-12 h-12 text-outline/30 mx-auto mb-4" />
              <p className="font-serif text-lg italic text-outline">
                No matching archival volumes configured in current filters.
              </p>
              <button
                onClick={() => {
                  setSelectedLand("All");
                  setSelectedMedium("All");
                }}
                className="mt-4 font-sans text-[10px] text-primary underline tracking-widest uppercase"
              >
                RESET SELECTORS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              {/* Main story panel - Grid span 8 */}
              {paginatedStories[0] && (
                <div
                  onClick={() => onSelectStory(paginatedStories[0])}
                  className="lg:col-span-8 group cursor-pointer relative space-y-6"
                  id={`archive-item-${paginatedStories[0].id}`}
                >
                  <div className="aspect-[4/3] md:aspect-[16/10] bg-surface-container-high overflow-hidden relative border border-outline-variant/10">
                    <img
                      alt={paginatedStories[0].photogAlt}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-100 group-hover:scale-105"
                      src={paginatedStories[0].image || (allUploadedPhotos.length > 0 ? allUploadedPhotos[5 % allUploadedPhotos.length] : "")}
                      referrerPolicy="no-referrer"
                    />
                    {/* Cinematic Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 md:p-12">
                      <span className="font-sans text-[9px] text-surface-container tracking-[0.25em] mb-2 font-semibold uppercase">
                        {paginatedStories[0].location}, {paginatedStories[0].year}
                      </span>
                      <h3 className="font-display text-3xl md:text-4xl text-surface font-light">
                        {paginatedStories[0].title}
                      </h3>
                      <div className="mt-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-surface flex items-center justify-center bg-surface/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                          {paginatedStories[0].isVideo ? (
                            <Play className="w-4 h-4 text-surface fill-current pl-0.5" />
                          ) : (
                            <Eye className="w-4 h-4 text-surface" />
                          )}
                        </div>
                        <span className="font-sans text-[10px] text-surface tracking-widest uppercase font-semibold">
                          {paginatedStories[0].isVideo ? "PLAY CINEMATIC REEL" : "EXPLORE STUDY"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-start pt-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-2xl text-primary font-normal">
                          {paginatedStories[0].title}
                        </h4>
                        <span className="px-2 py-0.5 border border-primary/20 text-outline text-[8px] tracking-wider uppercase font-semibold">
                          {paginatedStories[0].mediumType}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-outline mt-1.5 italic">
                        {paginatedStories[0].description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Second story panel & philosophy card - Grid span 4 */}
              <div className="lg:col-span-4 flex flex-col gap-10 lg:gap-16">
                {paginatedStories[1] ? (
                  <div
                    onClick={() => onSelectStory(paginatedStories[1])}
                    className="group cursor-pointer space-y-4"
                    id={`archive-item-${paginatedStories[1].id}`}
                  >
                    <div className="aspect-square bg-surface-container-high overflow-hidden border border-outline-variant/10">
                      <img
                        alt={paginatedStories[1].photogAlt}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-100 group-hover:scale-105"
                        src={paginatedStories[1].image || (allUploadedPhotos.length > 0 ? allUploadedPhotos[6 % allUploadedPhotos.length] : "")}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="border-t border-outline-variant/30 pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-sans text-[10px] text-primary tracking-widest block uppercase font-semibold">
                          {paginatedStories[1].location}
                        </span>
                        <span className="text-[8px] text-outline font-sans uppercase">
                          {paginatedStories[1].mediumType}
                        </span>
                      </div>
                      <h4 className="font-display text-xl text-primary italic font-normal">
                        {paginatedStories[1].title}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-outline-variant/30 bg-surface-container-low aspect-square flex flex-col justify-center items-center text-center p-8">
                    <p className="font-serif text-xs italic text-outline/60">
                      Select multiple segments to load more curated narratives.
                    </p>
                  </div>
                )}

                {/* Third story small banner / narrative */}
                {paginatedStories[2] ? (
                  <div
                    onClick={() => onSelectStory(paginatedStories[2])}
                    className="group cursor-pointer block border border-outline-variant/20 p-5 hover:border-primary/50 transition-all bg-surface-container-low"
                  >
                    <span className="font-sans text-[8px] text-outline block uppercase tracking-widest mb-1 font-semibold">
                      Featured Volume 0{currentPage + 2}
                    </span>
                    <h4 className="font-display text-lg text-primary">{paginatedStories[2].title}</h4>
                    <p className="font-serif text-[11px] text-outline italic leading-relaxed mt-1">
                      {paginatedStories[2].tagline || paginatedStories[2].description?.slice(0, 80) + "..."}
                    </p>
                  </div>
                ) : (
                  /* Premium quote block fallback */
                  <div className="bg-primary p-8 md:p-12 aspect-square flex flex-col justify-center items-center text-center relative border border-outline-variant/10 shadow-sm">
                    <Quote className="text-surface/10 absolute top-8 left-8 w-12 h-12" />
                    <blockquote className="font-display text-xl md:text-2xl text-surface italic leading-relaxed font-light">
                      "A time capsule of how it felt to be there."
                    </blockquote>
                    <div className="w-10 h-[1px] bg-surface/30 mt-8" />
                    <cite className="font-sans text-[10px] text-surface/60 mt-4 not-italic tracking-[0.25em] font-semibold uppercase">
                      ARCHIVE PHILOSOPHY
                    </cite>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 4. FILM STRIP TIMELINE ACCENT */}
      <div className="lg:col-span-12 mt-20">
        <div className="flex items-center gap-3 mb-10 border-b border-outline-variant/10 pb-4">
          <span className="font-sans text-xs tracking-widest text-outline uppercase font-semibold">
            ARCHIVAL CINE-STRIPS
          </span>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {filmStripPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className={`group aspect-[2/3] overflow-hidden relative border border-outline-variant/20 ${
                index % 2 === 1 ? "lg:translate-y-8" : ""
              }`}
            >
              <img
                alt={photo.alt}
                src={photo.src || (allUploadedPhotos.length > 0 ? allUploadedPhotos[(index + 7) % allUploadedPhotos.length] : "")}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-transform duration-[1.5s] group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. PAGINATION NAVIGATION CONTROLS */}
      {filteredStories.length > itemsPerPage && (
        <div className="mt-28 flex flex-col items-center gap-6">
          <div className="flex items-center gap-12">
            <button
              onClick={handlePrevPage}
              className="w-12 h-12 border border-outline-variant/50 rounded-full flex items-center justify-center hover:bg-primary hover:text-surface transition-all duration-300"
              aria-label="Previous Page"
              id="pagination-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="font-display text-xl md:text-2xl text-primary">
                0{currentPage} <span className="text-outline-variant mx-1">/</span> 0{totalPages}
              </p>
              <div className="w-32 h-1 bg-surface-container-highest mt-3 relative">
                <motion.div
                  layoutId="active-scroll-pagination"
                  className="absolute top-0 h-full bg-primary"
                  style={{
                    left: `${((currentPage - 1) / totalPages) * 100}%`,
                    width: `${(1 / totalPages) * 100}%`,
                  }}
                  transition={{ type: "spring", damping: 20 }}
                />
              </div>
            </div>
            <button
              onClick={handleNextPage}
              className="w-12 h-12 border border-outline-variant/50 rounded-full flex items-center justify-center hover:bg-primary hover:text-surface transition-all duration-300"
              aria-label="Next Page"
              id="pagination-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="font-sans text-[10px] text-outline tracking-widest font-semibold uppercase">
            SCROLL TO DISCOVER MORE VOLUMES & EDITIONS
          </p>
        </div>
      )}
    </div>
  );
}
