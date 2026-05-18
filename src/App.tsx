import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Compass, 
  ChevronRight, 
  Sparkles,
  MessageCircle,
  Menu,
  X,
  LogIn,
  LogOut,
  Send,
  User as UserIcon
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";

type TouristSpot = {
  id: string;
  name: string;
  description: string;
  category: "Beach" | "Nature" | "Culture" | "Adventure";
  image: string;
  coords: { lat: number; lng: number };
};

const INITIAL_SPOTS: TouristSpot[] = [
  {
    id: "mabua",
    name: "Mabua Pebble Beach",
    description: "A unique shoreline composed entirely of smooth, multi-sized pebbles instead of sand, offering a therapeutic foot massage and stunning sunsets.",
    category: "Beach",
    image: "https://picsum.photos/seed/mabua/800/600",
    coords: { lat: 9.8055, lng: 125.4418 }
  },
  {
    id: "dayasan",
    name: "Day-asan Floating Village",
    description: "Known as the 'Little Venice of Surigao', this village features houses on stilts over clear waters surrounded by lush mangroves.",
    category: "Culture",
    image: "https://picsum.photos/seed/dayasan/800/600",
    coords: { lat: 9.7911, lng: 125.5322 }
  },
  {
    id: "basul",
    name: "Basul Island",
    description: "A pristine white-sand bar island just a short boat ride from the city, perfect for snorkeling and swimming in crystal-clear waters.",
    category: "Beach",
    image: "https://picsum.photos/seed/basul/800/600",
    coords: { lat: 9.8167, lng: 125.4833 }
  }
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [spots, setSpots] = useState<TouristSpot[]>(INITIAL_SPOTS);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Fetch spots from Firestore
  useEffect(() => {
    const fetchSpots = async () => {
      const path = "spots";
      try {
        const q = query(collection(db, path), orderBy("name"));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const spotsData = snapshot.docs.map(doc => doc.data() as TouristSpot);
          setSpots(spotsData);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('permission')) {
          console.warn("Firestore permissions not set. Using local spot data.");
        } else {
          try {
            handleFirestoreError(err, OperationType.GET, path);
          } catch (jsonErr) {
            console.error("Firestore Permission Error:", jsonErr);
          }
        }
      }
    };
    fetchSpots();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed. You may need to add this domain to Authorized Domains in Firebase Console.", err);
      alert("Login failed. This domain might not be authorized yet in your Firebase Console.");
    }
  };

  const logout = () => signOut(auth);

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !feedback.trim()) return;

    setIsSubmittingFeedback(true);
    const path = "feedback";
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        userName: user.displayName,
        text: feedback,
        createdAt: serverTimestamp(),
      });
      setFeedback("");
      alert("Thank you for your feedback!");
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, path);
      } catch (jsonErr) {
        alert("Failed to submit feedback. Ensure Firestore rules are set to allow feedback submissions.");
        console.error("Feedback submission failed:", jsonErr);
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const filteredSpots = selectedCategory === "All" 
    ? spots 
    : spots.filter(s => s.category === selectedCategory);

  const askGemini = async () => {
    if (!chatInput.trim()) return;
    setIsChatLoading(true);
    setChatResponse("");
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: chatInput }),
      });
      const data = await res.json();
      setChatResponse(data.text);
    } catch (err) {
      setChatResponse("Sorry, I couldn't get a recommendation right now.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-serif text-[#333]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#e5e5d1] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Compass className="text-[#5A5A40] w-6 h-6" />
          <span className="text-xl font-bold tracking-tight uppercase">Surigao Explorer</span>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center text-sm uppercase tracking-widest font-sans font-medium">
          <a href="#discover" className="hover:text-[#5A5A40] transition-colors">Discover</a>
          <a href="#spots" className="hover:text-[#5A5A40] transition-colors">Destinations</a>
          <a href="#guide" className="hover:text-[#5A5A40] transition-colors">Virtual Guide</a>
          
          {user ? (
            <div className="flex items-center gap-4 border-l pl-8 border-[#e5e5d1]">
              <div className="flex items-center gap-2">
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-[#5A5A40]" referrerPolicy="no-referrer" />
                <span className="text-[10px] text-gray-500 font-sans">{user.displayName}</span>
              </div>
              <button onClick={logout} className="hover:text-[#5A5A40] transition-colors"><LogOut size={18} /></button>
            </div>
          ) : (
            <button onClick={login} className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-2 rounded-full hover:bg-[#4a4a34] transition-all ml-4 text-[10px] uppercase font-sans font-bold tracking-widest">
              <LogIn size={16} /> Sign In
            </button>
          )}
        </div>

        <button 
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-40 bg-white pt-24 px-8 flex flex-col gap-6 text-2xl font-serif"
          >
            <a href="#discover" onClick={() => setIsMenuOpen(false)}>Discover</a>
            <a href="#spots" onClick={() => setIsMenuOpen(false)}>Destinations</a>
            <a href="#guide" onClick={() => setIsMenuOpen(false)}>Virtual Guide</a>
            <hr className="border-[#e5e5d1]" />
            {user ? (
              <button onClick={logout} className="flex items-center gap-4 text-left text-red-600">
                <LogOut /> Sign Out
              </button>
            ) : (
              <button onClick={login} className="flex items-center gap-4 text-left text-[#5A5A40]">
                <LogIn /> Sign In
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="discover" className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-7xl md:text-8xl leading-[0.9] font-medium mb-6">
              The City of <br />
              <span className="italic text-[#5A5A40]">Island Adventures</span>
            </h1>
            <p className="text-xl text-[#666] max-w-md mb-8 font-sans font-light leading-relaxed">
              Explore the untouched beauty of Surigao City. From pebble beaches to floating villages, your tropical escape awaits.
            </p>
            <div className="flex gap-4">
              <a href="#spots" className="bg-[#5A5A40] text-white px-8 py-4 rounded-full text-sm uppercase tracking-widest hover:bg-[#4a4a34] transition-all flex items-center gap-2 shadow-xl">
                Explore Now <ChevronRight size={16} />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
              <img 
                src="https://picsum.photos/seed/surigao_hero_final/800/1000" 
                alt="Surigao Coastal View" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4 max-w-xs">
              <div className="bg-[#f0f0e6] p-3 rounded-full">
                <MapPin className="text-[#5A5A40]" />
              </div>
              <p className="text-sm font-sans italic">"The Gateway to Mindanao Islands"</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section id="spots" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#999] mb-4 flex items-center gap-2 shadow-sm inline-block px-4 py-1 rounded-full bg-[#f9f9f5]">
                <Sparkles size={14} className="text-[#5A5A40]" /> CURATED LIST
              </p>
              <h2 className="text-6xl font-medium tracking-tight">Must-Visit Spots</h2>
            </div>
            
            <div className="flex flex-wrap gap-2 font-sans">
              {["All", "Beach", "Nature", "Culture", "Adventure"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-8 py-2 rounded-full border transition-all text-[10px] uppercase tracking-widest font-bold ${
                    selectedCategory === cat 
                    ? "bg-[#5A5A40] text-white border-[#5A5A40]" 
                    : "border-[#e5e5d1] text-[#666] hover:border-[#5A5A40]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filteredSpots.map((spot, index) => (
              <motion.div
                layout
                key={spot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/3] rounded-[2rem] overflow-hidden mb-8 relative shadow-lg">
                  <img 
                    src={spot.image} 
                    alt={spot.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-4 py-1 rounded-full text-[9px] uppercase font-sans font-black tracking-[0.2em] shadow-sm">
                    {spot.category}
                  </div>
                </div>
                <h3 className="text-3xl font-semibold mb-3 group-hover:text-[#5A5A40] transition-colors">{spot.name}</h3>
                <p className="text-[#666] font-sans text-sm leading-relaxed mb-6 italic">{spot.description}</p>
                <div className="inline-flex items-center gap-2 text-[#5A5A40] text-[10px] uppercase tracking-[0.3em] font-black border-b border-[#5A5A40] pb-1 transition-all group-hover:gap-4">
                  View On Map <ChevronRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Guide Section */}
      <section id="guide" className="py-32 bg-[#0a0a0a] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#5A5A40] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#5A5A40] opacity-20 blur-[120px] rounded-full" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex p-5 rounded-full bg-white/5 border border-white/10 mb-10">
            <MessageCircle className="text-[#5A5A40] w-8 h-8" />
          </div>
          <h2 className="text-6xl md:text-7xl font-medium mb-8">Travel <span className="italic text-[#5A5A40]">Smarter</span> with AI</h2>
          <p className="text-gray-400 font-sans text-lg max-w-lg mx-auto mb-16 font-light leading-relaxed">
            Get personalized recommendations from our local expert AI. Ask about transport, food, or hidden island spots.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Where can I find the best seafood?"
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-sm font-sans focus:outline-none focus:border-[#5A5A40] transition-all placeholder:text-gray-600"
                onKeyDown={(e) => e.key === 'Enter' && askGemini()}
              />
              <button 
                onClick={askGemini}
                disabled={isChatLoading}
                className="bg-[#5A5A40] hover:bg-[#4a4a34] text-white px-10 py-5 rounded-2xl text-[10px] uppercase tracking-widest font-black font-sans transition-all disabled:opacity-50 shadow-lg active:scale-95"
              >
                {isChatLoading ? "CONSULTING..." : "ASK GUIDE"}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {chatResponse && (
                <motion.div 
                  key="response"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-left p-8 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#5A5A40]" />
                  <div className="flex items-center gap-3 mb-6 text-[#5A5A40]">
                    <Sparkles size={18} />
                    <span className="text-[10px] uppercase font-black tracking-[0.3em]">Surigao Virtual Guide</span>
                  </div>
                  <div className="font-sans text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-light">
                    {chatResponse}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!chatResponse && (
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                {["Best pebble beach time?", "Day-asan boat fees?", "Sagisi Island access?"].map((q) => (
                  <button 
                    key={q}
                    onClick={() => setChatInput(q)}
                    className="text-[9px] uppercase tracking-[0.2em] border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-gray-400 font-bold hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-32 bg-[#f5f5f0]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-16">
            <h2 className="text-5xl font-medium mb-4">Share your Experience</h2>
            <p className="text-[#666] font-sans">We'd love to hear about your visit to Surigao City.</p>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-[#e5e5d1]">
            {user ? (
              <form onSubmit={submitFeedback} className="flex flex-col gap-6">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us about your trip..."
                  className="w-full h-40 bg-[#f9f9f5] border border-[#e5e5d1] rounded-2xl p-6 text-sm font-sans focus:outline-none focus:border-[#5A5A40] transition-all resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="bg-[#5A5A40] text-white px-8 py-4 rounded-xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-bold hover:bg-[#4a4a34] transition-all disabled:opacity-50"
                >
                  <Send size={16} /> {isSubmittingFeedback ? "Sending..." : "Submit Feedback"}
                </button>
              </form>
            ) : (
              <div className="py-12 border-2 border-dashed border-[#e5e5d1] rounded-[2rem] flex flex-col items-center gap-6">
                <UserIcon className="text-[#ccc] w-12 h-12" />
                <p className="text-[#666] font-sans text-sm">Please sign in to leave feedback.</p>
                <button onClick={login} className="bg-[#5A5A40] text-white px-10 py-4 rounded-full text-xs uppercase tracking-widest font-black flex items-center gap-2 hover:scale-105 transition-all">
                  <LogIn size={18} /> Sign In with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-[#e5e5d1] bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-16">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <Compass className="text-[#5A5A40] w-8 h-8" />
              <span className="text-2xl font-bold uppercase tracking-tighter">Surigao Explorer</span>
            </div>
            <p className="text-[#666] font-sans text-sm max-w-sm mb-8 leading-relaxed italic">
              Empowering travelers to discover the hidden gems of the City of Island Adventures through modern technology and local insight.
            </p>
            <p className="text-[10px] text-[#999] uppercase tracking-[0.3em] font-sans font-bold">© 2026 SURIGAO TOURISM BOARD</p>
          </div>

          <div className="flex flex-col gap-6 font-sans">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#999] font-black">Explore</span>
            <a href="#discover" className="text-sm hover:text-[#5A5A40] transition-colors">Home</a>
            <a href="#spots" className="text-sm hover:text-[#5A5A40] transition-colors">Destinations</a>
            <a href="#guide" className="text-sm hover:text-[#5A5A40] transition-colors">AI Concierge</a>
          </div>

          <div className="flex flex-col gap-6 font-sans">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#999] font-black">Connect</span>
            <a href="#" className="text-sm hover:text-[#5A5A40] transition-colors">Facebook</a>
            <a href="#" className="text-sm hover:text-[#5A5A40] transition-colors">Instagram</a>
            <a href="#" className="text-sm hover:text-[#5A5A40] transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
