import { useParams, Link } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Globe, Calendar, Camera, X, Upload, Car, Bus, Footprints, ExternalLink } from 'lucide-react';
import { places } from '../data/places';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from "sonner";
import { clsx } from 'clsx';

// Reusing the image mapping logic
const categoryImages: Record<string, string> = {
  "Beaches": "https://images.unsplash.com/photo-1650055679198-267afbe95248?auto=format&fit=crop&w=1200",
  "Hikes": "https://images.unsplash.com/photo-1643654573191-7b53c3672bf3?auto=format&fit=crop&w=1200",
  "Outdoors": "https://images.unsplash.com/photo-1643654573191-7b53c3672bf3?auto=format&fit=crop&w=1200",
  "Parks & Gardens": "https://images.unsplash.com/photo-1643654573191-7b53c3672bf3?auto=format&fit=crop&w=1200",
  "Art": "https://images.unsplash.com/photo-1641565487012-7a653144e932?auto=format&fit=crop&w=1200",
  "Museums": "https://images.unsplash.com/photo-1641565487012-7a653144e932?auto=format&fit=crop&w=1200",
  "History": "https://images.unsplash.com/photo-1641565487012-7a653144e932?auto=format&fit=crop&w=1200",
  "Live Music": "https://images.unsplash.com/photo-1568215425379-7a994872739d?auto=format&fit=crop&w=1200",
  "Theater & Comedy": "https://images.unsplash.com/photo-1568215425379-7a994872739d?auto=format&fit=crop&w=1200",
  "Coffee Shops": "https://images.unsplash.com/photo-1750658395656-d967c21833e5?auto=format&fit=crop&w=1200",
  "Food & Treats": "https://images.unsplash.com/photo-1768854592371-1042a977798a?auto=format&fit=crop&w=1200",
  "Shopping": "https://images.unsplash.com/photo-1551449440-f29f2e53104b?auto=format&fit=crop&w=1200",
  "Wineries": "https://images.unsplash.com/photo-1768854592371-1042a977798a?auto=format&fit=crop&w=1200",
  "Breweries": "https://images.unsplash.com/photo-1768854592371-1042a977798a?auto=format&fit=crop&w=1200",
  "Day Trips": "https://images.unsplash.com/photo-1551449440-f29f2e53104b?auto=format&fit=crop&w=1200",
};
const fallbackImage = "https://images.unsplash.com/photo-1551449440-f29f2e53104b?auto=format&fit=crop&w=1200";

