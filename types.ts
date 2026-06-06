export interface Story {
  id: string;
  title: string;
  location: string;
  year: string;
  image: string;
  photogAlt: string;
  tagline?: string;
  description?: string;
  isVideo?: boolean;
  locationType?: "India" | "Global";
  mediumType?: "CineFilm" | "Black & White";
}

export interface Package {
  id: string;
  name: string;
  investment: string;
  intro: string;
  includes: string[];
  idealFor: string;
}

export interface InquiryFormData {
  id?: string;
  fullName: string;
  partnerName: string;
  email: string;
  phone: string;
  date: string;
  location: string;
  details: string;
  referrer: string;
  status?: "Pending" | "Contacted" | "Booked" | "Archived";
  notes?: string;
  selectedPackage?: string;
  estimatedBudget?: string;
  dateCreated?: string;
}

export interface Album {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  year: string;
  coverImage: string;
  description: string;
  photos: string[];
}

export interface VideoAlbum {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  year: string;
  coverImage: string;
  description: string;
  videos: string[]; // Storage for video stream items
}

