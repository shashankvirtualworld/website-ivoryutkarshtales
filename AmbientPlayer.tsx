import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Music, HelpCircle } from "lucide-react";

export default function AmbientPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [showTooltip, setShowTooltip] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Standard instrumental public domain relaxing ambient loop
    audioRef.current = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Browser audio permission waiting: ", err);
          alert("To activate our cinema soundscapes, interact with the screen first!");
        });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-[140] flex items-center gap-3 bg-surface/90 backdrop-blur-md px-4 py-2 border border-outline-variant/30 text-primary shadow-lg"
      id="ambient-audio-player"
    >
      <div className="relative">
        <button
          onClick={handleTogglePlay}
          className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-all duration-300"
          title={isPlaying ? "Mute Cinema Sound" : "Listen to Cinema Sound"}
        >
          {isPlaying ? (
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-outline" />
          )}
        </button>

        {/* Audio Pulsing Bars Equalizer */}
        {isPlaying && (
          <div className="absolute -top-1 -right-1 flex gap-0.5 items-end justify-center h-2.5">
            <span className="w-0.5 bg-primary animate-[bounce_0.8s_infinite] h-full" />
            <span className="w-0.5 bg-primary animate-[bounce_0.5s_infinite_0.1s] h-1.5" />
            <span className="w-0.5 bg-primary animate-[bounce_0.9s_infinite_0.2s] h-2" />
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <span className="font-sans text-[8px] uppercase tracking-widest text-outline leading-none">
          CINEMATIC SOUND
        </span>
        <span className="font-display text-[10px] text-primary italic leading-none mt-1">
          {isPlaying ? "Volume V - Active Loop" : "Soundscape Muted"}
        </span>
      </div>

      {/* Mini Volume Control Sliders */}
      {isPlaying && (
        <motion.input
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 45, opacity: 1 }}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
          className="h-1 bg-outline-variant/40 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-all ml-1 w-12"
          style={{ transform: "scaleY(0.8)" }}
        />
      )}

      {/* Dialogue Help Tooltip */}
      <div className="relative">
        <HelpCircle
          onClick={() => setShowTooltip(!showTooltip)}
          className="w-3.5 h-3.5 text-outline/50 hover:text-primary cursor-pointer transition-colors"
        />
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 bg-primary text-surface font-sans text-[10px] p-3 shadow-xl leading-relaxed whitespace-normal rounded-none"
            >
              This represents our signature 'Cinema soundscape'—a nostalgic, ambient piano curation backing our haute-couture bridal portfolios.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
