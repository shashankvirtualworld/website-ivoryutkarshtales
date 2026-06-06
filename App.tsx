import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import HomeView from "./components/HomeView";
import ArchiveView from "./components/ArchiveView";
import AlbumsView from "./components/AlbumsView";
import VideosView from "./components/VideosView";
import StoryDetailModal from "./components/StoryDetailModal";
import InquiryDrawer from "./components/InquiryDrawer";
import AdminPanel from "./components/AdminPanel";
import AmbientPlayer from "./components/AmbientPlayer";
import { Story } from "./types";
import { Camera, Film, Instagram, Youtube, HelpCircle, Shield } from "lucide-react";
import {
  loadHomePortfolio,
  loadArchiveStories,
  loadFilmStripPhotos,
  loadInvestmentPackages,
  safeGetItem
} from "./utils/storage";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "archive" | "albums" | "videos">("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic user editable content states
  const [homeStories, setHomeStories] = useState<Story[]>(() => loadHomePortfolio());
  const [archiveStories, setArchiveStories] = useState<Story[]>(() => loadArchiveStories());
  const [filmStripPhotos, setFilmStripPhotos] = useState<any[]>(() => loadFilmStripPhotos());
  const [investmentPackages, setInvestmentPackages] = useState<any[]>(() => loadInvestmentPackages());

  const [heroTitle, setHeroTitle] = useState(() => safeGetItem("ivory_hero_title") || "Ivory Utkarsh Tales");
  const [heroTagline, setHeroTagline] = useState(() => safeGetItem("ivory_hero_tagline") || "Poetic Wedding Storytelling • Pan India & Global");


  
  // Custom toast notification state for interactive delight
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initial loading sequence
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to top on view changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentView]);

  const handleSelectStory = (story: Story) => {
    setSelectedStory(story);
  };



  return (
    <div className="relative min-h-screen bg-surface text-on-surface select-none selection:bg-primary/20 selection:text-primary animate-fade-in">
      {/* 0. INTRODUCTORY LOADER */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-surface z-[200] flex flex-col justify-center items-center"
            id="loader"
          >
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="font-display text-3xl md:text-4xl italic tracking-tighter text-primary"
                id="loader-text"
              >
                Ivory Utkarsh Tales
              </motion.h2>
            </div>
            <div className="w-24 h-[1px] bg-secondary/20 mt-4 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 bg-secondary"
                id="loader-progress"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Film grain backdrop */}
      <div className="film-grain" />

      {/* Floating Header */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onInquire={() => setIsInquiryOpen(true)}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      {/* Main Views Container */}
      <main className="relative z-10">
        {currentView === "home" ? (
          <HomeView
            onSelectStory={handleSelectStory}
            onInquire={() => setIsInquiryOpen(true)}
            onNavigateToArchive={() => setCurrentView("archive")}
            onNavigateToAlbums={() => setCurrentView("albums")}
            onNavigateToVideos={() => setCurrentView("videos")}
            homeStories={homeStories}
            heroTitle={heroTitle}
            heroTagline={heroTagline}
          />
        ) : currentView === "archive" ? (
          <ArchiveView
            onSelectStory={handleSelectStory}
            onInquire={() => setIsInquiryOpen(true)}
            archiveStories={archiveStories}
            filmStripPhotos={filmStripPhotos}
          />
        ) : currentView === "albums" ? (
          <AlbumsView />
        ) : (
          <VideosView />
        )}
      </main>

      {/* Interactive Floating Quick Utility Menu */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-3 bg-surface/80 backdrop-blur-md px-4 py-2 border border-outline-variant/30 rounded-none shadow-sm">
        <span className="font-sans text-[10px] text-outline font-semibold uppercase tracking-widest leading-none">
          Active Space: {currentView === "home" ? "Portal" : currentView === "archive" ? "Archives" : currentView === "albums" ? "Albums" : "Videos"}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <button
          onClick={() => {
            if (currentView === "home") setCurrentView("archive");
            else if (currentView === "archive") setCurrentView("albums");
            else if (currentView === "albums") setCurrentView("videos");
            else setCurrentView("home");
          }}
          className="text-[9px] bg-primary text-surface px-2 py-1 font-semibold tracking-wider hover:bg-tertiary transition-colors uppercase"
          id="btn-space-toggle"
        >
          {currentView === "home" ? "ARCHIVE" : currentView === "archive" ? "ALBUMS" : currentView === "albums" ? "VIDEOS" : "HOME"}
        </button>
      </div>

      {/* Toast Prompt for prefilled volume */}
      {toastMessage && (
        <div className="fixed bottom-8 left-8 z-[150] bg-primary text-surface p-4 border border-outline-variant/30 font-sans text-xs tracking-widest shadow-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-surface animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STORY DETAIL LIGHTBOX MODAL */}
      <StoryDetailModal
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
        onInquire={() => {
          setSelectedStory(null);
          setTimeout(() => setIsInquiryOpen(true), 300);
        }}
      />

      {/* INQUIRY SEAMLESS SLIDER DRAWER */}
      <InquiryDrawer
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
      />

      {/* SECURE OWNER & EDITOR REGISTRY PANEL */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        homeStories={homeStories}
        setHomeStories={setHomeStories}
        archiveStories={archiveStories}
        setArchiveStories={setArchiveStories}
        filmStripPhotos={filmStripPhotos}
        setFilmStripPhotos={setFilmStripPhotos}
        investmentPackages={investmentPackages}
        setInvestmentPackages={setInvestmentPackages}
        heroTitle={heroTitle}
        setHeroTitle={setHeroTitle}
        heroTagline={heroTagline}
        setHeroTagline={setHeroTagline}
      />

      {/* AMBIENT CINEMA AUDIO PLAYER */}
      <AmbientPlayer />

      {/* GLOBAL FOOTER - Adaptable luxury alignment */}
      <footer className="relative bg-surface border-t border-outline-variant/20 pt-20 pb-16 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          {currentView === "home" ? (
            /* Home aligned asymmetric footer */
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
              <div className="flex flex-col gap-8">
                <h2 className="font-display text-4xl md:text-5xl text-primary leading-[1.05] uppercase tracking-wide">
                  IVORY<br />
                  UTKARSH<br />
                  TALES
                </h2>
                <div className="flex gap-6">
                  <a
                    href="https://www.instagram.com/ivoryutkarshtales/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[10px] md:text-xs text-outline hover:text-primary font-semibold tracking-wider uppercase transition-colors"
                  >
                    INSTAGRAM
                  </a>
                  <a
                    href="https://www.facebook.com/utkarshabhijit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[10px] md:text-xs text-outline hover:text-primary font-semibold tracking-wider uppercase transition-colors"
                  >
                    FACEBOOK
                  </a>
                  <a
                    href="https://wa.me/917250588087"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[10px] md:text-xs text-outline hover:text-primary font-semibold tracking-wider uppercase transition-colors"
                  >
                    WHATSAPP
                  </a>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-5">
                <p className="font-display text-xl md:text-2xl italic text-primary font-light">
                  ivoryutkarshtales.co.in
                </p>
                <div className="flex flex-col md:items-end gap-1 text-[10px] tracking-widest text-outline uppercase font-semibold">
                  <p>01 / 05 Vol. III</p>
                  <p className="text-[9px] text-outline-variant/80 mt-2 font-normal flex items-center justify-end flex-wrap gap-2">
                    <span>© 2024 IVORY UTKARSH TALES. ALL RIGHTS RESERVED.</span>
                    <span
                      onClick={() => setIsAdminOpen(true)}
                      className="cursor-pointer text-primary hover:text-tertiary transition-colors border border-primary/25 px-2 py-0.5 text-[8px] tracking-widest inline-block uppercase"
                      id="studio-trigger-footer-home"
                    >
                      Studio Registry
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Centered symmetrical editorial footer */
            <div className="flex flex-col items-center text-center gap-8">
              <span className="font-display text-2xl md:text-3xl text-primary tracking-[0.25em] uppercase font-light">
                IVORY UTKARSH TALES
              </span>
              <nav className="flex gap-6 md:gap-10 flex-wrap justify-center font-sans text-[10px] md:text-xs text-outline tracking-widest uppercase font-semibold">
                <a href="https://www.instagram.com/ivoryutkarshtales/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">INSTAGRAM</a>
                <a href="https://www.facebook.com/utkarshabhijit" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">FACEBOOK</a>
                <a href="https://wa.me/917250588087" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WHATSAPP</a>
              </nav>
              <div className="space-y-2 mt-4 text-center">
                <p className="font-sans text-[11px] text-on-surface-variant font-medium tracking-wide flex items-center justify-center gap-2.5 flex-wrap">
                  <span>© 2024 IVORY UTKARSH TALES. ALL RIGHTS RESERVED.</span>
                  <span
                    onClick={() => setIsAdminOpen(true)}
                    className="cursor-pointer text-primary hover:text-tertiary transition-colors border border-primary/25 px-2 py-0.5 text-[8px] tracking-widest inline-block uppercase font-sans font-bold"
                    id="studio-trigger-footer-archive"
                  >
                    Studio Registry
                  </span>
                </p>
                <p className="font-sans text-[9px] text-outline tracking-[0.2em] uppercase">
                  DOCUMENTARY WEDDING PHOTOGRAPHY & CINEMATOGRAPHY
                </p>
              </div>
              {/* Soft mini branding controls */}
              <div className="flex gap-4 mt-4 text-outline-variant">
                <div className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:text-primary hover:border-primary transition-all cursor-pointer">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center hover:text-primary hover:border-primary transition-all cursor-pointer">
                  <Film className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
