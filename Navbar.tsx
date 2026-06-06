import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  currentView: "home" | "archive" | "albums" | "videos";
  onNavigate: (view: "home" | "archive" | "albums" | "videos") => void;
  onInquire: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

export default function Navbar({
  currentView,
  onNavigate,
  onInquire,
  isMenuOpen,
  setIsMenuOpen,
}: NavbarProps) {
  const handleMenuClick = (view: "home" | "archive" | "albums" | "videos") => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleInquireClick = () => {
    setIsMenuOpen(false);
    onInquire();
  };

  return (
    <>
      {/* 1. TOP BAR */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-20 h-20 bg-surface/50 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-2 group p-2 -ml-2"
            aria-label="Open Navigation"
            id="btn-open-menu"
          >
            <Menu className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Brand name, centered */}
        <h1
          onClick={() => onNavigate("home")}
          className="font-display text-lg md:text-2xl tracking-[0.25em] text-primary absolute left-1/2 -translate-x-1/2 cursor-pointer uppercase select-none"
        >
          IVORY UTKARSH TALES
        </h1>

        <button
          onClick={onInquire}
          className="font-sans text-[10px] md:text-xs text-primary font-bold tracking-widest hover:text-tertiary transition-colors border-b border-primary/25 pb-1 uppercase"
          id="navbar-btn-inquire"
        >
          INQUIRE
        </button>
      </header>

      {/* 2. FULLSCREEN NAVIGATION OVERLAY */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] bg-surface flex flex-col justify-center items-center overflow-hidden"
            id="fullscreen-menu-overlay"
          >
            {/* Top Close button */}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-8 right-8 md:right-20 p-4 text-primary hover:rotate-90 transition-transform duration-300"
              aria-label="Close Navigation"
              id="btn-close-menu"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Menu Links */}
            <div className="flex flex-col items-center gap-6 md:gap-10 text-center">
              <span className="font-sans text-[10px] text-outline tracking-[0.44em] uppercase mb-4 block font-semibold select-none">
                IVUT CHAPTERS
              </span>
              <nav className="flex flex-col items-center gap-5 md:gap-8">
                <button
                  onClick={() => handleMenuClick("home")}
                  className={`font-display text-4xl md:text-7xl font-light tracking-wide transition-all duration-300 ${
                    currentView === "home"
                      ? "text-primary italic font-normal"
                      : "text-outline hover:text-primary hover:italic"
                  }`}
                >
                  HOME
                </button>
                <button
                  onClick={() => handleMenuClick("archive")}
                  className={`font-display text-4xl md:text-7xl font-light tracking-wide transition-all duration-300 ${
                    currentView === "archive"
                      ? "text-primary italic font-normal"
                      : "text-outline hover:text-primary hover:italic"
                  }`}
                >
                  THE ARCHIVE
                </button>
                <button
                  onClick={() => handleMenuClick("albums")}
                  className={`font-display text-4xl md:text-7xl font-light tracking-wide transition-all duration-300 ${
                    currentView === "albums"
                      ? "text-primary italic font-normal"
                      : "text-outline hover:text-primary hover:italic"
                  }`}
                  id="nav-btn-albums"
                >
                  CLIENT ALBUMS
                </button>
                <button
                  onClick={() => handleMenuClick("videos")}
                  className={`font-display text-4xl md:text-7xl font-light tracking-wide transition-all duration-300 ${
                    currentView === "videos"
                      ? "text-primary italic font-normal"
                      : "text-outline hover:text-primary hover:italic"
                  }`}
                  id="nav-btn-videos"
                >
                  CLIENT VIDEOS
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // Trigger custom beautiful transition block in Home page
                    const contactSection = document.getElementById("philosophy-section");
                    if (contactSection) {
                      contactSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="font-display text-4xl md:text-7xl text-outline hover:text-primary hover:italic font-light tracking-wide transition-all duration-300"
                >
                  PHILOSOPHY
                </button>
                <button
                  onClick={handleInquireClick}
                  className="font-display text-4xl md:text-7xl text-outline hover:text-primary hover:italic font-light tracking-wide transition-all duration-300"
                >
                  CONTACT
                </button>
              </nav>
            </div>

            {/* Downward Social links */}
            <div className="absolute bottom-16 flex gap-10">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Redirecting to Ivory Utkarsh Tales on Instagram.");
                }}
                className="font-sans text-[10px] md:text-xs text-outline hover:text-primary font-semibold tracking-widest uppercase transition-colors"
              >
                INSTAGRAM
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Redirecting to Ivory Utkarsh Tales Cinema Portfolio on Vimeo.");
                }}
                className="font-sans text-[10px] md:text-xs text-outline hover:text-primary font-semibold tracking-widest uppercase transition-colors"
              >
                VIMEO
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
