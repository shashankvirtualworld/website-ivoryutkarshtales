import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Award, Compass } from "lucide-react";
import { InquiryFormData } from "../types";
import { safeGetItem, safeSetItem } from "../utils/storage";

interface InquiryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPackage?: string;
  preselectedPrice?: string;
}

export default function InquiryDrawer({
  isOpen,
  onClose,
  preselectedPackage = "",
  preselectedPrice = "",
}: InquiryDrawerProps) {
  const [formData, setFormData] = useState<InquiryFormData>({
    fullName: "",
    partnerName: "",
    email: "",
    phone: "",
    date: "",
    location: "",
    details: "",
    referrer: "",
    selectedPackage: "",
    estimatedBudget: "",
    status: "Pending",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        selectedPackage: preselectedPackage || prev.selectedPackage || "Standard Commission Portfolio",
        estimatedBudget: preselectedPrice || prev.estimatedBudget || "Consult Pending",
      }));
    }
  }, [isOpen, preselectedPackage, preselectedPrice]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate luxury API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Persist in local storage for beautiful touch
      const existingInquiries = JSON.parse(safeGetItem("tales_inquiries") || "[]");
      existingInquiries.push({
        ...formData,
        id: Date.now().toString(),
        status: "Pending",
        dateCreated: new Date().toISOString(),
      });
      safeSetItem("tales_inquiries", JSON.stringify(existingInquiries));
    }, 1800);
  };

  const handleReset = () => {
    setFormData({
      fullName: "",
      partnerName: "",
      email: "",
      phone: "",
      date: "",
      location: "",
      details: "",
      referrer: "",
      selectedPackage: "",
      estimatedBudget: "",
      status: "Pending",
    });
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/20 backdrop-blur-md z-50 transition-opacity"
            id="inquiry-backdrop"
          />

          {/* Drawer container from right */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-surface shadow-2xl z-50 overflow-y-auto px-6 md:px-12 py-10 flex flex-col justify-between"
            id="inquiry-drawer-panel"
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-6 mb-10">
                <div>
                  <span className="font-sans text-xs tracking-[0.4em] text-outline uppercase block mb-1">
                    START THE CONVERSATION
                  </span>
                  <h2 className="font-display text-3xl text-primary italic">Inquire Availability</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                  aria-label="Close"
                  id="btn-close-inquiry"
                >
                  <X className="w-5 h-5 text-primary" />
                </button>
              </div>

              {/* Form Content / Success Panel */}
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-8" id="inquiry-form">
                  {formData.selectedPackage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-4 rounded-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-tertiary" />
                        <div>
                          <p className="font-sans text-[8px] uppercase tracking-widest text-outline">SELECTED REGISTRY VOLUME</p>
                          <p className="font-display text-sm text-primary italic font-semibold">{formData.selectedPackage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-sans text-[8px] uppercase tracking-widest text-outline">ESTIMATE</p>
                        <p className="font-sans text-xs text-tertiary font-bold">{formData.estimatedBudget}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Full Name */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="Utkarsh Abhijit"
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3"
                      />
                    </div>

                    {/* Partner Name */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Partner's Full Name
                      </label>
                      <input
                        type="text"
                        name="partnerName"
                        value={formData.partnerName}
                        onChange={handleChange}
                        placeholder="Ananya Roy"
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Email */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="utkarsh@domain.com"
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3"
                      />
                    </div>

                    {/* Phone */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Event Date */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Celebration Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface pt-3"
                      />
                    </div>

                    {/* Location */}
                    <div className="relative group">
                      <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                        Event Location *
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        placeholder="Lake Como or Udaipur Palace"
                        className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3"
                      />
                    </div>
                  </div>

                  {/* Referrer */}
                  <div className="relative group">
                    <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                      How did you discover us?
                    </label>
                    <select
                      name="referrer"
                      value={formData.referrer}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface pt-3 appearance-none rounded-none cursor-pointer"
                    >
                      <option value="" className="text-secondary bg-surface">Select Referral</option>
                      <option value="instagram" className="text-secondary bg-surface">Instagram (@ivoryutkarshtales)</option>
                      <option value="vimeo" className="text-secondary bg-surface">Vimeo / Cinema Portfolios</option>
                      <option value="referral" className="text-secondary bg-surface">Recommended by Friend/Planner</option>
                      <option value="hotc" className="text-secondary bg-surface">House on the Clouds References</option>
                      <option value="other" className="text-secondary bg-surface">Search Engine or Editorial Blogs</option>
                    </select>
                    <span className="absolute right-0 bottom-3 pointer-events-none text-xs text-outline">▼</span>
                  </div>

                  {/* Narrative details */}
                  <div className="relative group">
                    <label className="absolute -top-4 left-0 font-sans text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-all">
                      Tell us your story & styling choices
                    </label>
                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Share your visual mood board, fashion designers, venue specifics, and expectations for the wedding documentarians..."
                      className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:outline-none transition-colors font-sans text-sm text-on-surface placeholder:text-outline-variant/50 pt-3 resize-none"
                    />
                  </div>

                  {/* Note */}
                  <p className="text-[11px] text-outline/80 leading-relaxed italic">
                    By submitting, you align with our quiet editorial focus. We restrict ourselves to 12 legacy commissions annually to preserve undivided artistry and bespoke color grading.
                  </p>

                  {/* Submitting Buttons */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-primary text-surface font-sans text-xs font-semibold tracking-[0.25em] hover:bg-tertiary disabled:bg-primary-container transition-colors duration-500 rounded-none flex items-center justify-center gap-2 uppercase"
                      id="btn-submit-inquiry"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin"></div>
                          Verifying Slot Availability...
                        </>
                      ) : (
                        "REQUEST AVAILABILITY"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center space-y-6"
                  id="success-panel"
                >
                  <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-2xl italic text-primary">The Chapter Commences</h3>
                  <div className="space-y-3 font-sans text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                    <p>
                      Thank you for inviting us to witness your story. We have recorded your interest in our registry for{" "}
                      <span className="font-semibold text-primary">{formData.date || "your date"}</span> in{" "}
                      <span className="font-semibold text-primary">{formData.location}</span>.
                    </p>
                    <p className="text-xs text-outline mt-2">
                      Utkarsh Abhijit and our chief style director will reach out to schedule an intimate Zoom consult within the next 24 hours.
                    </p>
                  </div>
                  <div className="pt-6">
                    <button
                      onClick={handleReset}
                      className="px-8 py-3 bg-primary text-surface font-sans text-xs tracking-widest hover:bg-tertiary transition-colors"
                      id="btn-close-thanks"
                    >
                      CLOSE PORTRAIT
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom Brand */}
            <div className="text-center font-display text-sm tracking-[0.4em] text-outline/30 select-none uppercase pt-6">
              IVORY UTKARSH TALES
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
