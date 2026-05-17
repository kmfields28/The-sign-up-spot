import { useState, useCallback, useEffect } from "react";

const T = {
  bg:"#ffffff",
  bgCard:"#ffffff",
  bgDeep:"#f8f8f8",
  bgInput:"#f5f5f5",
  border:"#e8e8e8",
  borderMid:"#d0d0d0",
  text:"#1a1a1a",
  textMid:"#444444",
  textSoft:"#666666",
  textMuted:"#999999",
  accent:"#2563eb",
  accentAlt:"#3b82f6",
  accentSoft:"#93c5fd",
  accentBg:"#eff6ff",
  highlight:"#1d4ed8",
  gold:"#d97706",
  goldBg:"#fef3c7",
  shadow:"rgba(0,0,0,0.06)",
};







const CATEGORIES = [
  { label:"Sports",     icon:"⚽", color:"#dc2626", bg:"#fef2f2" },
  { label:"Arts",       icon:"🎨", color:"#ea580c", bg:"#fff7ed" },
  { label:"Music",      icon:"🎵", color:"#7c3aed", bg:"#f5f3ff" },
  { label:"Dance",      icon:"🩰", color:"#db2777", bg:"#fdf2f8" },
  { label:"STEM",       icon:"🔬", color:"#0891b2", bg:"#ecfeff" },
  { label:"Outdoors",   icon:"🌲", color:"#16a34a", bg:"#f0fdf4" },
  { label:"Theater",    icon:"🎭", color:"#9333ea", bg:"#faf5ff" },
  { label:"Tutoring",   icon:"📚", color:"#2563eb", bg:"#eff6ff" },
  { label:"Mommy & Me", icon:"🤱", color:"#e11d48", bg:"#fff1f2" },
  { label:"Summer Camps", icon:"⛺", color:"#d97706", bg:"#fffbeb" },
  { label:"Daycare & Preschool", icon:"🏫", color:"#0891b2", bg:"#ecfeff" },
];


function getCatMeta(label) {
  return CATEGORIES.find(c => c.label === label) || { icon:"🎯", color:T.accent, bg:T.accentBg };
}

// ── Claude-powered search via Anthropic API ──────────────────────────────────

const GOOGLE_API_KEY = "AIzaSyDBNrlLOqcrWw3pYXDJQxCNSO3tifBXR68";

const CATEGORY_KEYWORDS = {
  "Sports":     ["youth sports","kids soccer","youth gymnastics","swim lessons kids","martial arts kids","youth baseball","kids tennis"],
  "Arts":       ["art class kids","art studio children","pottery class kids","painting class children"],
  "Music":      ["music school","music lessons kids","piano lessons children","guitar lessons kids"],
  "Dance":      ["dance studio kids","ballet school children","dance class kids"],
  "STEM":       ["stem camp kids","robotics for kids","coding class children","science camp kids"],
  "Outdoors":   ["summer camp kids","outdoor camp","nature camp children","adventure camp kids"],
  "Theater":    ["theater camp kids","drama class children","acting class kids","musical theater kids"],
  "Tutoring":   ["tutoring center","learning center kids","academic enrichment"],
  "Mommy & Me": ["mommy and me class","parent toddler class","baby music class","toddler playgroup","parent child class","baby gym","toddler yoga","infant class"],
  "Summer Camps": ["kids summer camp","youth summer camp","children summer program","summer day camp kids","academic summer camp","sports camp kids","arts summer camp children","stem summer camp kids"],
  "Daycare & Preschool": ["daycare center","preschool","early childhood education","childcare center","nursery school","pre-k program","toddler program","infant daycare"],
};

async function geocodeZip(zip) {
  const res = await fetch("/api/places?endpoint=geocode&address=" + encodeURIComponent(zip + " USA"));
  const data = await res.json();
  if (data.status === "OK" && data.results && data.results[0]) {
    return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng };
  }
  throw new Error("ZIP code not found: " + data.status + ". Please try another ZIP.");
}

async function getPlaceDetails(placeId) {
  try {
    const res = await fetch("/api/places?endpoint=place/details&place_id=" + placeId + "&fields=website,formatted_phone_number,url");
    const data = await res.json();
    return data.result || {};
  } catch(e) { return {}; }
}

async function searchNearby(location, keyword, radius) {
  const res = await fetch("/api/places?endpoint=place/nearbysearch&location=" + location.lat + "," + location.lng + "&radius=" + Math.min(radius * 1609, 50000) + "&keyword=" + encodeURIComponent(keyword));
  const data = await res.json();
  return data.results || [];
}

function placeToActivity(place, category) {
  const price = (place.price_level !== undefined && place.price_level !== null) ? { 0:"Free", 1:"$", 2:"$$", 3:"$$$", 4:"$$$$" }[place.price_level] : null;
  const typeLabels = { "gym":"Fitness & gym facility", "school":"Educational program", "health":"Health & wellness", "park":"Outdoor & nature" };
  const placeType = (place.types || []).find(t => typeLabels[t]);
  const description = placeType ? typeLabels[placeType] + " offering " + category.toLowerCase() + " programs." : category + " program for kids and families.";
  return {
    id: place.place_id,
    placeId: place.place_id,
    name: place.name,
    category: category,
    address: place.vicinity || "",
    phone: "",
    website: "",
    rating: place.rating || 0,
    reviewCount: place.user_ratings_total || 0,
    price: price,
    description: description,
    hours: "",
    ageRange: "",
    tags: [category.toLowerCase()],
    activityType: "recreational",
    photo: place.photos && place.photos[0] ? "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=" + place.photos[0].photo_reference + "&key=" + GOOGLE_API_KEY : null,
    bookingUrl: "/api/go?placeId=" + place.place_id + "&name=" + encodeURIComponent(place.name) + "&dest=" + encodeURIComponent(place.website || "https://www.google.com/maps/place/?q=place_id:" + place.place_id),
    _types: place.types || [],
  };
}

async function searchActivitiesWithClaude(zip, radiusMiles, category, keyword) {
  const location = await geocodeZip(zip);
  let searchPairs = [];
  if (keyword && keyword.trim()) {
    const searchTerm = keyword.trim().toLowerCase();
    const hasContext = ["kids","children","youth","camp","class","lesson","school","program","academy"].some(w => searchTerm.includes(w));
    const kw = hasContext ? searchTerm : searchTerm + " kids";
    const cats = category ? [category] : Object.keys(CATEGORY_KEYWORDS);
    searchPairs = cats.map(c => ({ kw, cat: c }));
  } else {
    const cats = category ? [category] : Object.keys(CATEGORY_KEYWORDS);
    searchPairs = cats.flatMap(c => (CATEGORY_KEYWORDS[c] || []).slice(0, 2).map(kw => ({ kw, cat: c })));
  }
  const unique = searchPairs.slice(0, 8);

  const allResults = await Promise.all(
    unique.map(async ({ kw, cat }) => {
      const places = await searchNearby(location, kw, radiusMiles);
      return places.map(p => placeToActivity(p, cat));
    })
  );

  // Filter out irrelevant business types
  const EXCLUDED_TYPES = ["restaurant","food","bar","cafe","lodging","gas_station","grocery_or_supermarket","supermarket","store","pharmacy","hospital","bank","atm","car_dealer","car_repair","beauty_salon","hair_care","spa","laundry","moving_company","storage"];

  const seen = new Set();
  const deduped = allResults.flat().filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    if (p._types && p._types.some(t => EXCLUDED_TYPES.includes(t))) return false;
    return true;
  });
  deduped.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (deduped.length === 0) throw new Error("No activities found near " + zip + ". Try a larger radius.");

  const withDetails = await Promise.all(deduped.map(async p => {
    const details = await getPlaceDetails(p.placeId);
    const website = details.website || "";
    const phone = details.formatted_phone_number || "";
    return {
      ...p,
      website,
      phone,
      googleReviews: details.reviews || [],
      bookingUrl: "/api/go?placeId=" + p.placeId + "&name=" + encodeURIComponent(p.name) + "&dest=" + encodeURIComponent(website || "https://www.google.com/maps/place/?q=place_id:" + p.placeId),
    };
  }));
  return withDetails;
}





// ── Shared UI ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://owehkzrhtwyjgccjpptq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWhrenJodHd5amdjY2pwcHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODMwNjgsImV4cCI6MjA5MzY1OTA2OH0.OAOwSAReUlaG7MOkGvx0bhRO0EjNfRzmkEkuINuZinU";

async function sbGet(path) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
  });
  if (!res.ok) throw new Error("Database error " + res.status);
  return res.json();
}

async function sbPost(path, body) { // eslint-disable-line no-unused-vars
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Database error " + res.status);
  return res.status === 204 ? null : res.json();
}

const SPORT_SUBCATEGORIES = {
  "Sports": ["All Sports","Baseball","Basketball","Cheerleading","Football","Gymnastics","Golf","Hockey","Lacrosse","Martial Arts","Soccer","Softball","Swimming","Tennis","Track & Field","Volleyball","Wrestling","Other"],
  "Dance": ["All Dance","Ballet","Contemporary","Hip Hop","Jazz","Tap","Ballroom","Competitive","Other"],
  "Summer Camps": ["All Camps","Academic","Arts","Outdoor/Nature","Sports","STEM","Theater","Multi-Sport","Other"],
};

function Stars({ rating, size }) {
  return (
    <span style={{ fontSize: size === "lg" ? "1.2rem" : "0.88rem", letterSpacing: "1px" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating || 0) ? T.gold : T.border }}>★</span>
      ))}
    </span>
  );
}

function PriceBadge({ price }) {
  return (
    <span style={{ background:T.bgDeep, color:T.textMid, fontSize:"0.68rem", fontWeight:700, padding:"2px 8px", borderRadius:"99px", border:"1px solid "+T.borderMid, fontFamily:"Georgia,serif", letterSpacing:"1px" }}>{price}</span>
  );
}

