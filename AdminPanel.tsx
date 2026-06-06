import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Lock,
  Key,
  Filter,
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Trash2,
  Edit3,
  ShieldAlert,
  Plus,
  Save,
  Image as ImageIcon,
  Film,
  Compass,
  Briefcase
} from "lucide-react";
import { InquiryFormData, Story, Package } from "../types";
import {
  safeGetItem,
  safeSetItem,
  compressImage,
  saveHomePortfolio,
  saveArchiveStories,
  saveFilmStripPhotos,
  saveInvestmentPackages,
  loadPortfolioGridImages,
  savePortfolioGridImages
} from "../utils/storage";
import { resolveImage } from "../data";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  homeStories: Story[];
  setHomeStories: React.Dispatch<React.SetStateAction<Story[]>>;
  archiveStories: Story[];
  setArchiveStories: React.Dispatch<React.SetStateAction<Story[]>>;
  filmStripPhotos: any[];
  setFilmStripPhotos: React.Dispatch<React.SetStateAction<any[]>>;
  investmentPackages: any[];
  setInvestmentPackages: React.Dispatch<React.SetStateAction<any[]>>;
  heroTitle?: string;
  setHeroTitle?: (val: string) => void;
  heroTagline?: string;
  setHeroTagline?: (val: string) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  homeStories,
  setHomeStories,
  archiveStories,
  setArchiveStories,
  filmStripPhotos,
  setFilmStripPhotos,
  investmentPackages,
  setInvestmentPackages,
  heroTitle = "Ivory Utkarsh Tales",
  setHeroTitle,
  heroTagline = "Poetic Wedding Storytelling • Pan India & Global",
  setHeroTagline,
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"inquiries" | "stories" | "packages" | "filmstrips" | "hero" | "portfolio">("inquiries");

  // Inquiries State
  const [inquiries, setInquiries] = useState<InquiryFormData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  // Story Editor state
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyForm, setStoryForm] = useState<Partial<Story> & { targetList: "home" | "archive" }>({
    targetList: "home",
    id: "",
    title: "",
    location: "",
    year: "",
    image: "",
    photogAlt: "",
    tagline: "",
    description: "",
    isVideo: false,
    locationType: "India",
    mediumType: "CineFilm",
  });
  const [storyUploadLoading, setStoryUploadLoading] = useState(false);

  // Filmstrip Editor state
  const [editingStripId, setEditingStripId] = useState<string | null>(null);
  const [stripForm, setStripForm] = useState({ alt: "", src: "" });

  // Package Editor state
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState<Package>({
    id: "",
    name: "",
    investment: "",
    intro: "",
    idealFor: "",
    includes: [],
  });
  const [packageIncludesText, setPackageIncludesText] = useState("");

  // Hero section editing state
  const [heroTitleVal, setHeroTitleVal] = useState(heroTitle);
  const [heroTaglineVal, setHeroTaglineVal] = useState(heroTagline);
  const [heroBgVal, setHeroBgVal] = useState(() => safeGetItem("ivory_utkarsh_hero_bg") || "solid-1");
  const [heroBgGrayscaleVal, setHeroBgGrayscaleVal] = useState(() => safeGetItem("ivory_utkarsh_hero_bg_grayscale") !== "false");
  const [heroUploadLoading, setHeroUploadLoading] = useState(false);

  // Sync state if props change (centralized React sync)
  useEffect(() => {
    setHeroTitleVal(heroTitle);
  }, [heroTitle]);

  useEffect(() => {
    setHeroTaglineVal(heroTagline);
  }, [heroTagline]);

  // Portfolio Grid CMS editing state
  const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [portfolioUploadLoading, setPortfolioUploadLoading] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({ alt: "", src: "", category: "Editorial" });
  const [portfolioAddForm, setPortfolioAddForm] = useState({ alt: "", src: "", category: "Editorial" });

  // Handle loading and synchronizing
  useEffect(() => {
    if (isOpen) {
      loadInquiries();
      loadPortfolioImagesFromDb();
      setHeroBgVal(safeGetItem("ivory_utkarsh_hero_bg") || "solid-1");
      setHeroBgGrayscaleVal(safeGetItem("ivory_utkarsh_hero_bg_grayscale") !== "false");
    }
  }, [isOpen]);

  const loadPortfolioImagesFromDb = async () => {
    const images = await loadPortfolioGridImages();
    setPortfolioImages(images);
  };

  const loadInquiries = () => {
    const raw = safeGetItem("tales_inquiries") || "[]";
    try {
      const parsed = JSON.parse(raw);
      setInquiries(parsed);
    } catch {
      setInquiries([]);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toUpperCase();
    const cleanPass = password.trim().toUpperCase();

    if ((cleanUser === "UTKARSH2026" && cleanPass === "IVORY") || (cleanUser === "IVORY" && cleanPass === "UTKARSH2026")) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Signature mismatch. Check credentials. (Try UTKARSH2026 / IVORY)");
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case "Booked":
        return "bg-primary text-surface font-semibold";
      case "Locked":
        return "bg-tertiary/15 text-tertiary border border-tertiary/30";
      case "Contacted":
        return "bg-secondary/15 text-secondary border border-secondary/30";
      default:
        return "bg-surface-container text-outline border border-outline-variant/30";
    }
  };

  const updateInquiry = (id: string, updatedFields: Partial<InquiryFormData>) => {
    const updated = inquiries.map((inq) => {
      if (inq.id === id) {
        return { ...inq, ...updatedFields };
      }
      return inq;
    });
    setInquiries(updated);
    safeSetItem("tales_inquiries", JSON.stringify(updated));
  };

  const deleteInquiry = (id: string) => {
    if (confirm("Are you sure you want to dismiss this inquiry permanently?")) {
      const filtered = inquiries.filter((inq) => inq.id !== id);
      setInquiries(filtered);
      safeSetItem("tales_inquiries", JSON.stringify(filtered));
    }
  };

  const parseBaseBudget = (raw?: string) => {
    if (!raw) return 0;
    const clean = raw.replace(/[^0-9]/g, "");
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? 280000 : parsed;
  };

  const metrics = useMemo(() => {
    const total = inquiries.length;
    let potentialValue = 0;
    let bookedValue = 0;
    let bookedCount = 0;

    inquiries.forEach((inq) => {
      const budget = parseBaseBudget(inq.estimatedBudget);
      potentialValue += budget;

      if (inq.status === "Booked") {
        bookedValue += budget;
        bookedCount++;
      }
    });

    const conversionRate = total > 0 ? Math.round((bookedCount / total) * 100) : 0;

    return {
      total,
      potentialValue,
      bookedValue,
      conversionRate,
    };
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (inq.fullName || "").toLowerCase().includes(query) ||
        (inq.partnerName || "").toLowerCase().includes(query) ||
        (inq.location || "").toLowerCase().includes(query) ||
        (inq.email || "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || inq.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  const exportToCSV = () => {
    const headers = "ID,Full Name,Partner,Email,Phone,Date,Location,Volume,Budget,Referrer,Status,DateCreated,Notes\n";
    const rows = inquiries
      .map((i) => {
        return `"${i.id}","${i.fullName}","${i.partnerName || "N/A"}","${i.email}","${i.phone}","${i.date}","${i.location}","${i.selectedPackage || ""}","${i.estimatedBudget || ""}","${i.referrer || ""}","${i.status || "Pending"}","${i.dateCreated || ""}","${(i.notes || "").replace(/"/g, '""')}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ivory_utkarsh_inquiries_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Image Upload handler with compression
  const handleStoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStoryUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      const compressed = await compressImage(base64Str, 1200, 0.7);
      setStoryForm((prev) => ({ ...prev, image: compressed }));
      setStoryUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStripImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      const compressed = await compressImage(base64Str, 1200, 0.7);
      setStripForm((prev) => ({ ...prev, src: compressed }));
    };
    reader.readAsDataURL(file);
  };

  // Story CRUD Save handler
  const saveStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.title || !storyForm.location) {
      alert("Please provide at least a title and location for this wedding.");
      return;
    }

    const imageToUse = storyForm.image || "/src/assets/images/regenerated_image_1780315951259.jpg";
    const isVideoChecked = !!storyForm.isVideo;

    const finalStoryObj: Story = {
      id: storyForm.id || `custom-story-${Date.now()}`,
      title: storyForm.title.trim(),
      location: storyForm.location.trim(),
      year: (storyForm.year || `${new Date().getFullYear()}`).trim(),
      image: imageToUse,
      photogAlt: storyForm.photogAlt?.trim() || `${storyForm.title} by Utkarsh`,
      tagline: storyForm.tagline?.trim() || "Dynamic Commission Story",
      description: storyForm.description?.trim() || "Filmed beautifully by Ivory Utkarsh Tales.",
      isVideo: isVideoChecked,
      locationType: storyForm.locationType || "India",
      mediumType: storyForm.mediumType || "CineFilm",
    };

    // Remove existing from both lists to prevent duplicates
    const cleanedHome = homeStories.filter((s) => s.id !== finalStoryObj.id);
    const cleanedArchive = archiveStories.filter((s) => s.id !== finalStoryObj.id);

    if (storyForm.targetList === "home") {
      const newList = [finalStoryObj, ...cleanedHome];
      setHomeStories(newList);
      saveHomePortfolio(newList);
      setArchiveStories(cleanedArchive);
      saveArchiveStories(cleanedArchive);
    } else {
      const newList = [finalStoryObj, ...cleanedArchive];
      setArchiveStories(newList);
      saveArchiveStories(newList);
      setHomeStories(cleanedHome);
      saveHomePortfolio(cleanedHome);
    }

    // Reset Form
    setIsAddingStory(false);
    setEditingStory(null);
    setStoryForm({
      targetList: "home",
      id: "",
      title: "",
      location: "",
      year: "",
      image: "",
      photogAlt: "",
      tagline: "",
      description: "",
      isVideo: false,
      locationType: "India",
      mediumType: "CineFilm",
    });
  };

  // Delete Story Handler
  const deleteStoryFromList = (id: string, list: "home" | "archive") => {
    if (!confirm("Are you sure you want to permanently delete this story segment from the website?")) return;

    if (list === "home") {
      const updated = homeStories.filter((s) => s.id !== id);
      setHomeStories(updated);
      saveHomePortfolio(updated);
    } else {
      const updated = archiveStories.filter((s) => s.id !== id);
      setArchiveStories(updated);
      saveArchiveStories(updated);
    }
  };

  // Start Editing Story Form
  const startEditStoryObj = (story: Story, list: "home" | "archive") => {
    setEditingStory(story);
    setStoryForm({
      ...story,
      targetList: list,
    });
    setIsAddingStory(true);
  };

  // Strip Custom Save handler
  const saveStripChanges = (id: string) => {
    const updated = filmStripPhotos.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          alt: stripForm.alt || item.alt,
          src: stripForm.src || item.src,
        };
      }
      return item;
    });

    setFilmStripPhotos(updated);
    saveFilmStripPhotos(updated);
    setEditingStripId(null);
  };

  // Package Save handler
  const savePackageChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackageId) return;

    const includesArr = packageIncludesText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const updated = investmentPackages.map((pkg) => {
      if (pkg.id === editingPackageId) {
        return {
          ...packageForm,
          includes: includesArr,
        };
      }
      return pkg;
    });

    setInvestmentPackages(updated);
    saveInvestmentPackages(updated);
    setEditingPackageId(null);
  };

  const startEditingPackageObj = (pkg: Package) => {
    setEditingPackageId(pkg.id);
    setPackageForm(pkg);
    setPackageIncludesText((pkg.includes || []).join("\n"));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ambient Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/45 backdrop-blur-md z-50 transition-opacity"
            id="admin-backdrop"
          />

          {/* Secure Center Panel Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="fixed inset-x-4 top-6 bottom-6 md:inset-8 bg-surface z-50 overflow-y-auto outline-none border border-outline-variant/30 max-w-6xl mx-auto flex flex-col p-6 md:p-10 justify-between shadow-2xl"
            id="admin-panel-container"
          >
            {/* Header section panel */}
            <div className="flex justify-between items-baseline border-b border-outline-variant/20 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-[9px] tracking-[0.4em] text-outline uppercase block">
                    OFFICIAL INTERNAL SECURE REGISTRY
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                </div>
                <h2 className="font-display text-2xl text-primary">
                  The Ivory <span className="italic font-light">Studio Vault</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                id="btn-close-admin-panel"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Authentication Layer */}
            {!isAuthenticated ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="max-w-md w-full border border-primary/20 bg-surface-container-low p-8 md:p-10"
                >
                  <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full text-primary">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl text-primary text-center mb-1">Authenticating Curator</h3>
                  <p className="font-sans text-[9px] text-center text-outline uppercase tracking-wider mb-6">
                    Private Authority Only
                  </p>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1">
                      <label className="font-sans text-[10px] uppercase tracking-widest text-outline block font-semibold">
                        Username / Studio ID
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-primary"
                        placeholder="UTKARSH2026"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-sans text-[10px] uppercase tracking-widest text-outline block font-semibold">
                        Secret Security Pass
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-primary"
                        placeholder="••••"
                        required
                      />
                    </div>

                    {authError && (
                      <div className="bg-red-500/10 text-red-700 p-3 text-xs border border-red-500/20 flex gap-2 items-center">
                        <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-primary hover:bg-tertiary transition-colors text-surface font-sans text-xs tracking-widest font-semibold flex items-center justify-center gap-2 uppercase duration-300 shadow-sm"
                    >
                      AUTHENTICATE VAULT <Key className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              </div>
            ) : (
              /* RESTRICTED INTERNAL STUDIO CONSOLE - WITH EDITOR TABS */
              <div className="flex-1 flex flex-col overflow-hidden" id="restricted-admin-console">
                {/* Tab selector menu */}
                <div className="flex border-b border-outline-variant/20 mb-6 gap-2 overflow-x-auto text-xs pb-1" id="admin-tabs">
                  <button
                    onClick={() => setActiveTab("inquiries")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-all duration-200 ${
                      activeTab === "inquiries"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Registry Logs ({inquiries.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("stories")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-all duration-200 ${
                      activeTab === "stories"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Stories Desk ({homeStories.length + archiveStories.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("packages")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-all duration-200 ${
                      activeTab === "packages"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Investment Packages
                  </button>
                  <button
                    onClick={() => setActiveTab("filmstrips")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-colors duration-200 shrink-0 ${
                      activeTab === "filmstrips"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Archival Cine-Strips
                  </button>
                  <button
                    onClick={() => setActiveTab("hero")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-colors duration-200 shrink-0 ${
                      activeTab === "hero"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Hero Section
                  </button>
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className={`px-4 py-2 font-sans tracking-widest uppercase font-semibold transition-colors duration-200 shrink-0 ${
                      activeTab === "portfolio"
                        ? "border-b-2 border-primary text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    Portfolio Library ({portfolioImages.length})
                  </button>
                </div>

                {/* TAB CONTENT: 1. INQUIRIES GUEST LOGS */}
                {activeTab === "inquiries" && (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Stats Dashboard Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="border border-outline-variant/30 bg-surface-container-low p-4">
                        <span className="font-sans text-[9px] tracking-widest text-outline block uppercase mb-1">
                          Total Inquiries
                        </span>
                        <p className="font-display text-2xl font-semibold text-primary">{metrics.total}</p>
                        <span className="text-[10px] text-outline font-serif block italic">
                          Active digital submissions
                        </span>
                      </div>

                      <div className="border border-outline-variant/30 bg-surface-container-low p-4">
                        <span className="font-sans text-[9px] tracking-widest text-outline block uppercase mb-1">
                          Pipeline Estimation
                        </span>
                        <p className="font-display text-xl font-bold text-tertiary italic">
                          ₹{metrics.potentialValue.toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] text-outline font-serif block italic">
                          Combined luxury scope
                        </span>
                      </div>

                      <div className="border border-outline-variant/30 bg-surface-container-low p-4">
                        <span className="font-sans text-[9px] tracking-widest text-secondary block uppercase mb-1">
                          Booked Value
                        </span>
                        <p className="font-display text-xl font-bold text-secondary">
                          ₹{metrics.bookedValue.toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] text-outline font-serif block italic">
                          Retainers locked safely
                        </span>
                      </div>

                      <div className="border border-outline-variant/30 bg-surface-container-low p-4">
                        <span className="font-sans text-[9px] tracking-widest text-outline block uppercase mb-1">
                          Conversion Rate
                        </span>
                        <p className="font-display text-2xl font-semibold text-primary">{metrics.conversionRate}%</p>
                        <span className="text-[10px] text-outline font-serif block italic">
                          Qualified lead lock-rates
                        </span>
                      </div>
                    </div>

                    {/* Operations bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 mb-4 border-b border-outline-variant/15">
                      <div className="flex flex-1 gap-4 items-center w-full">
                        <div className="relative flex-1 max-w-md w-full">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Client, partner or location..."
                            className="w-full bg-surface-container-low text-primary border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Filter className="w-3 h-3 text-outline" />
                          <span className="font-sans text-[10px] text-outline uppercase font-semibold">STAGE:</span>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-surface text-primary border border-outline-variant/30 text-[11px] py-1 px-2 focus:outline-none"
                          >
                            <option value="All">All Inquiries</option>
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Locked">Locked</option>
                            <option value="Booked">Booked</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={exportToCSV}
                        className="flex justify-center items-center gap-2 px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-surface text-[9px] tracking-wider uppercase font-semibold transition-colors duration-200 font-sans"
                      >
                        <Download className="w-3 h-3" /> EXPORT EXCEL DATASHEET
                      </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {filteredInquiries.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-outline-variant/40 bg-surface-container-low">
                          <FileText className="w-10 h-10 text-outline-variant/60 mx-auto mb-3" />
                          <p className="font-serif text-xs italic text-outline">No client submissions reported.</p>
                        </div>
                      ) : (
                        filteredInquiries.map((inq) => (
                          <div
                            key={inq.id}
                            className="border border-outline-variant/20 hover:border-outline-variant/50 bg-surface-container-low p-5 transition-all flex flex-col md:flex-row justify-between items-start gap-4"
                          >
                            <div className="flex-1 space-y-4 w-full">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h4 className="font-display text-lg text-primary uppercase font-bold">
                                    {inq.fullName} {inq.partnerName && (
                                      <span className="font-normal font-sans text-xs text-outline lowercase italic font-medium">
                                        & {inq.partnerName}
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-outline font-serif mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {inq.date || "TBD"}
                                    </span>
                                    <span>•</span>
                                    <span>{inq.location}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <select
                                    value={inq.status || "Pending"}
                                    onChange={(e) => updateInquiry(inq.id || "", { status: e.target.value })}
                                    className={`text-[9px] px-2 py-0.5 font-semibold focus:outline-none transition-colors border border-transparent ${getStatusStyle(
                                      inq.status
                                    )}`}
                                  >
                                    <option className="bg-surface text-primary" value="Pending">Pending</option>
                                    <option className="bg-surface text-primary" value="Contacted">Contacted</option>
                                    <option className="bg-surface text-primary" value="Locked">Locked</option>
                                    <option className="bg-surface text-primary" value="Booked">Booked</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 bg-surface p-2.5 border border-outline-variant/10 text-xs">
                                <div>
                                  <p className="text-[8px] text-outline font-sans uppercase font-semibold">Volume:</p>
                                  <p className="text-primary font-display font-medium italic">{inq.selectedPackage || "Standard Commission"}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] text-outline font-sans uppercase font-semibold">Budget:</p>
                                  <p className="text-tertiary font-sans font-semibold">{inq.estimatedBudget || "TBD"}</p>
                                </div>
                              </div>

                              {inq.details && (
                                <div className="text-xs text-on-surface-variant leading-relaxed italic bg-surface/30 p-2 border-l border-primary/30">
                                  "{inq.details}"
                                </div>
                              )}

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-outline font-sans">
                                <span>Email: <strong className="text-primary font-semibold">{inq.email}</strong></span>
                                <span>Phone: <strong className="text-primary font-semibold">{inq.phone}</strong></span>
                                {inq.referrer && (
                                  <span>Referral: <strong className="text-secondary">{inq.referrer}</strong></span>
                                )}
                              </div>

                              <div className="border-t border-outline-variant/15 pt-3">
                                {editingInquiryId === inq.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingNotes}
                                      onChange={(e) => setEditingNotes(e.target.value)}
                                      className="w-full h-16 text-xs p-2 bg-surface text-primary border border-primary/30 focus:outline-none"
                                      placeholder="Note internal annotations..."
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          updateInquiry(inq.id || "", { notes: editingNotes });
                                          setEditingInquiryId(null);
                                        }}
                                        className="bg-primary text-surface px-3 py-1 text-[9px] uppercase font-sans font-semibold hover:bg-tertiary"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingInquiryId(null)}
                                        className="border border-outline-variant text-primary px-3 py-1 text-[9px] uppercase font-sans font-semibold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <label className="text-[8px] text-outline uppercase font-semibold block">Notes:</label>
                                      {inq.notes ? (
                                        <p className="text-[11px] text-primary italic leading-relaxed mt-0.5">{inq.notes}</p>
                                      ) : (
                                        <span className="text-[10px] text-outline/45 italic block">No notes entered.</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditingInquiryId(inq.id || null);
                                        setEditingNotes(inq.notes || "");
                                      }}
                                      className="flex items-center gap-1 text-[9px] text-outline hover:text-primary transition-colors border border-outline-variant/30 px-2 py-0.5 bg-surface"
                                    >
                                      <Edit3 className="w-3 h-3" /> Edit Note
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => deleteInquiry(inq.id || "")}
                              className="p-1 text-outline-variant hover:text-red-600 transition-colors self-end md:self-start"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: 2. CURATION DESK (STORIES WRITER) */}
                {activeTab === "stories" && (
                  <div className="flex flex-col flex-1 overflow-hidden" id="admin-stories-tab">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/10">
                      <p className="font-serif text-xs italic text-outline">
                        Create, modify, and restructure luxury showcases on the home and archives screens.
                      </p>
                      {!isAddingStory && (
                        <button
                          onClick={() => {
                            setEditingStory(null);
                            setStoryForm({
                              targetList: "home",
                              id: "",
                              title: "",
                              location: "",
                              year: "",
                              image: "",
                              photogAlt: "",
                              tagline: "",
                              description: "",
                              isVideo: false,
                              locationType: "India",
                              mediumType: "CineFilm",
                            });
                            setIsAddingStory(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-surface hover:bg-tertiary transition-colors text-[10px] uppercase font-sans font-semibold tracking-wider"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add New Story Segment
                        </button>
                      )}
                    </div>

                    {isAddingStory ? (
                      /* STORY EDITING/CREATION FORM */
                      <form onSubmit={saveStory} className="space-y-4 bg-surface-container-low p-5 border border-outline-variant/20 overflow-y-auto max-h-[460px] pr-2">
                        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                          <h3 className="font-display text-sm text-primary uppercase font-bold">
                            {editingStory ? `Modify Story: ${editingStory.title}` : "Create Brand New Showcase Story"}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsAddingStory(false)}
                            className="text-xs text-outline hover:text-primary transition-colors font-sans uppercase font-semibold"
                          >
                            Cancel Back
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Showcase Title (Names)</label>
                            <input
                              type="text"
                              value={storyForm.title}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, title: e.target.value }))}
                              placeholder="e.g. Shreya & Devanshu"
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Phonetic Venue & Location</label>
                            <input
                              type="text"
                              value={storyForm.location}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, location: e.target.value }))}
                              placeholder="e.g. Phuket, Thailand or Goa Seafacing"
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Commission Tagline / Theme</label>
                            <input
                              type="text"
                              value={storyForm.tagline}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, tagline: e.target.value }))}
                              placeholder="e.g. Heritage Union"
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Chronological Year</label>
                            <input
                              type="text"
                              value={storyForm.year}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, year: e.target.value }))}
                              placeholder="e.g. 2024"
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Publish Destination Shelf</label>
                            <select
                              value={storyForm.targetList}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, targetList: e.target.value as "home" | "archive" }))}
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                            >
                              <option value="home">Homepage Selected Works (First 3 slots)</option>
                              <option value="archive">Archives Collection Shelf</option>
                            </select>
                          </div>
                        </div>

                        {/* Image Option */}
                        <div className="space-y-2 p-3 bg-surface border border-outline-variant/10 rounded-none">
                          <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Story Frame Cover Image</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] text-outline/65 uppercase tracking-wider block">Option A: Local Image Upload (Compressed)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleStoryImageUpload}
                                className="text-xs w-full block bg-surface px-1 py-1"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] text-outline/65 uppercase tracking-wider block">Option B: Remote URL reference Link</span>
                              <input
                                type="text"
                                value={storyForm.image}
                                onChange={(e) => setStoryForm((prev) => ({ ...prev, image: e.target.value }))}
                                placeholder="Paste picture URL here..."
                                className="w-full bg-surface border border-outline-variant/30 px-3 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                              />
                            </div>
                          </div>
                          {storyUploadLoading && (
                            <p className="text-[10px] text-primary italic">Processing, compressing & caching photo securely...</p>
                          )}
                          {storyForm.image && (
                            <div className="mt-2 flex gap-3 items-center">
                              <img src={resolveImage(storyForm.image)} className="w-16 h-12 object-cover border border-outline-variant/20" alt="Preview cover" />
                              <span className="text-[10px] text-outline/60 truncate max-w-sm">Image Source Set!</span>
                            </div>
                          )}
                        </div>

                        {/* Video / Cinema Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-surface border border-outline-variant/10 rounded-none">
                          <div className="col-span-1 flex items-center gap-2 pt-4">
                            <input
                              type="checkbox"
                              id="storyIsVideo"
                              checked={storyForm.isVideo}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, isVideo: e.target.checked }))}
                              className="w-4 h-4 rounded border-outline-variant/30 text-primary"
                            />
                            <label htmlFor="storyIsVideo" className="text-[10px] uppercase font-sans font-bold text-outline select-none">
                              Is Cinematic Video?
                            </label>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[9px] text-on-surface-variant font-medium uppercase block">Cinema Stream Link / Video URL</label>
                            <input
                              type="text"
                              value={storyForm.image?.startsWith("http") && storyForm.isVideo ? storyForm.image : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setStoryForm((prev) => ({ ...prev, isVideo: true, image: val }));
                                }
                              }}
                              placeholder="YouTube Link or MP4 video URL..."
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Archives specifics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Archive Geography Land Type</label>
                            <select
                              value={storyForm.locationType}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, locationType: e.target.value as "India" | "Global" }))}
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                            >
                              <option value="India">India (Heritage/Seaside)</option>
                              <option value="Global">Global (Abroad/Tuscany/Phuket)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Archives Cine Medium Mode</label>
                            <select
                              value={storyForm.mediumType}
                              onChange={(e) => setStoryForm((prev) => ({ ...prev, mediumType: e.target.value as "CineFilm" | "Black & White" }))}
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none inline-block"
                            >
                              <option value="CineFilm">CineFilm & Colour</option>
                              <option value="Black & White">Black & White Fine-Art</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Description Editorial Paragraph</label>
                          <textarea
                            value={storyForm.description}
                            onChange={(e) => setStoryForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Type a 2-3 sentence editorial wedding log or backstory..."
                            className="w-full h-20 text-xs p-2 bg-surface text-primary border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="bg-primary hover:bg-tertiary transition-colors text-surface px-5 py-2 text-[10px] uppercase font-sans font-bold tracking-widest flex items-center gap-1.5 duration-300 shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Story Frame
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingStory(false)}
                            className="border border-outline-variant hover:bg-surface-container text-primary px-5 py-2 text-[10px] uppercase font-sans font-bold tracking-widest"
                          >
                            Discard
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* STORIES LIST MANAGER */
                      <div className="flex-1 overflow-y-auto space-y-6 pr-1 max-h-[460px]">
                        {/* Homepage Section list */}
                        <div className="space-y-3">
                          <span className="font-sans text-[10px] tracking-[0.2em] text-primary uppercase font-bold block border-b border-primary/20 pb-1">
                            Homepage Selected Works Section (Slots available: 3)
                          </span>
                          <div className="grid grid-cols-1 gap-3">
                            {homeStories.length === 0 ? (
                              <p className="font-serif text-xs italic text-outline py-2">No homepage stories uploaded.</p>
                            ) : (
                              homeStories.map((story, idx) => (
                                <div key={story.id} className="border border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container-low p-3.5 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <span className="font-sans text-xs text-outline font-semibold w-5">{idx + 1}.</span>
                                    <img src={resolveImage(story.image)} className="w-12 h-12 object-cover border border-outline-variant/10 flex-shrink-0" alt="Cover" />
                                    <div className="min-w-0">
                                      <h4 className="font-display font-bold text-primary truncate text-sm">{story.title}</h4>
                                      <p className="font-sans text-[11px] text-outline truncate">{story.location} ({story.year})</p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditStoryObj(story, "home")}
                                      className="flex items-center gap-1 text-[9px] text-outline hover:text-primary transition-colors border border-outline-variant/30 px-2 py-1 bg-surface uppercase font-sans font-semibold"
                                    >
                                      <Edit3 className="w-3 h-3" /> Edit Story
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteStoryFromList(story.id, "home")}
                                      className="text-outline-variant hover:text-red-600 transition-colors p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Archives Section list */}
                        <div className="space-y-3 pt-4">
                          <span className="font-sans text-[10px] tracking-[0.2em] text-primary uppercase font-bold block border-b border-primary/20 pb-1">
                            Archive Collection List
                          </span>
                          <div className="grid grid-cols-1 gap-3">
                            {archiveStories.length === 0 ? (
                              <p className="font-serif text-xs italic text-outline py-2">No archive stories uploaded.</p>
                            ) : (
                              archiveStories.map((story) => (
                                <div key={story.id} className="border border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container-low p-3.5 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <img src={resolveImage(story.image)} className="w-12 h-12 object-cover border border-outline-variant/10 flex-shrink-0" alt="Cover" />
                                    <div className="min-w-0">
                                      <h4 className="font-display font-semibold text-primary truncate text-sm">{story.title}</h4>
                                      <p className="font-sans text-[11px] text-outline truncate">{story.location} ({story.year}) | Type: <span className="text-secondary">{story.locationType}</span> Mode: <span className="text-tertiary">{story.mediumType}</span></p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditStoryObj(story, "archive")}
                                      className="flex items-center gap-1 text-[9px] text-outline hover:text-primary transition-colors border border-outline-variant/30 px-2 py-1 bg-surface uppercase font-sans font-semibold"
                                    >
                                      <Edit3 className="w-3 h-3" /> Edit Story
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteStoryFromList(story.id, "archive")}
                                      className="text-outline-variant hover:text-red-600 transition-colors p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: 3. INVESTMENT PACKAGES */}
                {activeTab === "packages" && (
                  <div className="flex flex-col flex-1 overflow-hidden" id="admin-packages-tab">
                    <p className="font-serif text-xs italic text-outline mb-4">
                      Customize dynamic investment rates, inclusions, descriptions, and ideal matches.
                    </p>

                    {editingPackageId ? (
                      /* PACKAGE EDITOR FORM */
                      <form onSubmit={savePackageChanges} className="space-y-4 bg-surface-container-low p-5 border border-outline-variant/20 overflow-y-auto max-h-[460px]">
                        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                          <h3 className="font-display text-sm text-primary uppercase font-bold">
                            Edit Investment Core Package: {packageForm.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setEditingPackageId(null)}
                            className="text-xs text-outline hover:text-primary font-sans uppercase font-semibold"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Package Name</label>
                            <input
                              type="text"
                              value={packageForm.name}
                              onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Value / Investment Estimate</label>
                            <input
                              type="text"
                              value={packageForm.investment}
                              onChange={(e) => setPackageForm((prev) => ({ ...prev, investment: e.target.value }))}
                              placeholder="e.g. starting from ₹4,50,000"
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Ideal Match Target Client</label>
                            <input
                              type="text"
                              value={packageForm.idealFor}
                              onChange={(e) => setPackageForm((prev) => ({ ...prev, idealFor: e.target.value }))}
                              placeholder="e.g. Heritage elite families hosting intimate multi-day rituals."
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Core Introduction Intro Text</label>
                            <input
                              type="text"
                              value={packageForm.intro}
                              onChange={(e) => setPackageForm((prev) => ({ ...prev, intro: e.target.value }))}
                              className="w-full bg-surface border border-outline-variant/30 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-outline font-semibold uppercase tracking-wider block">Includes Deliverables Line-by-Line (One per line)</label>
                          <textarea
                            value={packageIncludesText}
                            onChange={(e) => setPackageIncludesText(e.target.value)}
                            placeholder="e.g. Lead visual planning by Utkarsh&#10;Cinematic documentary movie&#10;Raw archives synced locally"
                            className="w-full h-24 text-xs p-2 bg-surface text-primary border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            className="bg-primary hover:bg-tertiary transition-colors text-surface px-5 py-2 text-[10px] uppercase font-sans font-bold tracking-widest flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Package Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPackageId(null)}
                            className="border border-outline-variant text-primary px-5 py-2 text-[10px] uppercase font-sans font-bold tracking-widest"
                          >
                            Discard
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* INVESTMENT PLANS LIST */
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[460px] pr-1">
                        {investmentPackages.map((pkg) => (
                          <div key={pkg.id} className="border border-outline-variant/20 bg-surface-container-low p-5 flex flex-col justify-between space-y-4">
                            <div>
                              <span className="font-mono text-[9px] text-outline uppercase">Commission Package</span>
                              <h4 className="font-display font-bold text-primary text-base border-b border-outline-variant/10 pb-1 mb-2 leading-none">{pkg.name}</h4>
                              <p className="font-sans text-[11px] text-outline italic leading-relaxed mb-3">"{pkg.intro}"</p>
                              <div className="space-y-1 text-[11px] text-outline-variant">
                                <p><strong>Ideal For:</strong> {pkg.idealFor}</p>
                                <p><strong>Value Estimate:</strong> <strong className="text-tertiary">{pkg.investment}</strong></p>
                                <p className="mt-2 font-semibold text-primary uppercase text-[8px] tracking-wider">Line Deliverables includes ({pkg.includes?.length || 0}):</p>
                                <ul className="list-disc list-inside text-[10px] text-outline pl-1 space-y-0.5">
                                  {(pkg.includes || []).map((inc: string, i: number) => (
                                    <li key={i} className="truncate">{inc}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => startEditingPackageObj(pkg)}
                              className="w-full flex items-center justify-center gap-1 py-1.5 bg-surface text-outline hover:text-primary transition-colors border border-outline-variant/30 text-[9px] uppercase font-sans font-bold tracking-wider"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit Package Text
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: 4. ARCHIVAL CINE-STRIPS */}
                {activeTab === "filmstrips" && (
                  <div className="flex flex-col flex-1 overflow-hidden" id="admin-cine-strips-tab">
                    <p className="font-serif text-xs italic text-outline mb-4">
                      Manage the 4 dynamic vertical photographic exposures displayed under the Archival Cine-Strips segment.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-y-auto max-h-[460px] pr-1">
                      {filmStripPhotos.map((photo, index) => (
                        <div key={photo.id} className="border border-outline-variant/20 bg-surface-container-low p-4 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <span className="font-sans text-[9px] text-outline uppercase font-bold block">Exposure Spot #{index + 1}</span>
                            <div className="aspect-[2/3] overflow-hidden border border-outline-variant/20 bg-surface">
                              <img src={resolveImage(editingStripId === photo.id && stripForm.src ? stripForm.src : photo.src)} className="w-full h-full object-cover" alt="Exposure thumbnail" />
                            </div>

                            {editingStripId === photo.id ? (
                              <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-outline uppercase font-semibold">Spot Label/Alt Text</label>
                                  <input
                                    type="text"
                                    value={stripForm.alt}
                                    onChange={(e) => setStripForm((prev) => ({ ...prev, alt: e.target.value }))}
                                    className="w-full bg-surface border border-outline-variant/20 px-2 py-1 text-xs text-primary focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[8px] text-outline uppercase font-semibold block">Change Frame Image</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleStripImageUpload}
                                    className="text-[10px] w-full"
                                  />
                                  <input
                                    type="text"
                                    value={stripForm.src}
                                    onChange={(e) => setStripForm((prev) => ({ ...prev, src: e.target.value }))}
                                    placeholder="Or paste remote URL..."
                                    className="w-full bg-surface border border-outline-variant/20 px-2 py-0.5 text-[10px] text-primary"
                                  />
                                </div>
                                <div className="flex gap-2.5 pt-2">
                                  <button
                                    onClick={() => saveStripChanges(photo.id)}
                                    className="bg-primary hover:bg-tertiary transition-colors text-surface text-[9px] px-2.5 py-1 uppercase font-sans font-semibold"
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={() => setEditingStripId(null)}
                                    className="border border-outline-variant text-primary text-[9px] px-2.5 py-1 uppercase font-sans font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-outline space-y-1">
                                <p><strong>Label:</strong> {photo.alt}</p>
                              </div>
                            )}
                          </div>

                          {editingStripId !== photo.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStripId(photo.id);
                                setStripForm({ alt: photo.alt, src: photo.src });
                              }}
                              className="w-full flex items-center justify-center gap-1 py-1 bg-surface text-outline hover:text-primary transition-colors border border-outline-variant/30 text-[9px] uppercase font-sans font-bold tracking-wider"
                            >
                              <Edit3 className="w-3 h-3" /> Change Strip Exposure
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: 5. HERO CANVAS CMS */}
                {activeTab === "hero" && (
                  <div className="flex flex-col flex-1 space-y-6 overflow-y-auto max-h-[480px] pr-1" id="admin-hero-tab">
                    <p className="font-serif text-xs italic text-outline">
                      Manage the visual title, poetic subtitle, and full-screen focal backdrop image of your homepage Hero experience.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-outline-variant/20 bg-surface-container-low p-6">
                      {/* Text details */}
                      <div className="space-y-4 text-left">
                        <h4 className="font-display text-sm tracking-wide text-primary font-bold uppercase">Aesthetic Copy</h4>
                        <div className="space-y-1">
                          <label className="text-[10px] text-outline uppercase font-semibold">Hero Title</label>
                          <input
                            type="text"
                            value={heroTitleVal}
                            onChange={(e) => setHeroTitleVal(e.target.value)}
                            className="w-full bg-surface border border-outline-variant/20 px-3 py-2 text-xs text-primary focus:border-primary focus:outline-none"
                            placeholder="Ivory Utkarsh Tales"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-outline uppercase font-semibold">Poetic Subtitle / Tagline</label>
                          <input
                            type="text"
                            value={heroTaglineVal}
                            onChange={(e) => setHeroTaglineVal(e.target.value)}
                            className="w-full bg-surface border border-outline-variant/20 px-3 py-2 text-xs text-primary focus:border-primary focus:outline-none"
                            placeholder="Poetic Wedding Storytelling • Pan India & Global"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="checkbox"
                            id="grayscale-hero"
                            checked={heroBgGrayscaleVal}
                            onChange={(e) => setHeroBgGrayscaleVal(e.target.checked)}
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor="grayscale-hero" className="text-xs text-on-surface-variant font-medium select-none cursor-pointer">
                            Apply Black & White Chiaroscuro Grayscale filter to background
                          </label>
                        </div>

                        <div className="pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              safeSetItem("ivory_hero_title", heroTitleVal);
                              safeSetItem("ivory_hero_tagline", heroTaglineVal);
                              safeSetItem("ivory_utkarsh_hero_bg_grayscale", String(heroBgGrayscaleVal));
                              if (setHeroTitle) setHeroTitle(heroTitleVal);
                              if (setHeroTagline) setHeroTagline(heroTaglineVal);
                              alert("Hero Copy & Filters have been successfully saved!");
                            }}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-surface hover:bg-tertiary transition-colors uppercase font-sans text-[10px] tracking-widest font-semibold cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Hero Settings
                          </button>
                        </div>
                      </div>

                      {/* Backdrop Canvas image */}
                      <div className="space-y-4 text-left">
                        <h4 className="font-display text-sm tracking-wide text-primary font-bold uppercase">Backdrop Focal Image</h4>
                        <div className="aspect-[16/9] overflow-hidden border border-outline-variant/20 bg-surface relative">
                          {heroBgVal && !heroBgVal.startsWith("solid") ? (
                            <img
                              src={resolveImage(heroBgVal)}
                              alt="Backdrop Preview"
                              className={`w-full h-full object-cover ${heroBgGrayscaleVal ? "filter grayscale contrast-[1.12]" : ""}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-outline font-mono">
                              SOLID NO IMAGE COLOR
                            </div>
                          )}
                          {heroUploadLoading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">
                              Optimizing...
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-outline uppercase font-semibold block">Change Frame Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setHeroUploadLoading(true);
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const base64 = reader.result as string;
                                const compressedOnDemand = await compressImage(base64, 1600, 0.78);
                                setHeroBgVal(compressedOnDemand);
                                safeSetItem("ivory_utkarsh_hero_bg", compressedOnDemand);
                                setHeroUploadLoading(false);
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="text-[10px] w-full cursor-pointer"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={heroBgVal.startsWith("data:") ? "" : heroBgVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setHeroBgVal(val);
                                  safeSetItem("ivory_utkarsh_hero_bg", val);
                                }
                              }}
                              placeholder="Or write fine-art remote URL..."
                              className="flex-1 bg-surface border border-outline-variant/20 px-2 py-1.5 text-xs text-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const defaultBg = "solid-1";
                                setHeroBgVal(defaultBg);
                                setHeroBgGrayscaleVal(true);
                                safeSetItem("ivory_utkarsh_hero_bg", defaultBg);
                                safeSetItem("ivory_utkarsh_hero_bg_grayscale", "true");
                              }}
                              className="border border-outline-variant px-3 py-1.5 text-[9px] uppercase tracking-wider text-primary font-semibold hover:bg-outline-variant/5 cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: 6. PORTFOLIO LIBRARY CMS */}
                {activeTab === "portfolio" && (
                  <div className="flex flex-col flex-1 space-y-6 overflow-y-auto max-h-[480px] pr-1" id="admin-portfolio-tab">
                    <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                      <div className="text-left">
                        <p className="font-serif text-xs italic text-outline">
                          Manage the high-fashion editorial imagery populated inside the Masonry Portfolio Grid tab.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAddingPortfolio(!isAddingPortfolio)}
                        className="flex items-center gap-1 bg-primary hover:bg-tertiary text-surface px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {isAddingPortfolio ? "Close Drawer" : "Upload Photograph"}
                      </button>
                    </div>

                    {isAddingPortfolio && (
                      <div className="border border-primary/20 bg-primary/5 p-4 space-y-4 text-left">
                        <h4 className="font-display text-[10px] tracking-[0.2em] font-semibold text-primary uppercase">
                          Upload Custom Fine-Art Photograph
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-outline uppercase font-bold">Local File Select</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setPortfolioUploadLoading(true);
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    const raw64 = reader.result as string;
                                    const compressed = await compressImage(raw64, 1200, 0.72);
                                    setPortfolioAddForm(prev => ({ ...prev, src: compressed }));
                                    setPortfolioUploadLoading(false);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="text-[10px] cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-outline uppercase font-bold">Or Clipboard Remote URL</label>
                              <input
                                type="text"
                                value={portfolioAddForm.src.startsWith("data:") ? "" : portfolioAddForm.src}
                                onChange={(e) => setPortfolioAddForm(prev => ({ ...prev, src: e.target.value }))}
                                placeholder="Paste image absolute link URL..."
                                className="w-full bg-surface border border-outline-variant/20 px-2 py-1 text-xs text-primary"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-outline uppercase font-bold">Image Description / Alt Text</label>
                              <input
                                type="text"
                                value={portfolioAddForm.alt}
                                onChange={(e) => setPortfolioAddForm(prev => ({ ...prev, alt: e.target.value }))}
                                placeholder="E.g., Candid bride laughing in Varanasi halls..."
                                className="w-full bg-surface border border-outline-variant/20 px-2 py-1 text-xs text-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-outline uppercase font-bold">Exhibition Category Tag</label>
                              <select
                                value={portfolioAddForm.category}
                                onChange={(e) => setPortfolioAddForm(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full bg-surface border border-outline-variant/20 px-2 py-1 text-xs text-primary"
                              >
                                <option value="Couture">Couture</option>
                                <option value="Editorial">Editorial</option>
                                <option value="Intimate">Intimate</option>
                                <option value="Ceremony">Ceremony</option>
                                <option value="Scenic">Scenic</option>
                                <option value="Landscape">Landscape</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {portfolioUploadLoading && (
                          <p className="text-[10px] text-outline font-mono animate-pulse">Running fine-art compression algorithms, please hold...</p>
                        )}

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              if (!portfolioAddForm.src) {
                                alert("Please select a file or input an image URL.");
                                return;
                              }
                              const updated = [
                                {
                                  id: "portfolio-" + Date.now(),
                                  src: portfolioAddForm.src,
                                  alt: portfolioAddForm.alt || "Elegant wedding photography",
                                  category: portfolioAddForm.category,
                                  dateAdded: Date.now()
                                },
                                ...portfolioImages
                              ];
                              setPortfolioImages(updated);
                              savePortfolioGridImages(updated);
                              setIsAddingPortfolio(false);
                              setPortfolioAddForm({ alt: "", src: "", category: "Editorial" });
                            }}
                            className="bg-primary hover:bg-tertiary text-surface text-[10px] tracking-widest px-4 py-2 font-semibold uppercase cursor-pointer"
                          >
                            Add To Exhibition
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[380px] overflow-y-auto">
                      {portfolioImages.length === 0 ? (
                        <div className="col-span-full text-center py-8 border border-dashed border-outline-variant/40">
                          <p className="text-xs text-outline font-serif italic">Your photogrid gallery is currently empty.</p>
                        </div>
                      ) : (
                        portfolioImages.map(img => (
                          <div key={img.id} className="border border-outline-variant/20 bg-surface-container-low p-2 space-y-2 flex flex-col justify-between">
                            <div className="text-left">
                              <div className="aspect-[3/4] overflow-hidden bg-black relative border border-outline-variant/10">
                                <img src={resolveImage(img.src)} alt={img.alt} className="w-full h-full object-cover" />
                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/55 text-white text-[8px] font-sans tracking-wider uppercase font-semibold">
                                  {img.category}
                                </span>
                              </div>

                              {editingPortfolioId === img.id ? (
                                <div className="space-y-2 pt-2">
                                  <input
                                    type="text"
                                    value={portfolioForm.alt}
                                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, alt: e.target.value }))}
                                    className="w-full bg-surface border border-outline-variant/20 px-1.5 py-0.5 text-[10px] text-primary"
                                    placeholder="Alt label..."
                                  />
                                  <select
                                    value={portfolioForm.category}
                                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-surface border border-outline-variant/20 px-1.5 py-0.5 text-[10px] text-primary"
                                  >
                                    <option value="Couture">Couture</option>
                                    <option value="Editorial">Editorial</option>
                                    <option value="Intimate">Intimate</option>
                                    <option value="Ceremony">Ceremony</option>
                                    <option value="Scenic">Scenic</option>
                                    <option value="Landscape">Landscape</option>
                                  </select>
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => {
                                        const updated = portfolioImages.map(m => {
                                          if (m.id === img.id) {
                                            return { ...m, alt: portfolioForm.alt, category: portfolioForm.category };
                                          }
                                          return m;
                                        });
                                        setPortfolioImages(updated);
                                        savePortfolioGridImages(updated);
                                        setEditingPortfolioId(null);
                                      }}
                                      className="bg-primary text-surface text-[9px] px-2 py-0.5 font-semibold uppercase cursor-pointer"
                                    >
                                      Ok
                                    </button>
                                    <button
                                      onClick={() => setEditingPortfolioId(null)}
                                      className="border border-outline text-primary text-[9px] px-2 py-0.5 font-semibold uppercase cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[9px] text-outline font-sans truncate mt-1"><strong>Label:</strong> {img.alt || "No description"}</p>
                              )}
                            </div>

                            {editingPortfolioId !== img.id && (
                              <div className="flex gap-1.5 pt-2 border-t border-outline-variant/10">
                                <button
                                  onClick={() => {
                                    setEditingPortfolioId(img.id);
                                    setPortfolioForm({ alt: img.alt, src: img.src, category: img.category });
                                  }}
                                  className="flex-1 py-1 bg-surface text-outline hover:text-primary transition-colors border border-outline-variant/20 text-[8px] uppercase tracking-wider font-semibold text-center cursor-pointer"
                                >
                                  Edit Info
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Permanently discard this photograph from the portfolio?")) {
                                      const updated = portfolioImages.filter(f => f.id !== img.id);
                                      setPortfolioImages(updated);
                                      savePortfolioGridImages(updated);
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-500/10 border border-outline-variant/10 transition-colors cursor-pointer"
                                  title="Discard image"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer console watermark */}
            <div className="mt-6 border-t border-outline-variant/20 pt-4 flex justify-between items-center text-[9px] text-outline/35 font-mono">
              <span>IVORY UTKARSH TALES CONTROL ROOM v1.5</span>
              <span>AUTHENTICATED CLINIC REGISTRY SERVICE</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