export function EventDetails() {
  const { id } = useParams();
  const place = places.find((p) => p.id === id);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSlots, setBookingSlots] = useState<Array<{ id: string; start_at: string; end_at: string }>>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [includeGroupAvailability, setIncludeGroupAvailability] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isBookingOpen) return;
    loadBookingOptions();
  }, [isBookingOpen, includeGroupAvailability]);

  if (!place) {
    return <div className="p-10 text-center text-foreground">Place not found</div>;
  }

  const imageUrl = categoryImages[place.category] || fallbackImage;
  const encodedAddress = encodeURIComponent(place.address || place.location);

  const handleBooking = async () => {
    setIsProcessing(true);

    try {
      const selectedSlot = bookingSlots.find((slot) => slot.id === selectedSlotId);
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('slo_session_token') || ''
        },
        body: JSON.stringify({
          item_id: `event-${place.id}`,
          notes: bookingNotes,
          include_group_availability: includeGroupAvailability,
          slot_start_at: selectedSlot?.start_at || bookingDate || new Date().toISOString(),
          slot_end_at: selectedSlot?.end_at || new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      });
      
      if (!res.ok) throw new Error('Booking failed');
      
      toast.success("Booking confirmed!");
      setIsBookingOpen(false);
    } catch (e) {
      toast.error("Failed to book. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const loadBookingOptions = async () => {
    try {
      const res = await fetch('/api/booking/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('slo_session_token') || ''
        },
        body: JSON.stringify({
          item_id: `event-${place.id}`,
          include_group_availability: includeGroupAvailability
        })
      });
      const data = await res.json();
      const slots = Array.isArray(data?.suggested_slots) ? data.suggested_slots : [];
      setBookingSlots(slots);
      setSelectedSlotId(slots[0]?.id || '');
    } catch {
      setBookingSlots([]);
      setSelectedSlotId('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6c4f77a7/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      // Use the signed URL
      setUploadedPhoto(data.url); 
      toast.success("Photo uploaded! Check out your selfie.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white pb-20 overflow-x-hidden">
      {/* Hero Image */}
      <div className="relative h-[50vh] w-full">
        <img src={imageUrl} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f07] via-[#0a0f07]/20 to-transparent" />
        
        <Link to="/explore" className="absolute top-6 left-6 bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/70 transition-colors z-10 border border-white/30">
          <ArrowLeft size={24} />
        </Link>

        <div className="absolute bottom-0 left-0 w-full p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <span className="inline-block px-3 py-1 bg-[#8BC34A]/20 text-[#8BC34A] text-xs font-bold uppercase tracking-wider rounded-md mb-3">
              {place.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                {place.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                {place.city}
              </div>
              {place.website && (
                <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#8BC34A] hover:underline">
                  <Globe size={16} />
                  Visit Website
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-8 space-y-12">
        {/* Info & Tags */}
        <section className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {place.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-white/8 border border-white/10 rounded-full text-xs text-white/50 font-bold">
                #{tag}
              </span>
            ))}
          </div>
          
          <p className="text-lg text-white/70 leading-relaxed font-medium">
            {place.notes || "Experience the best of San Luis Obispo at this location. Perfect for a day out or a quick adventure."}
            <br />
            {place.address && <span className="block mt-2 text-sm text-white/40 font-mono">{place.address}</span>}
          </p>
          
          {/* Transportation Features */}
          <div className="flex flex-wrap gap-4 py-4 border-t border-white/10 border-b">
             {place.features.map(feature => {
                let Icon = Car;
                if (feature.includes("bus")) Icon = Bus;
                if (feature.includes("walk")) Icon = Footprints;
                
                return (
                   <div key={feature} className="flex items-center gap-2 text-white/50 font-bold text-sm bg-white/8 px-3 py-2 rounded-lg border border-white/10">
                      <Icon size={16} />
                      <span className="capitalize">{feature}</span>
                   </div>
                );
             })}
          </div>
          
          {/* Ride Sharing Links */}
          <div className="grid grid-cols-2 gap-4">
             <a 
                href={`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors"
             >
                <Car size={18} /> Ride with Uber
             </a>
             <a 
                href={`https://lyft.com/ride?id=lyft&destination[address]=${encodedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-[#FF00BF] text-white rounded-xl font-bold hover:bg-[#FF00BF]/90 transition-colors"
             >
                <Car size={18} /> Ride with Lyft
             </a>
          </div>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full py-4 bg-[#8BC34A] text-[#233216] font-bold rounded-xl shadow-md hover:bg-[#9CCC65] transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Calendar size={20} />
            Book This Spot
          </button>
        </section>

        {/* See Yourself Here Feature */}
        <section className="border-t border-white/10 pt-10">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-white">
            <Camera className="text-[#8BC34A]" />
            See Yourself Here
          </h2>
          <p className="text-white/50 mb-6 text-sm">
            Upload a photo of yourself to visualize your visit. (Server-powered feature)
          </p>

          <div className="bg-white/8 rounded-2xl overflow-hidden border border-white/10 relative min-h-[300px] flex flex-col md:flex-row">
            {/* Background Location */}
            <div className="flex-1 relative h-[300px] md:h-auto">
              <img src={imageUrl} className="w-full h-full object-cover opacity-60" alt="Location background" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-black/50 text-white px-3 py-1 rounded text-xs backdrop-blur-sm">Location</span>
              </div>
            </div>

            {/* User Photo Overlay */}
            <div className="flex-1 relative h-[300px] md:h-auto bg-black/40 flex items-center justify-center border-l border-white/10">
              {uploadedPhoto ? (
                <div className="relative w-full h-full">
                  <img src={uploadedPhoto} className="w-full h-full object-cover" alt="You" />
                  <button 
                    onClick={() => setUploadedPhoto(null)}
                    className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-full text-white hover:bg-red-600 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/15">
                    <Upload className="text-[#8BC34A]" />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-2 bg-[#8BC34A] hover:bg-[#9CCC65] text-[#233216] rounded-lg font-bold transition-colors disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload Your Photo"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
            
            {/* Overlay Effect (Mocked for visual) */}
            {uploadedPhoto && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-[1px] px-6 py-2 rounded-full border border-white/20 text-white font-bold text-sm shadow-xl z-20 pointer-events-none">
                 PolyJarvis Vision
               </div>
            )}
          </div>
        </section>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsBookingOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-[#0a0f07]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Confirm Booking</h3>
                <button onClick={() => setIsBookingOpen(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8BC34A]/40 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1 uppercase tracking-wider">Suggested Time Slot</label>
                  <select
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8BC34A]/40"
                  >
                    <option value="">Use selected date</option>
                    {bookingSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {new Date(slot.start_at).toLocaleString()} - {new Date(slot.end_at).toLocaleTimeString()}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={includeGroupAvailability}
                    onChange={(e) => setIncludeGroupAvailability(e.target.checked)}
                  />
                  Use group (jam) availability
                </label>

                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1 uppercase tracking-wider">Reservation Notes</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any dietary, seating, or accessibility notes"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8BC34A]/40"
                  />
                </div>

                <div className="bg-white/5 p-4 rounded-xl space-y-2 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Item</span>
                    <span className="text-white font-bold">Reservation Ticket</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Service Fee</span>
                    <span className="text-white font-bold">$0.00</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={isProcessing}
                  className="w-full py-4 bg-black text-white font-medium rounded-xl border border-white/10 flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <span className="font-bold tracking-tight">Book now</span>
                      <span className="flex items-center gap-0.5 font-bold">
                        with availability
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