function Spinner({ message }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4rem 1rem", gap:"1rem" }}>
      <div style={{ width:"42px", height:"42px", border:"3px solid "+T.border, borderTop:"3px solid "+T.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <p style={{ color:T.textSoft, fontSize:"0.87rem", textAlign:"center" }}>{message || "Searching…"}</p>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function ErrorBox({ message, onDismiss }) {
  return (
    <div style={{ background:"#fdf5f3", border:"1px solid "+T.accentSoft, borderRadius:"12px", padding:"1rem 1.25rem", marginBottom:"1rem", display:"flex", gap:"0.75rem" }}>
      <span style={{ fontSize:"1.2rem", flexShrink:0 }}>⚠️</span>
      <div style={{ flex:1 }}>
        <div style={{ color:T.textMid, fontWeight:700, fontSize:"0.85rem", marginBottom:"0.2rem" }}>
          Search Error
        </div>
        <div style={{ color:T.textSoft, fontSize:"0.82rem", lineHeight:1.6 }}>{message}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:"1rem" }}>✕</button>
      )}
    </div>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ place, favorites, onToggleFav, onClose, user, onOpenAuth }) {
  const cat = getCatMeta(place.category);
  const isFav = favorites.has(place.id);
  const [reviews, setReviews] = useState([]);
    const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const reviewsLoading = false;

  function handleSubmitReview() {
    if (!reviewAuthor.trim() || !reviewRating || !reviewText.trim()) return;
    setReviewSubmitting(true);
    setReviews(prev => [{ author: reviewAuthor, rating: reviewRating, text: reviewText, created_at: new Date().toISOString() }, ...prev]);
    setReviewDone(true);
    setReviewSubmitting(false);
  }
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(80,40,10,0.50)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(6px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"22px", maxWidth:"560px", width:"100%", maxHeight:"90vh", overflowY:"auto", position:"relative", boxShadow:"0 28px 56px "+T.shadow }}>

        {/* Header */}
        <div style={{ background:cat.bg, padding:"2rem 1.5rem 1.25rem", borderRadius:"22px 22px 0 0", textAlign:"center" }}>

          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.3rem", marginTop:"0.5rem", lineHeight:1.2 }}>{place.name}</h2>
          <span style={{ background:cat.color+"22", color:cat.color, fontSize:"0.68rem", fontWeight:700, padding:"2px 10px", borderRadius:"99px", border:"1px solid "+cat.color+"44" }}>{place.category}</span>
        </div>

        <button onClick={onClose} style={{ position:"absolute", top:"0.9rem", right:"0.9rem", background:T.bgCard, border:"1px solid "+T.border, color:T.textSoft, width:"32px", height:"32px", borderRadius:"50%", cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

        <div style={{ padding:"1.5rem" }}>
          {/* Rating */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1rem", flexWrap:"wrap" }}>
            <Stars rating={place.rating} size="lg"/>
            <span style={{ color:T.gold, fontWeight:700 }}>
              {place.rating ? place.rating.toFixed(1) : "—"}
            </span>
            <span style={{ color:T.textMuted, fontSize:"0.8rem" }}>
              ({(place.reviewCount || 0).toLocaleString()} reviews)
            </span>
            {place.price && <PriceBadge price={place.price}/>}
            {place.ageRange && (
              <span style={{ background:T.bgDeep, color:T.textSoft, fontSize:"0.72rem", padding:"2px 8px", borderRadius:"99px", border:"1px solid "+T.border }}>
                Ages {place.ageRange}
              </span>
            )}
          </div>


          {/* Details */}
          <div style={{ background:T.bgDeep, borderRadius:"12px", padding:"1rem", marginBottom:"1rem", border:"1px solid "+T.border, display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            {place.address && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <span>📍</span>
                <span style={{ color:T.textSoft, fontSize:"0.83rem" }}>{place.address}</span>
              </div>
            )}
            {place.phone && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <span>📞</span>
                <a href={"tel:"+place.phone} style={{ color:T.accent, fontSize:"0.83rem" }}>
                  {place.phone}
                </a>
              </div>
            )}
            {place.hours && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <span>🕐</span>
                <span style={{ color:T.textSoft, fontSize:"0.83rem" }}>{place.hours}</span>
              </div>
            )}
            {place.website && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <a href={place.website} target="_blank" rel="noreferrer"
                  style={{ color:T.accent, fontSize:"0.83rem", wordBreak:"break-all" }}>
                  {place.website.replace(/^https?:\/\//,"").split("/")[0]}
                </a>
              </div>
            )}
          </div>

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", marginBottom:"1.25rem" }}>
              {place.tags.map(t => (
                <span key={t} style={{ background:cat.bg, color:cat.color, fontSize:"0.68rem", fontWeight:600, padding:"2px 8px", borderRadius:"99px", border:"1px solid "+cat.color+"33" }}>{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.5rem" }}>
            <button onClick={() => onToggleFav(place.id, place)}
              style={{ background: isFav ? T.goldBg : T.bgDeep, border:"1px solid "+(isFav ? T.gold : T.border), color: isFav ? T.gold : T.textSoft, borderRadius:"99px", padding:"0.65rem 1rem", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {isFav ? "Saved" : "Save"}
            </button>
            {place.website ? (
              <a href={place.website} target="_blank" rel="noreferrer"
                style={{ flex:1, background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", borderRadius:"99px", padding:"0.65rem 1rem", fontSize:"0.85rem", textDecoration:"none", fontWeight:700, textAlign:"center", display:"block" }}>
                Visit Website →
              </a>
            ) : (
              <a href={"https://www.google.com/search?q="+encodeURIComponent(place.name+" "+place.address)}
                target="_blank" rel="noreferrer"
                style={{ flex:1,                   color:"#2e1a08", borderRadius:"99px", padding:"0.65rem 1rem", fontSize:"0.85rem", textDecoration:"none", fontWeight:800, textAlign:"center", display:"block", background:"#f8f8f8"}}>
                Search on Google →
              </a>
            )}
          </div>

          {/* Reviews */}
          <div style={{ borderTop:"1px solid "+T.border, paddingTop:"1.25rem" }}>

            <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1rem", marginBottom:"0.85rem" }}>Reviews</h3>

            {/* Google Reviews */}
            {place.googleReviews && place.googleReviews.length > 0 && (
              <div style={{ marginBottom:"1rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.65rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  <span style={{ color:T.textMuted, fontSize:"0.72rem", fontWeight:600 }}>Google Reviews</span>
                </div>
                {place.googleReviews.slice(0,3).map((r, i) => (
                  <div key={i} style={{ background:T.bgDeep, borderRadius:"12px", padding:"0.9rem", marginBottom:"0.6rem", border:"1px solid "+T.border }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.3rem" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                        {r.profile_photo_url && <img src={r.profile_photo_url} alt={r.author_name} style={{ width:"24px", height:"24px", borderRadius:"50%", objectFit:"cover" }}/>}
                        <span style={{ color:T.text, fontWeight:700, fontSize:"0.83rem" }}>{r.author_name}</span>
                      </div>
                      <span style={{ color:T.textMuted, fontSize:"0.72rem" }}>{r.relative_time_description}</span>
                    </div>
                    <Stars rating={r.rating}/>
                    <p style={{ color:T.textSoft, fontSize:"0.8rem", marginTop:"0.35rem", lineHeight:1.6 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}


            {reviewsLoading && <p style={{ color:T.textMuted, fontSize:"0.82rem" }}>Loading reviews…</p>}

            {!reviewsLoading && reviews.length === 0 && !reviewDone && (
              <p style={{ color:T.textMuted, fontSize:"0.82rem", marginBottom:"1rem" }}>No reviews yet — be the first!</p>
            )}

            {reviews.map((r, i) => (
              <div key={i} style={{ background:T.bgDeep, borderRadius:"12px", padding:"0.9rem", marginBottom:"0.6rem", border:"1px solid "+T.border }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.3rem" }}>
                  <span style={{ color:T.accent, fontWeight:700, fontSize:"0.83rem" }}>{r.author}</span>
                  <span style={{ color:T.textMuted, fontSize:"0.72rem" }}>
                    {new Date(r.created_at).toLocaleDateString("en-US", { month:"short", year:"numeric" })}
                  </span>
                </div>
                <Stars rating={r.rating}/>
                <p style={{ color:T.textSoft, fontSize:"0.8rem", marginTop:"0.35rem", lineHeight:1.6 }}>{r.text}</p>
              </div>
            ))}

            {/* Write a review */}
            {!reviewDone ? (
              <div style={{ background:T.bgDeep, borderRadius:"14px", padding:"1rem", border:"1px solid "+T.border, marginTop:"0.75rem" }}>
                <div style={{ color:T.textMid, fontWeight:700, fontSize:"0.82rem", marginBottom:"0.75rem" }}>Write a Review</div>
                {!user && (
                  <div style={{ textAlign:"center", padding:"1rem 0" }}>
                    <p style={{ color:T.textSoft, fontSize:"0.83rem", marginBottom:"0.85rem" }}>Sign in to leave a review — so other parents know it is from a real family.</p>
                    <button onClick={onOpenAuth} style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.55rem 1.25rem", fontSize:"0.83rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Sign In to Review</button>
                  </div>
                )}
                {user && (<>
                <input value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)}
                  placeholder="Your name"
                  style={{ width:"100%", background:T.bgInput, border:"1px solid "+T.border, borderRadius:"8px", padding:"0.55rem 0.8rem", fontSize:"0.83rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit", marginBottom:"0.6rem", display:"block" }}/>
                <div style={{ marginBottom:"0.6rem" }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i}
                      onMouseEnter={() => setReviewHover(i)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(i)}
                      style={{ fontSize:"1.5rem", cursor:"pointer", color: i <= (reviewHover || reviewRating) ? T.gold : T.border, transition:"color 0.1s" }}>★</span>
                  ))}
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience…" rows={3}
                  style={{ width:"100%", background:T.bgInput, border:"1px solid "+T.border, borderRadius:"8px", padding:"0.55rem 0.8rem", fontSize:"0.83rem", color:T.text, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", marginBottom:"0.75rem", display:"block" }}/>
                <button onClick={handleSubmitReview}
                  disabled={!reviewAuthor.trim() || !reviewRating || !reviewText.trim() || reviewSubmitting}
                  style={{ background: reviewAuthor.trim() && reviewRating && reviewText.trim() ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : T.bgDeep, color: reviewAuthor.trim() && reviewRating && reviewText.trim() ? "#fff" : T.textMuted, border:"none", borderRadius:"99px", padding:"0.55rem 1.25rem", fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {reviewSubmitting ? "Submitting…" : "Submit Review"}
                </button>
            </>)}
            </div>
            ) : (
              <div style={{ background:T.accentBg, borderRadius:"12px", padding:"1rem", textAlign:"center", border:"1px solid "+T.accentSoft }}>
                <div style={{ fontSize:"1.75rem", marginBottom:"0.3rem" }}>🎉</div>
                <p style={{ color:T.accent, fontWeight:700, fontSize:"0.88rem" }}>Thank you for your review!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ place, favorites, onToggleFav, onSelect, kids, activeKidId, kidSaves, onToggleKidFav, onAddToCalendar }) {
  const cat = getCatMeta(place.category);
  const isFav = favorites.has(place.id);
  return (
    <div onClick={() => onSelect(place)}
      style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"18px", overflow:"hidden", transition:"transform 0.2s,box-shadow 0.2s", position:"relative", boxShadow:"0 2px 12px "+T.shadow, cursor:"pointer" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 18px 36px "+T.shadow; }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px "+T.shadow; }}>

      {/* Color header band */}
      <div style={{ width:"100%", height:"160px", background:cat.bg, overflow:"hidden", position:"relative" }}>
        {place.photo ? (
          <img src={place.photo} alt={place.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.style.display="none"; e.target.parentNode.style.background=cat.bg; }}/>
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:cat.color, fontSize:"0.8rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px" }}>{place.category}</span>
          </div>
        )}
      </div>

      {/* Per-kid save dropdown */}
      <div style={{ position:"absolute", top:"0.55rem", right:"0.55rem", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.25rem" }}>
        <button onClick={e => { e.stopPropagation(); onToggleFav(place.id, place); }}
          style={{ background: isFav ? T.goldBg : T.bgCard+"dd", border:"1px solid "+(isFav ? T.gold : T.border), color: isFav ? T.gold : T.borderMid, borderRadius:"50%", width:"28px", height:"28px", cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          {isFav ? "♥" : "♡"}
        </button>
        {kids && kids.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.2rem" }}>
            {kids.map(kid => {
              const kidMap = kidSaves && kidSaves[kid.id] ? kidSaves[kid.id] : new Map();
              const kidHas = kidMap.has(place.id);
              return (
                <button key={kid.id} onClick={e => { e.stopPropagation(); onToggleKidFav && onToggleKidFav(kid.id, place.id, place); }}
                  title={"Save for "+kid.name}
                  style={{ background: kidHas ? kid.color+"22" : T.bgCard+"cc", border:"1px solid "+(kidHas?kid.color:T.border), borderRadius:"99px", padding:"1px 6px", cursor:"pointer", fontSize:"0.6rem", fontWeight:700, color: kidHas?kid.color:T.textMuted, backdropFilter:"blur(4px)", whiteSpace:"nowrap" }}>
                  {kidHas?"✓ ":""}{kid.name.charAt(0)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding:"1rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"0.5rem", marginBottom:"0.25rem" }}>
          <div style={{ fontFamily:"'Fraunces',serif", color:T.text, fontWeight:700, fontSize:"0.92rem", lineHeight:1.25 }}>{place.name}</div>
          {place.price && <PriceBadge price={place.price}/>}
        </div>

        <div style={{ color:cat.color, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"0.4rem" }}>
          {place.category}{place.ageRange ? " · Ages "+place.ageRange : ""}
        </div>

        {place.address && (
          <div style={{ color:T.textSoft, fontSize:"0.74rem", marginBottom:"0.5rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            📍 {place.address}
          </div>
        )}


        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
            <Stars rating={place.rating}/>
            <span style={{ color:T.gold, fontWeight:700, fontSize:"0.8rem" }}>
              {place.rating ? place.rating.toFixed(1) : "—"}
            </span>
            <span style={{ color:T.textMuted, fontSize:"0.7rem" }}>
              ({(place.reviewCount||0).toLocaleString()})
            </span>
          </div>
          <span style={{ color:T.accent, fontSize:"0.75rem", fontWeight:600 }}>Details →</span>
              {place.website && (
                <a href={place.bookingUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", borderRadius:"99px", padding:"0.25rem 0.7rem", fontSize:"0.7rem", textDecoration:"none", fontWeight:700 }}>Book →</a>
              )}
              <button onClick={e => { e.stopPropagation(); onAddToCalendar && onAddToCalendar(place); }} style={{ background:"#f0fdf4", color:"#16a34a", border:"1px solid #86efac", borderRadius:"99px", padding:"0.25rem 0.6rem", fontSize:"0.7rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}></button>
        </div>
      </div>
    </div>
  );
}

// ── Newsletter ────────────────────────────────────────────────────────────────
function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <div style={{ background:"#f8f8f8", padding:"2.25rem 1.5rem", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 20% 50%, rgba(255,255,255,0.18) 0%, transparent 55%)", pointerEvents:"none" }}/>
      <div style={{ position:"relative", maxWidth:"480px", margin:"0 auto" }}>
        <div style={{ fontSize:"1.6rem", marginBottom:"0.5rem" }}>📬</div>
        <h3 style={{ fontFamily:"'Fraunces',serif", color:"#2e1a08", fontSize:"1.4rem", marginBottom:"0.4rem" }}>
          Stay in the Loop
        </h3>
        <p style={{ color:T.textSoft, fontSize:"0.87rem", marginBottom:"1.25rem", lineHeight:1.65 }}>
          New activity listings, seasonal camp guides, and local family events — no spam, ever.
        </p>
        {!done ? (
          <div style={{ display:"flex", gap:"0.5rem", maxWidth:"480px", margin:"0 auto", flexWrap:"wrap", justifyContent:"center" }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              style={{ flex:"1 1 200px", background:"rgba(255,255,255,0.75)", border:"1.5px solid "+T.borderMid, borderRadius:"99px", padding:"0.65rem 1.1rem", fontSize:"0.87rem", color:T.text, fontFamily:"inherit" }}
            />
            <button
              onClick={() => email.includes("@") && setDone(true)}
              style={{ background:T.highlight, color:"#fff", border:"none", borderRadius:"99px", padding:"0.65rem 1.4rem", fontSize:"0.87rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Subscribe →
            </button>
          </div>
        ) : (
          <div style={{ background:"rgba(255,255,255,0.75)", borderRadius:"12px", padding:"0.9rem 1.5rem", display:"inline-block" }}>
            <span style={{ color:T.text, fontWeight:700 }}>🎉 You're in! Check your inbox.</span>
          </div>
        )}
        <p style={{ color:T.textMuted, fontSize:"0.72rem", marginTop:"0.8rem" }}>
          Join 12,000+ local parents · Unsubscribe anytime
        </p>
      </div>
    </div>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose, onSignIn }) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [pass, setPass] = useState(""); const [done, setDone] = useState(false);
  const [nl, setNl] = useState(true);
  const inp = { width:"100%", background:T.bgInput, border:"1.5px solid "+T.border,
    borderRadius:"10px", padding:"0.68rem 0.95rem", fontSize:"0.88rem", color:T.text,
    boxSizing:"border-box", fontFamily:"inherit", marginBottom:"0.85rem", display:"block" };
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(80,40,10,0.45)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(6px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.bgCard, borderRadius:"24px", padding:"2.25rem", maxWidth:"420px", width:"100%", boxShadow:"0 32px 64px "+T.shadow, border:"1px solid "+T.border, position:"relative", maxHeight:"92vh", overflowY:"auto" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"1.1rem", right:"1.1rem", background:T.bgDeep, border:"1px solid "+T.border, color:T.textSoft, width:"30px", height:"30px", borderRadius:"50%", cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ fontFamily:"'Fraunces',serif", color:T.accent, fontSize:"1.4rem", fontWeight:900, marginBottom:"0.2rem" }}>The Sign Up Spot</div>
          <div style={{ color:T.textMuted, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"1.5px" }}>
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
          </div>
        </div>
        {mode !== "forgot" && (
          <div style={{ display:"flex", background:T.bgDeep, borderRadius:"10px", padding:"3px", marginBottom:"1.5rem", gap:"3px" }}>
            {["signin","signup"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex:1, background:mode===m?T.bgCard:"transparent", border:"none", borderRadius:"8px", padding:"0.5rem", fontSize:"0.82rem", fontWeight:mode===m?700:500, color:mode===m?T.accent:T.textSoft, cursor:"pointer", fontFamily:"inherit", boxShadow:mode===m?"0 2px 6px "+T.shadow:"none" }}>
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}
        {mode === "forgot" && !done && (
          <div>
            <p style={{ color:T.textSoft, fontSize:"0.83rem", lineHeight:1.65, marginBottom:"1.25rem" }}>
              Enter your email and we will send a reset link.
            </p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" style={inp}/>
            <button onClick={() => setDone(true)}
              style={{ width:"100%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.72rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Send Reset Link
            </button>
            <button onClick={() => setMode("signin")}
              style={{ width:"100%", background:"none", border:"none", color:T.textSoft, fontSize:"0.8rem", cursor:"pointer", marginTop:"0.75rem", fontFamily:"inherit" }}>
              Back to Sign In
            </button>
          </div>
        )}
        {mode === "forgot" && done && (
          <div style={{ textAlign:"center", padding:"1rem 0" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>📧</div>
            <p style={{ color:T.text, fontWeight:700, marginBottom:"0.3rem", fontFamily:"'Fraunces',serif" }}>Check your inbox!</p>
            <p style={{ color:T.textSoft, fontSize:"0.83rem", marginBottom:"1.5rem" }}>Reset link sent to {email}.</p>
            <button onClick={() => { setMode("signin"); setDone(false); }}
              style={{ background:"#f8f8f8", color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.6rem 1.4rem", fontSize:"0.85rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
              Back to Sign In
            </button>
          </div>
        )}
        {(mode === "signin" || mode === "signup") && (
          <div>
            {mode === "signup" && (
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Full Name" style={inp}/>
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" style={inp}/>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder={mode === "signup" ? "Create a password" : "Password"} style={inp}/>
            {mode === "signin" && (
              <div style={{ textAlign:"right", marginTop:"-0.5rem", marginBottom:"1.1rem" }}>
                <button onClick={() => setMode("forgot")}
                  style={{ background:"none", border:"none", color:T.accent, fontSize:"0.78rem", cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" }}>
                  Forgot password?
                </button>
              </div>
            )}
            {mode === "signup" && (
              <label style={{ display:"flex", alignItems:"flex-start", gap:"0.6rem", marginBottom:"1.1rem", cursor:"pointer" }}>
                <input type="checkbox" checked={nl} onChange={e => setNl(e.target.checked)}
                  style={{ marginTop:"2px", width:"15px", height:"15px" }}/>
                <span style={{ color:T.textSoft, fontSize:"0.78rem", lineHeight:1.55 }}>
                  Subscribe to our newsletter
                </span>
              </label>
            )}
            <button onClick={() => { onSignIn(name || email.split("@")[0]); onClose(); }}
              style={{ width:"100%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.75rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:"1.25rem" }}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
              <div style={{ flex:1, height:"1px", background:T.border }}/>
              <span style={{ color:T.textMuted, fontSize:"0.72rem" }}>or continue with</span>
              <div style={{ flex:1, height:"1px", background:T.border }}/>
            </div>
            {["Google","Apple"].map(label => (
              <button key={label}
                style={{ width:"100%", background:T.bgDeep, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.65rem", fontSize:"0.85rem", color:T.textMid, fontFamily:"inherit", fontWeight:600, cursor:"pointer", marginBottom:"0.5rem", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                {label === "Google" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{marginRight:"0.5rem",flexShrink:0}}><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{marginRight:"0.5rem",flexShrink:0}} fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                )}
                Continue with {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Browse Page ───────────────────────────────────────────────────────────────
function BrowsePage({ initialCategory, favorites, onToggleFav, kids, activeKidId, kidSaves, onToggleKidFav, user, onOpenAuth, onAddToCalendarPrompt }) {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState(initialCategory || "");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [sortBy, setSortBy] = useState("rating");
  const [subCategory, setSubCategory] = useState("All Sports");

  const doSearch = useCallback(async () => {
    const z = zip.trim();
    if (z.length < 5) { setError("Please enter a valid 5-digit ZIP code."); return; }
    setError(""); setLoading(true); setHasSearched(true); setResults([]);
    try {
      setLoadingMsg("Searching for activities near " + z + "…");
      const subCat = subCategory && !subCategory.startsWith("All") ? subCategory : "";
      const searchKeyword = subCat || search.trim();
      const data = await searchActivitiesWithClaude(z, radius, category, searchKeyword);
      // Add unique IDs if missing
      const normalized = data.map((p, i) => ({ ...p, id: p.id || (p.name + i).replace(/\s/g,"_") }));
      setResults(normalized);
      if (normalized.length === 0) setError("No activities found near " + z + ". Try a larger radius.");
    } catch(e) {
      setError(e.message || "Search failed. Please try again.");
    }
    setLoading(false); setLoadingMsg("");
  }, [zip, radius, category, search, subCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (hasSearched && zip.length === 5) doSearch(); }, [subCategory, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const selBtn = active => ({
    background: active ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : "transparent",
    color: active ? "#fff" : T.textSoft,
    border: "1px solid "+(active ? "transparent" : T.border),
    borderRadius:"99px", padding:"0.3rem 0.9rem", fontSize:"0.75rem",
    fontWeight:600, cursor:"pointer", fontFamily:"inherit",
  });

  const sortedResults = results.slice().sort((a,b) => {
    if(sortBy==="rating") return (b.rating||0)-(a.rating||0);
    if(sortBy==="az") return a.name < b.name ? -1 : 1;
    if(sortBy==="za") return a.name > b.name ? -1 : 1;
    return 0;
  });

  return (
    <div>
      {/* Search bar */}
      <div style={{ background:T.bgDeep, padding:"1rem 1.5rem", borderBottom:"1px solid "+T.border, position:"sticky", top:"56px", zIndex:50 }}>
        <div style={{ display:"flex", gap:"0.5rem", maxWidth:"900px", margin:"0 auto", flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:"0 1 140px" }}>
            <span style={{ position:"absolute", left:"0.9rem", top:"50%", transform:"translateY(-50%)" }}>📍</span>
            <input value={zip} onChange={e => setZip(e.target.value.replace(/\D/g,"").slice(0,5))}
              placeholder="ZIP code" onKeyDown={e => e.key === "Enter" && doSearch()}
              style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"99px", padding:"0.62rem 1rem 0.62rem 2.4rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}/>
          </div>
          <select value={radius} onChange={e => setRadius(Number(e.target.value))}
            style={{ background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.62rem 0.75rem", fontSize:"0.82rem", color:T.textMid, cursor:"pointer", fontFamily:"inherit" }}>
            {[5,10,15,25,50].map(r => <option key={r} value={r}>{r} mi</option>)}
          </select>
          <div style={{ position:"relative", flex:"2 1 200px" }}>
            <span style={{ position:"absolute", left:"0.9rem", top:"50%", transform:"translateY(-50%)" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Optional keyword…" onKeyDown={e => e.key === "Enter" && doSearch()}
              style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"99px", padding:"0.62rem 1rem 0.62rem 2.4rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}/>
          </div>
          <button onClick={doSearch}
            style={{               color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.62rem 1.6rem", fontSize:"0.87rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", boxShadow:"0 3px 14px "+T.shadow, background:"#f8f8f8"}}>
            Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:T.bg, padding:"0.75rem 1.5rem", borderBottom:"1px solid "+T.border, display:"flex", gap:"0.35rem", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
          <button onClick={() => setCategory("")} style={selBtn(!category)}>All</button>
          {CATEGORIES.map(c => (
            <button key={c.label} onClick={() => setCategory(c.label)} style={selBtn(category === c.label)}>
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", background:T.bgDeep, border:"1px solid "+T.border, borderRadius:"8px", overflow:"hidden" }}>
          {[{m:"grid",i:"⊞"},{m:"list",i:"☰"}].map(({m,i}) => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ background:viewMode===m?T.bgCard:"transparent", border:"none", color:viewMode===m?T.accent:T.textMuted, padding:"0.3rem 0.65rem", cursor:"pointer", fontFamily:"inherit", fontSize:"0.9rem" }}>{i}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"1.25rem 1.5rem", background:T.bg, minHeight:"60vh" }}>
        {error && <ErrorBox message={error} onDismiss={() => setError("")}/>}

        {!hasSearched && !loading && (
          <div style={{ textAlign:"center", padding:"5rem 1rem" }}>
            <div style={{ fontSize:"3.5rem", marginBottom:"1rem" }}>🔍</div>
            <p style={{ color:T.textMid, fontWeight:600, fontFamily:"'Fraunces',serif", fontSize:"1.15rem", marginBottom:"0.5rem" }}>
              Enter a ZIP code to find activities near you
            </p>
            <p style={{ color:T.textMuted, fontSize:"0.85rem" }}>
              Powered by AI — searches real local businesses
            </p>
          </div>
        )}

        {loading && <Spinner message={loadingMsg}/>}

        {!loading && results.length > 0 && (
          <div>
            <div style={{ marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
              <span style={{ color:T.textSoft, fontSize:"0.83rem" }}>
                <span style={{ color:T.accent, fontWeight:700 }}>{results.length}</span> activities found near {zip}
              </span>
              {SPORT_SUBCATEGORIES[category] && (
              <select value={subCategory} onChange={e => { setSubCategory(e.target.value); }} style={{ background:"#fff", border:"1.5px solid "+T.accent, borderRadius:"8px", padding:"0.35rem 0.75rem", fontSize:"0.78rem", color:T.accent, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                {SPORT_SUBCATEGORIES[category].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background:"#fff", border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.35rem 0.75rem", fontSize:"0.78rem", color:T.textMid, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                <option value="rating">Highest Rated</option>
                <option value="az">A to Z</option>
                <option value="za">Z to A</option>
              </select>
            </div>
            {viewMode === "list" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                {sortedResults.map(p => {
                  const cat = getCatMeta(p.category); // eslint-disable-line no-unused-vars
                  return (
                    <div key={p.id} onClick={() => setSelectedPlace(p)}
                      style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"12px", padding:"0.9rem 1.1rem", display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap", cursor:"pointer", boxShadow:"0 2px 8px "+T.shadow }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>

                      <div style={{ flex:1, minWidth:"180px" }}>
                        <div style={{ color:T.text, fontWeight:600, fontFamily:"'Fraunces',serif" }}>{p.name}</div>
                        <div style={{ color:T.textSoft, fontSize:"0.75rem", marginTop:"0.15rem" }}>📍 {p.address}</div>
                        <div style={{ display:"flex", gap:"0.4rem", alignItems:"center", marginTop:"0.25rem" }}>
                          <Stars rating={p.rating}/>
                          <span style={{ color:T.gold, fontSize:"0.78rem", fontWeight:600 }}>
                            {p.rating ? p.rating.toFixed(1) : "—"}
                          </span>
                          <span style={{ background:cat.bg, color:cat.color, fontSize:"0.65rem", fontWeight:700, padding:"1px 7px", borderRadius:"99px" }}>{cat.label}</span>
                        </div>
                      </div>
                      <span style={{ color:T.accent, fontSize:"0.78rem", fontWeight:600 }}>Details →</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1rem" }}>
                {sortedResults.map(p => (
                  <ActivityCard onAddToCalendar={p2 => onAddToCalendarPrompt && onAddToCalendarPrompt(p2)} key={p.id} place={p} favorites={favorites}
                    onToggleFav={onToggleFav} onSelect={setSelectedPlace}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPlace && (
        <DetailModal place={selectedPlace} favorites={favorites}
          onToggleFav={onToggleFav} onClose={() => setSelectedPlace(null)} user={user} onOpenAuth={onOpenAuth}/>
      )}
    </div>
  );
}

// ── Favorites Page ────────────────────────────────────────────────────────────
function FavoritesPage({ favPlaces, favorites, onToggleFav, kids, activeKidId, setActiveKidId, kidSaves, onToggleKidFav, onOpenKidsManager, user, onOpenAuth, calendarEvents, onAddCalendarEvent }) {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [tab, setTab] = useState("all"); // "all" | kidId | "calendar" | "calendar"

  const displayPlaces = tab === "all"
    ? favPlaces
    : [...(kidSaves[tab] || new Map()).values()];

  const activeKid = kids.find(k => k.id === tab);

  return (
    <div style={{ padding:"1.5rem", background:T.bg, minHeight:"80vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.5rem", marginBottom:"0.25rem" }}>Saved Activities</h2>
          <p style={{ color:T.textSoft, fontSize:"0.83rem" }}>{displayPlaces.length} saved{activeKid ? " for "+activeKid.name : ""}</p>
        </div>
        <button onClick={onOpenKidsManager}
          style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"99px", padding:"0.45rem 1rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:"0.4rem" }}>
          👨‍👩‍👧‍👦 Manage Kids
        </button>
      </div>

      {/* Kid tabs */}
      <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
        <button onClick={() => setTab("all")}
          style={{ background: tab==="all" ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : T.bgDeep, color: tab==="all" ? "#fff" : T.textSoft, border:"1px solid "+(tab==="all"?"transparent":T.border), borderRadius:"99px", padding:"0.35rem 0.9rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          All Saved ({favPlaces.length})
        </button>
        <button onClick={() => setTab("calendar")}
          style={{ background: tab==="calendar" ? "#16a34a" : T.bgDeep, color: tab==="calendar" ? "#fff" : T.textSoft, border:"1px solid "+(tab==="calendar"?"transparent":T.border), borderRadius:"99px", padding:"0.35rem 0.9rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Calendar
        </button>
        {kids.map(kid => {
          const count = (kidSaves[kid.id]||new Map()).size;
          const isActive = tab === kid.id;
          return (
            <button key={kid.id} onClick={() => setTab(kid.id)}
              style={{ background: isActive ? kid.color : T.bgDeep, color: isActive ? "#fff" : T.textSoft, border:"1px solid "+(isActive?"transparent":T.border), borderRadius:"99px", padding:"0.35rem 0.9rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:"0.35rem" }}>
              <span style={{ width:"18px", height:"18px", borderRadius:"50%", background: isActive?"rgba(255,255,255,0.3)":kid.color, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700 }}>
                {kid.name.charAt(0).toUpperCase()}
              </span>
              {kid.name} ({count})
            </button>
          );
        })}
      </div>

      {tab === "calendar" ? (
        user ? (
          <CalendarPage kids={kids} kidSaves={kidSaves} events={calendarEvents || []} setEvents={onAddCalendarEvent}/>
        ) : (
          <div style={{ textAlign:"center", padding:"4rem 1rem", background:T.bgCard, borderRadius:"18px", border:"1px solid "+T.border }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}></div>
            <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.2rem", marginBottom:"0.5rem" }}>Your Family Calendar</h3>
            <p style={{ color:T.textSoft, fontSize:"0.85rem", marginBottom:"1.25rem", lineHeight:1.6 }}>
              Create a free account to access your weekly calendar, track each child's schedule, and export to Google Calendar or Apple Calendar.
            </p>
            <button onClick={onOpenAuth}
              style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.7rem 1.75rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Create Free Account →
            </button>
          </div>
        )
      ) : displayPlaces.length === 0 ? (
        <div style={{ textAlign:"center", padding:"4rem 1rem", background:T.bgCard, borderRadius:"18px", border:"1px solid "+T.border }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🌻</div>
          <p style={{ color:T.textSoft, fontFamily:"'Fraunces',serif" }}>
            {tab === "all" ? "No saved activities yet." : "Nothing saved for "+activeKid?.name+" yet."}
          </p>
          <p style={{ color:T.textMuted, fontSize:"0.85rem", marginTop:"0.4rem" }}>
            Browse activities and tap ♡ or a child's initial to save.
          </p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1rem" }}>
          {displayPlaces.map(p => (
            <ActivityCard key={p.id} place={p} favorites={favorites}
              onToggleFav={onToggleFav} onSelect={setSelectedPlace}
              kids={kids} activeKidId={activeKidId} kidSaves={kidSaves}
              onToggleKidFav={onToggleKidFav}/>
          ))}
        </div>
      )}
      {selectedPlace && <DetailModal place={selectedPlace} favorites={favorites} onToggleFav={onToggleFav} onClose={() => setSelectedPlace(null)} user={user} onOpenAuth={onOpenAuth}/>}
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onNavigate, onOpenAuth }) {
  return (
    <div>
      <div style={{         padding:"3.5rem 1.5rem 2.5rem", textAlign:"center", borderBottom:"1px solid "+T.border, position:"relative", overflow:"hidden", background:"#f8f8f8"}}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse at 20% 80%, rgba(255,180,220,0.25) 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(160,180,255,0.2) 0%, transparent 45%)", pointerEvents:"none" }}/>
        <div style={{ position:"relative" }}>
          <span style={{ background:"#f8f8f8", border:"none", color:"#2e1a08", fontSize:"0.72rem", fontWeight:800, padding:"4px 16px", borderRadius:"99px", textTransform:"uppercase", letterSpacing:"2px", boxShadow:"0 2px 12px "+T.shadow }}>Your Family Activity Hub</span>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(2.2rem,5.5vw,3.6rem)", fontWeight:900, lineHeight:1.08, margin:"1rem 0", color:T.text }}>
            Find Their Next<br/>
            <span style={{ background:"linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Favorite Activity</span>
          </h1>
          <p style={{ color:T.textSoft, fontSize:"1.05rem", maxWidth:"460px", margin:"0 auto 2rem", lineHeight:1.75 }}>
            All their activities. One spot.
          </p>
          <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => onNavigate("browse")}
              style={{                 color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.75rem 2rem", fontSize:"0.95rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px "+T.shadow, background:"#f8f8f8"}}>
              Find Activities Near Me →
            </button>
            <button onClick={onOpenAuth}
              style={{ background:T.bgCard, color:T.accent, border:"1.5px solid "+T.accent+"55", borderRadius:"99px", padding:"0.75rem 2rem", fontSize:"0.95rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Sign In / Sign Up
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"2.25rem 1.5rem", background:T.bg }}>
        <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"1.25rem", textAlign:"center" }}>Browse by Category</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:"0.75rem", maxWidth:"900px", margin:"0 auto" }}>
          {CATEGORIES.map((cat, i) => (
            <button key={cat.label} onClick={() => onNavigate("browse", { category:cat.label })}
              style={{ background:cat.bg, border:"1.5px solid "+cat.color+"44", borderRadius:"14px", padding:"1.1rem 0.75rem", cursor:"pointer", textAlign:"center", transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:"0.4rem", boxShadow:"0 2px 12px "+cat.color+"22", fontFamily:"inherit" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=cat.color; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 8px 24px "+cat.color+"44"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=cat.color+"44"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px "+cat.color+"22"; }}>

              <span style={{ color:cat.color, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"2rem 1.5rem",         borderTop:"1px solid "+T.border, borderBottom:"1px solid "+T.border, background:"#f8f8f8"}}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"1.5rem", maxWidth:"660px", margin:"0 auto", textAlign:"center" }}>
          {[{n:"",l:"AI Powered Search",c:"#7a5c48"},{n:"9",l:"Categories",c:"#6a6058"},{n:"Any ZIP",l:"Nationwide",c:"#587068"},{n:"Free",l:"Always",c:"#8a6a40"}].map(s => (
            <div key={s.l}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:"1.75rem", fontWeight:900, color:s.c }}>{s.n}</div>
              <div style={{ color:T.textSoft, fontSize:"0.8rem", marginTop:"0.2rem" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <NewsletterBanner/>
    </div>
  );
}

// ── About Page ────────────────────────────────────────────────────────────────
function ListYourBusinessForm() {
  const [form, setForm] = useState({ name:"", category:"", address:"", phone:"", website:"", email:"", description:"", ageRange:"", hours:"" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // eslint-disable-line no-unused-vars
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const inp = { width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.65rem 0.9rem", fontSize:"0.85rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit", display:"block" };
  const lbl = { display:"block", color:T.textMid, fontSize:"0.75rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase", letterSpacing:"0.8px" };

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || form.categories.length === 0) {
      setError("Please fill in business name, email, and at least one category.");
      return;
    }
    setLoading(true); setError("");
    try {
      const payload = {
        name: form.name.trim(),
        category: form.categories[0] || "Sports",
        categories: form.categories,
        address: form.address.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        hours: form.hours.trim(),
        price: form.price,
        age_range: form.age_min && form.age_max ? form.age_min+"-"+form.age_max : "",
        age_min: form.age_min ? parseInt(form.age_min) : null,
        age_max: form.age_max ? parseInt(form.age_max) : null,
        class_types: form.class_types ? form.class_types.split(",").map(s=>s.trim()).filter(Boolean) : [],
        featured_interest: form.featured_interest,
        status: "pending",
        rating: 0,
        review_count: 0,
      };
      await sbPost("activities", payload);
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, email: form.email })
        });
      } catch(e) { console.log("Notification failed:", e); }
      setSubmitted(true);
    } catch(e) {
      setError("Submission failed: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div id="list-biz-form" style={{ marginTop:"2rem", background:T.bgCard, border:"1px solid "+T.border, borderRadius:"18px", padding:"1.75rem", boxShadow:"0 2px 12px "+T.shadow }}>
      <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.2rem", marginBottom:"0.25rem" }}>List Your Business</h3>
      <p style={{ color:T.textSoft, fontSize:"0.83rem", marginBottom:"1.5rem" }}>Fill out the form below and our team will be in touch within 2 business days.</p>

      {submitted ? (
        <div style={{ textAlign:"center", padding:"2rem" }}>
          <div style={{ fontSize:"3rem", marginBottom:"0.75rem" }}>🎉</div>
          <h4 style={{ fontFamily:"'Fraunces',serif", color:T.text, marginBottom:"0.4rem" }}>Application Received!</h4>
          <p style={{ color:T.textSoft, fontSize:"0.85rem" }}>Thanks for reaching out. We'll contact you at {form.email} within 2 business days.</p>
        </div>
      ) : (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
            <div><label style={lbl}>Business Name *</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Your Business Name" style={inp}/></div>
            <div><label style={lbl}>Category</label>
              <select value={form.category} onChange={e=>set("category",e.target.value)} style={{...inp}}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Contact Email *</label><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@yourbusiness.com" style={inp}/></div>
            <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="(555) 000-0000" style={inp}/></div>
            <div><label style={lbl}>Website</label><input value={form.website} onChange={e=>set("website",e.target.value)} placeholder="https://yourbusiness.com" style={inp}/></div>
            <div><label style={lbl}>Age Range Served</label><input value={form.ageRange} onChange={e=>set("ageRange",e.target.value)} placeholder="e.g. 3-14" style={inp}/></div>
          </div>
          <div style={{ marginBottom:"1rem" }}><label style={lbl}>Address</label><input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="123 Main St, City, ST 00000" style={inp}/></div>
          <div style={{ marginBottom:"1rem" }}><label style={lbl}>Hours</label><input value={form.hours} onChange={e=>set("hours",e.target.value)} placeholder="Mon-Fri 9am-5pm" style={inp}/></div>
          <div style={{ marginBottom:"1.5rem" }}>
            <label style={lbl}>Tell us about your program</label>
            <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={4}
              placeholder="Describe what you offer, what makes you special, and why families should choose you…"
              style={{...inp, resize:"vertical"}}/>
          </div>
          <div style={{ background:T.bgDeep, borderRadius:"10px", padding:"0.85rem", marginBottom:"1.25rem", border:"1px solid "+T.border }}>
            <div style={{ color:T.textMid, fontWeight:700, fontSize:"0.78rem", marginBottom:"0.5rem" }}>Featured Placement Options</div>
            <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
              {[{t:"Silver",l:"Sponsored badge + listing",c:T.textSoft},{t:"Gold",l:"Featured section + badge",c:T.gold},{t:"Platinum",l:"Top placement + all features",c:T.textMid}].map(o => (
                <div key={o.t} style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"8px", padding:"0.5rem 0.75rem", flex:"1 1 120px" }}>
                  <div style={{ color:o.c, fontWeight:700, fontSize:"0.75rem" }}>{o.t}</div>
                  <div style={{ color:T.textMuted, fontSize:"0.7rem", marginTop:"0.15rem" }}>{o.l}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={!form.name.trim()||!form.email.trim()||loading}
            style={{ background: form.name.trim()&&form.email.trim() ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : T.bgDeep, color: form.name.trim()&&form.email.trim() ? "#3a3028" : T.textMuted, border:"none", borderRadius:"99px", padding:"0.75rem 2rem", fontSize:"0.9rem", fontWeight:700, cursor: form.name.trim()&&form.email.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
            {loading ? "Submitting…" : "Submit Application →"}
          </button>
        </div>
      )}
    </div>
  );
}

function BusinessesPage() {
  return (
    <div style={{ padding:"1.5rem", background:T.bg, minHeight:"80vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.5rem", marginBottom:"0.25rem" }}>Local Businesses</h2>
          <p style={{ color:T.textSoft, fontSize:"0.85rem" }}>Support great local programs in your community</p>
        </div>
        <div style={{ background:T.goldBg, border:"1px solid "+T.gold+"55", borderRadius:"14px", padding:"1rem 1.25rem", maxWidth:"260px" }}>
          <div style={{ color:T.gold, fontWeight:700, fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"0.25rem" }}>🌟 Feature Your Business</div>
          <div style={{ color:T.textSoft, fontSize:"0.75rem", lineHeight:1.55 }}>Get seen by thousands of local parents. Platinum, Gold & Silver spots available.</div>
          <button style={{ marginTop:"0.65rem", background:"linear-gradient(135deg,"+T.gold+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.4rem 1rem", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>Learn More →</button>
        </div>
      </div>

      {/* Featured businesses */}
      <h3 style={{ color:T.gold, fontFamily:"'Fraunces',serif", fontSize:"1.05rem", marginBottom:"0.85rem" }}>⭐ Featured Partners</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
        {[
          { name:"Jump Zone Trampoline Park", category:"Sports", address:"123 Spring St, New York, NY 10001", phone:"(212) 555-0101", website:"https://jumpzone.com", description:"NYC premier indoor trampoline park with foam pits, dodgeball courts, and ninja courses.", rating:4.6, reviewCount:312, tier:"gold", icon:"🦘", amenities:["Party Rooms","Café","Free Parking"] },
          { name:"Harmony Music School", category:"Music", address:"456 Melody Ave, Brooklyn, NY 11201", phone:"(718) 555-0202", website:"https://harmonymusicschool.com", description:"Private and group lessons in piano, guitar, violin, voice, and drums for ages 3 and up.", rating:4.9, reviewCount:187, tier:"platinum", icon:"🎵", amenities:["Trial Lesson","Online Options","Instrument Rental"] },
          { name:"Wild Oaks Adventure Camp", category:"Outdoors", address:"987 Trailhead Rd, Hoboken, NJ 07030", phone:"(201) 555-0606", website:"https://wildoaks.com", description:"Day and overnight camp experiences focused on rock climbing, kayaking, archery, and team-building.", rating:4.8, reviewCount:167, tier:"gold", icon:"🏕️", amenities:["Transportation","Before/After Care","Financial Aid"] },
        ].map((biz,i) => {
          const cat = getCatMeta(biz.category);
          const tierStyle = { platinum:{ bg:"linear-gradient(135deg,#5a5448,#2c2118)", label:"⭐ Platinum" }, gold:{ bg:"linear-gradient(135deg,"+T.gold+","+T.accentAlt+")", label:"🥇 Featured" } }[biz.tier];
          return (
            <div key={i} style={{ background:T.bgCard, border:"1.5px solid "+cat.color+"44", borderRadius:"18px", padding:"1.3rem", position:"relative", boxShadow:"0 2px 12px "+T.shadow }}>
              <div style={{ position:"absolute", top:"-1px", left:"1.25rem" }}>
                <span style={{ background:tierStyle.bg, color:"#fff", fontSize:"0.62rem", fontWeight:800, padding:"3px 11px", borderRadius:"99px", textTransform:"uppercase", letterSpacing:"1.5px" }}>{tierStyle.label}</span>
              </div>
              <div style={{ display:"flex", gap:"0.75rem", alignItems:"flex-start", marginTop:"0.75rem" }}>
                <span style={{ fontSize:"1.9rem", background:cat.bg, padding:"0.55rem", borderRadius:"12px", flexShrink:0 }}>{biz.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:T.text, fontWeight:700, fontSize:"0.98rem", fontFamily:"'Fraunces',serif" }}>{biz.name}</div>
                  <div style={{ color:cat.color, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"0.4rem" }}>{biz.category}</div>
                  <p style={{ color:T.textSoft, fontSize:"0.8rem", lineHeight:1.6, marginBottom:"0.75rem" }}>{biz.description}</p>
                  <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", marginBottom:"0.75rem" }}>
                    {biz.amenities.map(a => <span key={a} style={{ background:cat.bg, color:cat.color, fontSize:"0.65rem", padding:"2px 8px", borderRadius:"99px", border:"1px solid "+cat.color+"33", fontWeight:600 }}>✓ {a}</span>)}
                  </div>
                  <div style={{ color:T.textSoft, fontSize:"0.72rem", marginBottom:"0.25rem" }}>📍 {biz.address}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.75rem", flexWrap:"wrap", gap:"0.4rem" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
                      <Stars rating={biz.rating}/>
                      <span style={{ color:T.gold, fontWeight:700, fontSize:"0.8rem" }}>{biz.rating}</span>
                      <span style={{ color:T.textMuted, fontSize:"0.72rem" }}>({biz.reviewCount})</span>
                    </div>
                    <div style={{ display:"flex", gap:"0.4rem" }}>
                      <a href={"tel:"+biz.phone} style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"99px", padding:"0.35rem 0.8rem", fontSize:"0.72rem", textDecoration:"none", fontWeight:600 }}>📞 Call</a>
                      <a href={biz.website} target="_blank" rel="noreferrer" style={{ background:"linear-gradient(135deg,"+cat.color+","+T.accentAlt+")", color:"#fff", borderRadius:"99px", padding:"0.35rem 1rem", fontSize:"0.72rem", textDecoration:"none", fontWeight:700 }}>Visit →</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List your business CTA */}
      <div style={{ background:"#f8f8f8", borderRadius:"18px", padding:"2rem", textAlign:"center", marginTop:"1rem" }}>
        <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>🏢</div>
        <h3 style={{ fontFamily:"'Fraunces',serif", color:"#2e1a08", fontSize:"1.3rem", marginBottom:"0.5rem" }}>List Your Business</h3>
        <p style={{ color:T.textSoft, fontSize:"0.87rem", marginBottom:"1.25rem", maxWidth:"380px", margin:"0 auto 1.25rem", lineHeight:1.65 }}>
          Reach thousands of local parents looking for exactly what you offer. Get started today.
        </p>
        <button onClick={() => { document.getElementById("list-biz-form") && document.getElementById("list-biz-form").scrollIntoView({behavior:"smooth"}); }}
          style={{ background:"#8b3e10", color:"#fff", border:"none", borderRadius:"99px", padding:"0.7rem 1.75rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Get Listed →
        </button>
      </div>

      {/* List Your Business Form */}
      <ListYourBusinessForm/>
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ background:T.bg, minHeight:"80vh" }}>
      <div style={{ background:"linear-gradient(135deg,#eff6ff,#f5f3ff)", padding:"3.5rem 1.5rem", textAlign:"center", borderBottom:"1px solid "+T.border }}>
        <div style={{ width:"160px", height:"160px", borderRadius:"50%", overflow:"hidden", margin:"0 auto 1.25rem", border:"4px solid #fff", boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
          <img src="https://raw.githubusercontent.com/kmfields28/The-sign-up-spot/main/public/IMG_7294.jpeg" alt="The Fields Family" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        </div>
        <h1 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"2rem", marginBottom:"0.5rem" }}>Hi, I am Kristen</h1>
        <p style={{ color:T.textSoft, fontSize:"1rem", maxWidth:"520px", margin:"0 auto", lineHeight:1.7 }}>Mom of two, wife, dog mom, and the person who finally got tired of endless Google searches for kids activities.</p>
      </div>
      <div style={{ maxWidth:"680px", margin:"0 auto", padding:"2.5rem 1.5rem" }}>
        <div style={{ background:"#fff", border:"1px solid "+T.border, borderRadius:"20px", padding:"2rem", marginBottom:"1.5rem", boxShadow:"0 2px 12px "+T.shadow }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"1rem" }}>Why I Built This</h2>
          <p style={{ color:T.textSoft, fontSize:"0.92rem", lineHeight:1.85, marginBottom:"1rem" }}>Every parent wants their kids to find their thing — the sport they love, the art class that lights them up, the team that becomes their people. But finding those opportunities? That is a whole other job.</p>
          <p style={{ color:T.textSoft, fontSize:"0.92rem", lineHeight:1.85, marginBottom:"1rem" }}>For me it was endless Google searches, texts to the mom group, digging through Facebook pages, asking around at school pickup. By the time I had tracked down the right program, half the session was already full. And do not even get me started on summer camps — the good ones fill up in January while you are still recovering from the holidays.</p>
          <p style={{ color:T.textSoft, fontSize:"0.92rem", lineHeight:1.85, marginBottom:"1rem" }}>And then there is the registration chaos. Soccer season opens in February. Dance registration is in April. That STEM camp you heard about? It filled up three months ago and you did not even know sign-ups had started. Every activity runs on its own schedule with its own deadline — and there is no central place to know when it is time to sign up.</p>
          <p style={{ color:T.textSoft, fontSize:"0.92rem", lineHeight:1.85, marginBottom:"1rem" }}>Moms and dads are already managing everything at once. The Sign Up Spot takes one piece of that off your plate — so you can spend less time searching and more time cheering from the sidelines.</p>
          <p style={{ color:T.textSoft, fontSize:"0.92rem", lineHeight:1.85 }}>When you have multiple kids in different activities, just knowing what the week looks like is its own challenge. We built the family calendar so you can see every child schedule in one place, color-coded by kid, and actually know if it is manageable before you are already in it. Because our kids deserve every chance to find their passion, build strong friendships, and try something new — and you deserve to find it without the chaos.</p>
        </div>
        <div style={{ background:"linear-gradient(135deg,#eff6ff,#faf5ff)", border:"1px solid #c7d2fe", borderRadius:"20px", padding:"2rem", marginBottom:"1.5rem" }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"1.25rem" }}>Our Family</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"1rem" }}>
            {[{ emoji:"", name:"Kristen", desc:"Founder & mom" },{ emoji:"", name:"Dan", desc:"Husband & co-pilot" },{ emoji:"", name:"Isabella", desc:"Age 6" },{ emoji:"", name:"Lilia", desc:"Age 3" },{ emoji:"", name:"Annie & Chase", desc:"Pure chaos" }].map(m => (
              <div key={m.name} style={{ background:"rgba(255,255,255,0.7)", borderRadius:"14px", padding:"1rem", textAlign:"center", border:"1px solid rgba(199,210,254,0.5)" }}>
                <div style={{ color:T.text, fontWeight:700, fontSize:"0.88rem" }}>{m.name}</div>
                <div style={{ color:T.textSoft, fontSize:"0.75rem", marginTop:"0.15rem" }}>{m.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ color:T.textSoft, fontSize:"0.82rem", marginTop:"1rem", textAlign:"center" }}>Marvin, NC</p>
        </div>
        <div style={{ background:"#fff", border:"1px solid "+T.border, borderRadius:"20px", padding:"2rem", marginBottom:"1.5rem", boxShadow:"0 2px 12px "+T.shadow }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"1rem" }}>What We Are Building</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
            {[{ icon:"", text:"One place to find every kids activity near you — sports, arts, music, dance, STEM, theater, tutoring, and more" },{ icon:"", text:"Real reviews from real parents you can actually trust" },{ icon:"", text:"A family calendar so you can see every child schedule in one view — color-coded by kid" },{ icon:"", text:"An experience built for how moms and dads actually live — on their phones, in between everything else" }].map((item, i) => (
              <div key={i} style={{ display:"flex", gap:"0.85rem", alignItems:"flex-start" }}>
                <span style={{ fontSize:"1.4rem", flexShrink:0 }}>{item.icon}</span>
                <p style={{ color:T.textSoft, fontSize:"0.88rem", lineHeight:1.7, margin:0 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", borderRadius:"20px", padding:"2rem", textAlign:"center", color:"#fff" }}>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:"1.3rem", marginBottom:"0.5rem" }}>Get in Touch</h2>
          <p style={{ fontSize:"0.88rem", opacity:0.9, marginBottom:"1.25rem", lineHeight:1.6 }}>Have a business you would like to list? A feature idea? Just want to say hi? I would love to hear from you.</p>
          <a href="mailto:LiliBellebiz@gmail.com" style={{ background:"#fff", color:T.accent, borderRadius:"99px", padding:"0.7rem 1.75rem", fontSize:"0.9rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.75rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            LiliBellebiz@gmail.com
          </a>
          <br/>
          <a href="https://instagram.com/thesignupspot" target="_blank" rel="noreferrer" style={{ background:"linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)", color:"#fff", border:"none", borderRadius:"99px", padding:"0.7rem 1.75rem", fontSize:"0.9rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"0.5rem", marginTop:"0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            @thesignupspot
          </a>
        </div>
      </div>
    </div>
  );
}


// ── Hamburger Menu ────────────────────────────────────────────────────────────
// ── Kid Profile Colors ────────────────────────────────────────────────────────
const KID_COLORS = ["#dc2626","#ea580c","#16a34a","#2563eb","#7c3aed","#db2777","#0891b2","#d97706"];

// ── Kids Manager Modal ────────────────────────────────────────────────────────
function KidsManager({ kids, activeKidId, setActiveKidId, addKid, removeKid, renameKid, kidSaves, onClose }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(KID_COLORS[kids.length % KID_COLORS.length]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(44,31,20,0.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bgCard, borderRadius:"24px", padding:"2rem", maxWidth:"440px", width:"100%", boxShadow:"0 32px 64px "+T.shadow, border:"1px solid "+T.border, position:"relative", maxHeight:"90vh", overflowY:"auto" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"1rem", right:"1rem", background:T.bgDeep, border:"1px solid "+T.border, color:T.textSoft, width:"30px", height:"30px", borderRadius:"50%", cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>

        <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.3rem", marginBottom:"0.25rem" }}>My Kids</h2>
        <p style={{ color:T.textSoft, fontSize:"0.82rem", marginBottom:"1.5rem" }}>Save activities for each child separately</p>

        {/* Kid list */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem", marginBottom:"1.5rem" }}>
          {kids.map(kid => {
            const saves = kidSaves[kid.id] ? kidSaves[kid.id].size : 0;
            const isActive = kid.id === activeKidId;
            return (
              <div key={kid.id} style={{ background: isActive ? T.accentBg : T.bgDeep, border:"1px solid "+(isActive?T.accent+"55":T.border), borderRadius:"14px", padding:"0.85rem 1rem", display:"flex", alignItems:"center", gap:"0.75rem", transition:"all 0.15s" }}>
                {/* Avatar */}
                <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:kid.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1.1rem", flexShrink:0, cursor:"pointer" }}
                  onClick={() => setActiveKidId(kid.id)}>
                  {kid.name.charAt(0).toUpperCase()}
                </div>
                {/* Name / edit */}
                {editingId === kid.id ? (
                  <input value={editName} onChange={e=>setEditName(e.target.value)}
                    autoFocus
                    onBlur={() => { if(editName.trim()) renameKid(kid.id, editName.trim()); setEditingId(null); }}
                    onKeyDown={e => { if(e.key==="Enter"){ if(editName.trim()) renameKid(kid.id, editName.trim()); setEditingId(null); }}}
                    style={{ flex:1, background:T.bgInput, border:"1px solid "+T.accent, borderRadius:"8px", padding:"0.35rem 0.65rem", fontSize:"0.88rem", color:T.text, fontFamily:"inherit" }}/>
                ) : (
                  <div style={{ flex:1, cursor:"pointer" }} onClick={() => setActiveKidId(kid.id)}>
                    <div style={{ color:T.text, fontWeight: isActive?700:500, fontSize:"0.9rem" }}>{kid.name}</div>
                    <div style={{ color:T.textMuted, fontSize:"0.72rem" }}>{saves} saved activit{saves===1?"y":"ies"}</div>
                  </div>
                )}
                {/* Actions */}
                <div style={{ display:"flex", gap:"0.3rem" }}>
                  <button onClick={() => { setEditingId(kid.id); setEditName(kid.name); }}
                    style={{ background:"none", border:"1px solid "+T.border, borderRadius:"6px", padding:"0.25rem 0.5rem", fontSize:"0.72rem", color:T.textSoft, cursor:"pointer", fontFamily:"inherit" }}>✏️</button>
                  {kids.length > 1 && (
                    <button onClick={() => removeKid(kid.id)}
                      style={{ background:"none", border:"1px solid "+T.border, borderRadius:"6px", padding:"0.25rem 0.5rem", fontSize:"0.72rem", color:T.textSoft, cursor:"pointer", fontFamily:"inherit" }}>🗑</button>
                  )}
                  {isActive && <span style={{ background:T.accent, color:"#fff", fontSize:"0.62rem", fontWeight:700, padding:"2px 8px", borderRadius:"99px", alignSelf:"center" }}>Active</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Color picker for new kid */}
        <div style={{ display:"flex", gap:"0.4rem", marginBottom:"0.75rem", flexWrap:"wrap" }}>
          {KID_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              style={{ width:"24px", height:"24px", borderRadius:"50%", background:c, border:"2px solid "+(newColor===c?"#2c2118":"transparent"), cursor:"pointer" }}/>
          ))}
        </div>

        {/* Add kid */}
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder="Child's name…"
            onKeyDown={e => { if(e.key==="Enter" && newName.trim()){ addKid(newName.trim(), newColor); setNewName(""); setNewColor(KID_COLORS[(kids.length+1)%KID_COLORS.length]); }}}
            style={{ flex:1, background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.62rem 0.9rem", fontSize:"0.87rem", color:T.text, fontFamily:"inherit" }}/>
          <button onClick={() => { if(newName.trim()){ addKid(newName.trim(), newColor); setNewName(""); setNewColor(KID_COLORS[(kids.length+1)%KID_COLORS.length]); }}}
            style={{ background:"#f8f8f8", color:"#2e1a08", border:"none", borderRadius:"10px", padding:"0.62rem 1rem", fontSize:"0.87rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", boxShadow:"0 2px 10px "+T.shadow }}>
            + Add Child
          </button>
        </div>

        <p style={{ color:T.textMuted, fontSize:"0.73rem", marginTop:"1rem", textAlign:"center", lineHeight:1.5 }}>
          The active child's name appears next to saved activities throughout the app
        </p>
      </div>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────
// ── Add To Calendar Modal ─────────────────────────────────────────────────────
function AddToCalendarModal({ place, kids, user, onOpenAuth, onClose, onSaveEvent }) {
  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [day, setDay] = useState(1);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [notes, setNotes] = useState("");
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const HOURS = Array.from({length:13}, (_,i) => i + 7);

  if (!user) return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:"20px", padding:"2rem", maxWidth:"380px", width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}></div>
        <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.2rem", marginBottom:"0.5rem" }}>Add to Your Calendar</h3>
        <p style={{ color:T.textSoft, fontSize:"0.85rem", marginBottom:"1.25rem", lineHeight:1.6 }}>Create a free account to add <strong>{place.name}</strong> to your family calendar and track each child's schedule.</p>
        <button onClick={() => { onClose(); onOpenAuth(); }}
          style={{ width:"100%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.75rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:"0.5rem" }}>
          Create Free Account →
        </button>
        <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit" }}>Maybe later</button>
      </div>
    </div>
  );

  function save() {
    const kid = kids.find(k => k.id === kidId);
    onSaveEvent({
      id: Date.now().toString(),
      title: place.name,
      kidId, day, startHour, endHour, startMin:0, endMin:0,
      notes, color: kid ? kid.color : T.accent,
      placeId: place.placeId,
    });
    onClose();
  }

  const inp = { width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.85rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { display:"block", color:T.textMid, fontSize:"0.72rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:"20px", padding:"1.75rem", maxWidth:"400px", width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.1rem", marginBottom:"0.25rem" }}>Add to Calendar</h3>
        <p style={{ color:T.textSoft, fontSize:"0.82rem", marginBottom:"1.25rem" }}>{place.name}</p>

        {kids.length > 0 && (
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={lbl}>For which child?</label>
            <select value={kidId} onChange={e=>setKidId(e.target.value)} style={inp}>
              <option value="">No child assigned</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.65rem", marginBottom:"0.85rem" }}>
          <div>
            <label style={lbl}>Day</label>
            <select value={day} onChange={e=>setDay(Number(e.target.value))} style={inp}>
              {DAYS.map((d,i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Start</label>
            <select value={startHour} onChange={e=>setStartHour(Number(e.target.value))} style={inp}>
              {HOURS.map(h => <option key={h} value={h}>{h>12?h-12+"pm":h===12?"12pm":h+"am"}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>End</label>
            <select value={endHour} onChange={e=>setEndHour(Number(e.target.value))} style={inp}>
              {HOURS.filter(h=>h>startHour).map(h => <option key={h} value={h}>{h>12?h-12+"pm":h===12?"12pm":h+"am"}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:"1.25rem" }}>
          <label style={lbl}>Notes (optional)</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Location, what to bring..." style={inp}/>
        </div>

        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button onClick={onClose} style={{ flex:1, background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"8px", padding:"0.65rem", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={save} style={{ flex:2, background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"8px", padding:"0.65rem", fontSize:"0.85rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Add to Calendar ✓</button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Page ─────────────────────────────────────────────────────────────
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOURS = Array.from({length:13}, (_,i) => i + 7); // 7am to 7pm

function CalendarPage({ kids, kidSaves, events, setEvents }) {
  if (!events) events = [];
  if (!setEvents) setEvents = () => {};
  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState({ title:"", kidId:"", day:1, startHour:9, startMin:0, endHour:10, endMin:0, color:"", notes:"" });

  function saveEvents(evs) { if (setEvents) setEvents(evs); }

  function openAdd(day, hour) {
    const kid = kids[0] || {};
    setForm({ title:"", kidId:kid.id||"", day, startHour:hour, startMin:0, endHour:hour+1, endMin:0, color:kid.color||"#2563eb", notes:"" });
    setEditEvent(null);
    setShowAdd(true);
  }

  function openEdit(ev) {
    setForm({...ev});
    setEditEvent(ev.id);
    setShowAdd(true);
  }

  function saveEvent() {
    if (!form.title.trim()) return;
    const kid = kids.find(k => k.id === form.kidId);
    const ev = { ...form, id: editEvent || Date.now().toString(), color: kid ? kid.color : form.color };
    if (editEvent) {
      saveEvents(events.map(e => e.id === editEvent ? ev : e));
    } else {
      saveEvents([...events, ev]);
    }
    setShowAdd(false);
  }

  function deleteEvent(id) {
    saveEvents(events.filter(e => e.id !== id));
    setShowAdd(false);
  }

  function exportICS() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//The Sign Up Spot//EN",
    ];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    events.forEach(ev => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + ev.day);
      const pad = n => String(n).padStart(2,"0");
      const dateStr = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
      const startStr = dateStr + "T" + pad(ev.startHour) + pad(ev.startMin||0) + "00";
      const endStr = dateStr + "T" + pad(ev.endHour) + pad(ev.endMin||0) + "00";
      const kid = kids.find(k => k.id === ev.kidId);
      lines.push("BEGIN:VEVENT");
      lines.push("DTSTART:" + startStr);
      lines.push("DTEND:" + endStr);
      lines.push("SUMMARY:" + (ev.title) + (kid ? " (" + kid.name + ")" : ""));
      lines.push("DESCRIPTION:" + (ev.notes || ""));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type:"text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "signupspot-schedule.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportGoogleCalendar(ev) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + ev.day);
    const pad = n => String(n).padStart(2,"0");
    const dateStr = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
    const start = dateStr + "T" + pad(ev.startHour) + pad(ev.startMin||0) + "00";
    const end = dateStr + "T" + pad(ev.endHour) + pad(ev.endMin||0) + "00";
    const kid = kids.find(k => k.id === ev.kidId);
    const title = encodeURIComponent(ev.title + (kid ? " (" + kid.name + ")" : ""));
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + title + "&dates=" + start + "/" + end + "&details=" + encodeURIComponent(ev.notes||"");
    window.open(url, "_blank");
  }

  const cellH = 60;

  return (
    <div style={{ background:T.bg, minHeight:"80vh" }}>
      {/* Header */}
      <div style={{ padding:"1.25rem 1.5rem", borderBottom:"1px solid "+T.border, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.75rem", background:"#fff" }}>
        <div>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"0.15rem" }}>Weekly Schedule</h2>
          <p style={{ color:T.textSoft, fontSize:"0.82rem" }}>This week · tap a time slot to add an activity</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <button onClick={exportICS} style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}> Export .ics</button>
          <button onClick={() => { if(events.length>0) exportGoogleCalendar(events[0]); }} style={{ background:"#fff", border:"1.5px solid #e8e8e8", color:"#444", borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:"0.4rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google Cal
            </button>
          <button onClick={() => openAdd(1,9)} style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", border:"none", color:"#fff", borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"0.78rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Add Activity</button>
        </div>
      </div>

      {/* Kid legend */}
      {kids.length > 0 && (
        <div style={{ padding:"0.6rem 1.5rem", borderBottom:"1px solid "+T.border, display:"flex", gap:"0.5rem", flexWrap:"wrap", background:"#fafafa" }}>
          {kids.map(kid => (
            <div key={kid.id} style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
              <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:kid.color }}/>
              <span style={{ color:T.textMid, fontSize:"0.76rem", fontWeight:600 }}>{kid.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:"640px" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"56px repeat(7, 1fr)", borderBottom:"2px solid "+T.border, background:"#fff" }}>
            <div/>
            {DAYS.map(d => (
              <div key={d} style={{ padding:"0.6rem 0.25rem", textAlign:"center", color:T.textMid, fontSize:"0.78rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px" }}>{d}</div>
            ))}
          </div>

          {/* Time slots */}
          <div style={{ position:"relative" }}>
            {HOURS.map(hour => (
              <div key={hour} style={{ display:"grid", gridTemplateColumns:"56px repeat(7, 1fr)", borderBottom:"1px solid "+T.border+"88", minHeight:cellH+"px" }}>
                <div style={{ padding:"0 0.5rem", paddingTop:"0.2rem", color:T.textMuted, fontSize:"0.68rem", textAlign:"right", flexShrink:0, userSelect:"none" }}>
                  {hour === 12 ? "12pm" : hour > 12 ? (hour-12)+"pm" : hour+"am"}
                </div>
                {DAYS.map((_, dayIdx) => (
                  <div key={dayIdx} onClick={() => openAdd(dayIdx, hour)}
                    style={{ borderLeft:"1px solid "+T.border+"44", cursor:"pointer", position:"relative", minHeight:cellH+"px" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f0f9ff"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    {events.filter(ev => ev.day===dayIdx && ev.startHour===hour).map(ev => {
                      const kid = kids.find(k => k.id === ev.kidId);
                      const dur = (ev.endHour - ev.startHour) + (ev.endMin - (ev.startMin||0))/60;
                      return (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev); }}
                          style={{ position:"absolute", top:"2px", left:"2px", right:"2px",
                            height: Math.max(dur * cellH - 4, 24) + "px",
                            background: (kid ? kid.color : ev.color) + "22",
                            border:"1.5px solid "+(kid ? kid.color : ev.color),
                            borderRadius:"6px", padding:"3px 6px", cursor:"pointer",
                            overflow:"hidden", zIndex:2 }}>
                          <div style={{ color: kid ? kid.color : ev.color, fontSize:"0.7rem", fontWeight:700, lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.title}</div>
                          {kid && <div style={{ color:kid.color, fontSize:"0.62rem", opacity:0.8 }}>{kid.name}</div>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:"20px", padding:"1.75rem", maxWidth:"400px", width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.15rem", marginBottom:"1.25rem" }}>{editEvent ? "Edit Activity" : "Add Activity"}</h3>

            <div style={{ marginBottom:"0.85rem" }}>
              <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>Activity Name</label>
              <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Soccer Practice" style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}/>
            </div>

            <div style={{ marginBottom:"0.85rem" }}>
              <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>Child</label>
              <select value={form.kidId} onChange={e => { const kid=kids.find(k=>k.id===e.target.value); setForm(f=>({...f,kidId:e.target.value,color:kid?kid.color:f.color})); }} style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}>
                <option value="">No child assigned</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"0.85rem" }}>
              <div>
                <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>Day</label>
                <select value={form.day} onChange={e => setForm(f=>({...f,day:Number(e.target.value)}))} style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}>
                  {DAYS.map((d,i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>Start Time</label>
                <select value={form.startHour} onChange={e => setForm(f=>({...f,startHour:Number(e.target.value)}))} style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}>
                  {HOURS.map(h => <option key={h} value={h}>{h>12?h-12+"pm":h===12?"12pm":h+"am"}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:"0.85rem" }}>
              <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>End Time</label>
              <select value={form.endHour} onChange={e => setForm(f=>({...f,endHour:Number(e.target.value)}))} style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}>
                {HOURS.filter(h => h > form.startHour).map(h => <option key={h} value={h}>{h>12?h-12+"pm":h===12?"12pm":h+"am"}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", color:T.textMid, fontSize:"0.73rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase" }}>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Location, what to bring..." style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"8px", padding:"0.6rem 0.8rem", fontSize:"0.87rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit" }}/>
            </div>

            <div style={{ display:"flex", gap:"0.5rem" }}>
              {editEvent && (
                <button onClick={() => deleteEvent(editEvent)} style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:"8px", padding:"0.6rem 1rem", fontSize:"0.83rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
              )}
              {editEvent && (
                <button onClick={() => exportGoogleCalendar(form)} style={{ background:"#4285f4", border:"none", color:"#fff", borderRadius:"8px", padding:"0.6rem 1rem", fontSize:"0.83rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ Google</button>
              )}
              <button onClick={() => setShowAdd(false)} style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"8px", padding:"0.6rem 1rem", fontSize:"0.83rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" }}>Cancel</button>
              <button onClick={saveEvent} disabled={!form.title.trim()} style={{ background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"8px", padding:"0.6rem 1.25rem", fontSize:"0.83rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:form.title.trim()?1:0.5 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("pending");
  const ADMIN_PASSWORD = "signupspot2024";

  async function loadListings() {
    setLoading(true);
    try {
      const all = await sbGet("activities?select=*&order=submitted_at.desc");
      setPending((all || []).filter(a => a.status === "pending"));
      setApproved((all || []).filter(a => a.status === "approved"));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/activities?id=eq." + id, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ status })
      });
      await loadListings();
    } catch(e) { alert("Error: " + e.message); }
  }

  async function deleteListing(id) {
    if (!window.confirm("Delete this listing permanently?")) return;
    try {
      await fetch(SUPABASE_URL + "/rest/v1/activities?id=eq." + id, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      });
      await loadListings();
    } catch(e) { alert("Error: " + e.message); }
  }

  if (!authed) return (
    <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:"1.5rem" }}>
      <div style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"20px", padding:"2.5rem", maxWidth:"360px", width:"100%", boxShadow:"0 8px 32px "+T.shadow, textAlign:"center" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>🔐</div>
        <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.4rem", marginBottom:"0.5rem" }}>Admin Access</h2>
        <p style={{ color:T.textSoft, fontSize:"0.83rem", marginBottom:"1.5rem" }}>Enter your admin password to manage listings</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && password === ADMIN_PASSWORD) { setAuthed(true); loadListings(); }}} placeholder="Password" style={{ width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.7rem 1rem", fontSize:"0.9rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit", marginBottom:"0.75rem", display:"block" }}/>
        <button onClick={() => { if (password === ADMIN_PASSWORD) { setAuthed(true); loadListings(); } else { alert("Incorrect password"); }}} style={{ width:"100%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", border:"none", borderRadius:"99px", padding:"0.7rem", fontSize:"0.9rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Sign In</button>
      </div>
    </div>
  );

  const listings = tab === "pending" ? pending : approved;

  return (
    <div style={{ padding:"1.5rem", background:T.bg, minHeight:"80vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.5rem", marginBottom:"0.25rem" }}>Admin Dashboard</h2>
          <p style={{ color:T.textSoft, fontSize:"0.83rem" }}>{pending.length} pending · {approved.length} approved</p>
        </div>
        <button onClick={loadListings} style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, borderRadius:"99px", padding:"0.45rem 1rem", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Refresh</button>
      </div>
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem" }}>
        {[["pending","Pending ("+pending.length+")"],["approved","Approved ("+approved.length+")"]].map(function(item) { var t=item[0],l=item[1]; return (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab===t ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : T.bgDeep, color: tab===t ? "#fff" : T.textMid, border:"1px solid "+(tab===t ? "transparent" : T.border), borderRadius:"99px", padding:"0.4rem 1rem", fontSize:"0.82rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
        );})}
      </div>
      {loading && <div style={{ textAlign:"center", padding:"2rem", color:T.textSoft }}>Loading...</div>}
      {!loading && listings.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem", background:T.bgCard, borderRadius:"16px", border:"1px solid "+T.border }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>{tab === "pending" ? "🎉" : "📭"}</div>
          <p style={{ color:T.textSoft }}>{tab === "pending" ? "No pending submissions!" : "No approved listings yet."}</p>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        {listings.map(function(biz) {
          return (
            <div key={biz.id} style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"16px", padding:"1.25rem", boxShadow:"0 2px 8px "+T.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.35rem", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'Fraunces',serif", color:T.text, fontWeight:700, fontSize:"1rem" }}>{biz.name}</span>
                    {biz.featured_interest && <span style={{ background:T.goldBg, color:T.gold, fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:"99px" }}>Featured Interest</span>}
                  </div>
                  <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", marginBottom:"0.5rem" }}>
                    {(biz.categories || [biz.category]).filter(Boolean).map(function(c) { var cm=getCatMeta(c); return <span key={c} style={{ background:cm.bg, color:cm.color, fontSize:"0.68rem", fontWeight:700, padding:"2px 8px", borderRadius:"99px" }}>{c}</span>; })}
                    {biz.age_min != null && biz.age_max != null && <span style={{ background:T.bgDeep, color:T.textSoft, fontSize:"0.68rem", padding:"2px 8px", borderRadius:"99px", border:"1px solid "+T.border }}>Ages {biz.age_min}-{biz.age_max}</span>}
                  </div>
                  {biz.description && <p style={{ color:T.textSoft, fontSize:"0.8rem", lineHeight:1.55, marginBottom:"0.5rem" }}>{biz.description.slice(0,150)}</p>}
                  <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
                    {biz.address && <span style={{ color:T.textMuted, fontSize:"0.75rem" }}>📍 {biz.address}</span>}
                    {biz.phone && <span style={{ color:T.textMuted, fontSize:"0.75rem" }}>📞 {biz.phone}</span>}
                    {biz.website && <a href={biz.website} target="_blank" rel="noreferrer" style={{ color:T.accent, fontSize:"0.75rem" }}>Website</a>}
                  </div>
                  {biz.class_types && biz.class_types.length > 0 && <div style={{ marginTop:"0.4rem" }}><span style={{ color:T.textMuted, fontSize:"0.73rem" }}>Classes: {biz.class_types.join(", ")}</span></div>}
                </div>
                <div style={{ display:"flex", gap:"0.5rem", flexShrink:0 }}>
                  {tab === "pending" && <button onClick={() => updateStatus(biz.id, "approved")} style={{ background:"#eef4eb", color:"#3a7a30", border:"1px solid #3a7a3044", borderRadius:"99px", padding:"0.4rem 1rem", fontSize:"0.8rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Approve</button>}
                  {tab === "approved" && <button onClick={() => updateStatus(biz.id, "pending")} style={{ background:T.bgDeep, color:T.textMid, border:"1px solid "+T.border, borderRadius:"99px", padding:"0.4rem 1rem", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Unpublish</button>}
                  <button onClick={() => deleteListing(biz.id)} style={{ background:"#fdf0f0", color:"#b04040", border:"1px solid #b0404044", borderRadius:"99px", padding:"0.4rem 1rem", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HamburgerMenu({ currentPage, onNavigate, onClose, favCount, onOpenAuth, user, kids, activeKidId, setActiveKidId, onOpenKidsManager }) {
  const navItems = [
    { page:"home",       icon:"", label:"Home" },
    { page:"browse",     icon:"", label:"Browse Activities" },
    { page:"businesses", icon:"", label:"Local Businesses" },
    { page:"favorites",  icon:"", label:"Saved ("+favCount+")" },
    { page:"about",      icon:"", label:"About Us" },
    { page:"admin",      icon:"🔐", label:"Admin" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(80,40,10,0.35)", zIndex:900, backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:"280px", background:T.bgCard, borderRight:"1px solid "+T.border, zIndex:901, display:"flex", flexDirection:"column", animation:"slideIn 0.22s ease", boxShadow:"4px 0 32px "+T.shadow }}>
        <style>{"@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}"}</style>
        <div style={{ padding:"1.25rem", borderBottom:"1px solid "+T.border, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f8f8f8" }}>
          <div>
            <div style={{ fontFamily:"'Fraunces',serif", color:T.accent, fontWeight:900, fontSize:"1.1rem" }}>
              The Sign Up Spot
            </div>
            <div style={{ color:T.textMuted, fontSize:"0.67rem", fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase", marginTop:"0.2rem" }}>
              Family Activity Hub
            </div>
          </div>
          <button onClick={onClose} style={{ background:T.bg, border:"1px solid "+T.border, color:T.textSoft, width:"30px", height:"30px", borderRadius:"50%", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {user && (
          <div style={{ padding:"0.9rem 1.25rem", borderBottom:"1px solid "+T.border, background:T.accentBg, display:"flex", alignItems:"center", gap:"0.65rem" }}>
            <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.95rem", flexShrink:0 }}>
              {user.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color:T.text, fontWeight:600, fontSize:"0.85rem" }}>Hi, {user}!</div>
              <div style={{ color:T.textSoft, fontSize:"0.72rem" }}>Family account</div>
            </div>
          </div>
        )}
        <nav style={{ flex:1, padding:"0.65rem 0", overflowY:"auto" }}>
          {navItems.map(({ page, icon, label }) => (
            <button key={page} onClick={() => { onNavigate(page); onClose(); }}
              style={{ width:"100%", background: currentPage === page ? T.accentBg : "transparent", border:"none", borderLeft:"3px solid "+(currentPage === page ? T.accent : "transparent"), color: currentPage === page ? T.accent : T.textMid, padding:"0.85rem 1.25rem", textAlign:"left", cursor:"pointer", fontSize:"0.88rem", fontWeight: currentPage === page ? 700 : 400, display:"flex", alignItems:"center", gap:"0.75rem", transition:"all 0.15s", fontFamily:"inherit" }}
              onMouseEnter={e => { if (currentPage !== page) e.currentTarget.style.background = T.bgDeep; }}
              onMouseLeave={e => { if (currentPage !== page) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize:"1rem" }}>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"1rem 1.25rem", borderTop:"1px solid "+T.border }}>
          {/* Kids switcher */}
          {kids && kids.length > 0 && (
            <div style={{ marginBottom:"0.75rem" }}>
              <div style={{ color:T.textMuted, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"0.4rem" }}>Saving for</div>
              <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap" }}>
                {kids.map(kid => (
                  <button key={kid.id} onClick={() => setActiveKidId(kid.id)}
                    style={{ background: activeKidId===kid.id ? kid.color : T.bgDeep, color: activeKidId===kid.id ? "#fff" : T.textMid, border:"1px solid "+(activeKidId===kid.id ? kid.color : T.border), borderRadius:"99px", padding:"0.3rem 0.75rem", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {kid.name}
                  </button>
                ))}
                <button onClick={() => { onOpenKidsManager(); onClose(); }}
                  style={{ background:"none", border:"1px dashed "+T.border, color:T.textMuted, borderRadius:"99px", padding:"0.3rem 0.65rem", fontSize:"0.75rem", cursor:"pointer", fontFamily:"inherit" }}>+ kid</button>
              </div>
            </div>
          )}
          {!user ? (
            <button onClick={() => { onOpenAuth(); onClose(); }}
              style={{ width:"100%", color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.65rem", fontSize:"0.85rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 3px 14px "+T.shadow, background:"#f8f8f8"}}>
              Sign In / Create Account
            </button>
          ) : (
            <button style={{ width:"100%", background:T.bgDeep, color:T.textSoft, border:"1px solid "+T.border, borderRadius:"99px", padding:"0.65rem", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function TheSignUpSpot() {
  const [page, setPage] = useState("home");
  const [pageProps, setPageProps] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [favorites, setFavorites] = useState(new Map());
  const [user, setUser] = useState(null);
  // Kids profiles — each kid has a name + their own saved activities
  const [kids, setKids] = useState([{ id:"k1", name:"My Child", color:T.accent }]);
  const [activeKidId, setActiveKidId] = useState("k1");
  const [kidSaves, setKidSaves] = useState({ k1: new Map() }); // kidId -> Map(activityId -> place)
  const [kidsManagerOpen, setKidsManagerOpen] = useState(false);
  const [calendarPlace, setCalendarPlace] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sss_events") || "[]"); } catch(e) { return []; }
  });

  function addCalendarEvent(ev) {
    const updated = [...calendarEvents, ev];
    setCalendarEvents(updated);
    try { localStorage.setItem("sss_events", JSON.stringify(updated)); } catch(e) {}
  }

  function navigate(pg, props) { setPage(pg); setPageProps(props || {}); }
  function toggleFav(id, place) {
    setFavorites(f => {
      const n = new Map(f);
      if (n.has(id)) n.delete(id); else if (place) n.set(id, place);
      return n;
    });
  }

  function toggleKidFav(kidId, activityId, place) {
    setKidSaves(prev => {
      const kidMap = new Map(prev[kidId] || []);
      if (kidMap.has(activityId)) kidMap.delete(activityId);
      else if (place) kidMap.set(activityId, place);
      return { ...prev, [kidId]: kidMap };
    });
  }

  function addKid(name, color) {
    const id = "k" + Date.now();
    setKids(prev => [...prev, { id, name, color }]);
    setKidSaves(prev => ({ ...prev, [id]: new Map() }));
    setActiveKidId(id);
  }

  function removeKid(id) {
    setKids(prev => prev.filter(k => k.id !== id));
    setKidSaves(prev => { const n = {...prev}; delete n[id]; return n; });
    setActiveKidId(k => k === id ? (kids.find(k2 => k2.id !== id)?.id || "k1") : k);
  }

  function renameKid(id, name) {
    setKids(prev => prev.map(k => k.id === id ? {...k, name} : k));
  }

  const favSet = new Set(favorites.keys());
  const favPlaces = [...favorites.values()];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:T.text }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:"+T.bgDeep+";}::-webkit-scrollbar-thumb{background:"+T.borderMid+";border-radius:3px;}input,select,textarea{outline:none;font-family:inherit;color:"+T.text+";}input::placeholder,textarea::placeholder{color:"+T.textMuted+";}select option{background:"+T.bgCard+";}"}</style>

      {/* Nav — centered logo row + links row */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid "+T.border, boxShadow:"0 2px 12px "+T.shadow }}>
        {/* Top row: hamburger | centered logo | actions */}
        <div style={{ display:"flex", alignItems:"center", padding:"0 1.25rem", height:"52px", gap:"0.75rem", position:"relative" }}>
          <button onClick={() => setMenuOpen(true)}
            style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, width:"34px", height:"34px", borderRadius:"8px", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>☰</button>
          {/* Centered logo */}
          <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", display:"flex", justifyContent:"center" }}>
            <button onClick={() => navigate("home")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <div style={{ fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:"1.6rem", lineHeight:1, background:"linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", letterSpacing:"-0.5px" }}>thesignupspot</div>
              <div style={{ color:T.textMuted, fontSize:"0.6rem", fontWeight:600, letterSpacing:"2px", textTransform:"uppercase", textAlign:"center", marginTop:"2px" }}>
                All their activities. One spot.
              </div>
            </button>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
          {/* Active kid chip */}
          {kids.length > 0 && (
            <button onClick={() => setKidsManagerOpen(true)}
              style={{ background: kids.find(k=>k.id===activeKidId)?.color+"22" || T.bgDeep, border:"1px solid "+(kids.find(k=>k.id===activeKidId)?.color||T.border)+"55", borderRadius:"99px", padding:"0.28rem 0.7rem", fontSize:"0.75rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"0.35rem", fontFamily:"inherit", color:T.textMid }}>
              <span style={{ width:"18px", height:"18px", borderRadius:"50%", background:kids.find(k=>k.id===activeKidId)?.color||T.accent, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700 }}>
                {(kids.find(k=>k.id===activeKidId)?.name||"K").charAt(0).toUpperCase()}
              </span>
              {kids.find(k=>k.id===activeKidId)?.name||"Kid"}
            </button>
          )}
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer" }}
              onClick={() => setMenuOpen(true)}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"0.85rem" }}>{user.charAt(0).toUpperCase()}</div>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)}
              style={{                 color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.35rem 0.9rem", fontSize:"0.75rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 10px "+T.shadow, background:"#f8f8f8"}}>
              Sign In
            </button>
          )}
          </div>
        </div>
        {/* Bottom row: page nav links */}
        <div style={{ display:"flex", justifyContent:"center", gap:"0.25rem", borderTop:"1px solid "+T.border+"88", padding:"0 1rem 0" }}>
          {[{p:"home",l:"Home"},{p:"browse",l:"Browse"},{p:"businesses",l:"Businesses"},{p:"favorites",l:"Saved"+(favSet.size>0?" ("+favSet.size+")":"")},{p:"about",l:"About"}].map(({p,l}) => (
            <button key={p} onClick={() => navigate(p)}
              style={{ background:"none", border:"none", color: page===p ? T.accent : T.textSoft, fontWeight: page===p ? 700 : 400, padding:"0.4rem 0.7rem", fontSize:"0.76rem", cursor:"pointer", fontFamily:"inherit", borderBottom: page===p ? "2px solid #c084c0" : "2px solid transparent", transition:"all 0.15s" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ minHeight:"calc(100vh - 108px)" }}>
        {page === "home"       && <HomePage onNavigate={navigate} onOpenAuth={() => setAuthOpen(true)}/>}
        {page === "browse"     && <BrowsePage initialCategory={pageProps.category}
                                   favorites={favSet} onToggleFav={toggleFav}
                                   kids={kids} activeKidId={activeKidId}
                                   kidSaves={kidSaves} onToggleKidFav={toggleKidFav}
                                   user={user} onOpenAuth={() => setAuthOpen(true)}
                                   onAddToCalendarPrompt={setCalendarPlace}/>}
        {page === "favorites"  && <FavoritesPage favPlaces={favPlaces}
                                   favorites={favSet} onToggleFav={toggleFav}
                                   kids={kids} activeKidId={activeKidId}
                                   setActiveKidId={setActiveKidId}
                                   kidSaves={kidSaves} onToggleKidFav={toggleKidFav}
                                   onOpenKidsManager={() => setKidsManagerOpen(true)}
                                   user={user} onOpenAuth={() => setAuthOpen(true)}
                                   calendarEvents={calendarEvents} onAddCalendarEvent={addCalendarEvent}/>}
        {page === "businesses" && <BusinessesPage/>}
        {page === "about"      && <AboutPage/>}
        {page === "admin"      && <AdminPage/>}
      </div>

      <div style={{ background:"#f8f8f8", borderTop:"1px solid "+T.border, padding:"2rem 1.5rem" }}>
        <div style={{ maxWidth:"900px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <div style={{ fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:"1.1rem", background:"linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", letterSpacing:"-0.5px", marginBottom:"0.25rem" }}>
              thesignupspot
            </div>
            <div style={{ color:T.textMuted, fontSize:"0.75rem" }}>
              © 2025 Lilibelle LLC · All their activities. One spot.
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {[["Home","home"],["Browse","browse"],["Businesses","businesses"],["Saved","favorites"],["About","about"],["Admin","admin"]].map(([l,p]) => (
              <button key={p} onClick={() => navigate(p)}
                style={{ background:"none", border:"none", color:T.textSoft, cursor:"pointer", fontSize:"0.8rem", fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {menuOpen && <HamburgerMenu currentPage={page} onNavigate={navigate}
        onClose={() => setMenuOpen(false)} favCount={favSet.size}
        onOpenAuth={() => setAuthOpen(true)} user={user}
        kids={kids} activeKidId={activeKidId} setActiveKidId={setActiveKidId}
        onOpenKidsManager={() => setKidsManagerOpen(true)}/>}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)}
        onSignIn={name => setUser(name)}/>}
      {kidsManagerOpen && <KidsManager
        kids={kids} activeKidId={activeKidId} setActiveKidId={setActiveKidId}
        addKid={addKid} removeKid={removeKid} renameKid={renameKid}
        kidSaves={kidSaves} onClose={() => setKidsManagerOpen(false)}/>}
      {calendarPlace && <AddToCalendarModal
        place={calendarPlace} kids={kids} user={user}
        onOpenAuth={() => { setCalendarPlace(null); setAuthOpen(true); }}
        onClose={() => setCalendarPlace(null)}
        onSaveEvent={addCalendarEvent}/>}
    </div>
  );
}
