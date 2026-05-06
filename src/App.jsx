import { useState, useCallback } from "react";

const T = {
  bg:"#fdf6ee",        // warm cream
  bgCard:"#fff9f2",    // soft butter white
  bgDeep:"#f5e8d5",    // warm caramel linen
  bgInput:"#fefaf4",
  border:"#e8d5b8",
  borderMid:"#d4b896",
  text:"#2e1a08",      // deep espresso
  textMid:"#6b3e1e",   // warm chestnut
  textSoft:"#9c6840",  // warm sienna
  textMuted:"#c49a6c", // warm caramel
  accent:"#b5601a",    // warm burnt sienna
  accentAlt:"#c97c35", // amber
  accentSoft:"#e4aa70",
  accentBg:"#fdf0e0",
  highlight:"#8b3e10", // deep terracotta
  gold:"#c09040",      // warm antique gold
  goldBg:"#fdf5dc",
  shadow:"rgba(80,40,10,0.10)",
};







const CATEGORIES = [
  { label:"Sports",     icon:"⚽", color:"#b5601a", bg:"#fdf0e2" },
  { label:"Arts",       icon:"🎨", color:"#c07820", bg:"#fef5e0" },
  { label:"Music",      icon:"🎵", color:"#8b5e30", bg:"#faeee0" },
  { label:"Dance",      icon:"🩰", color:"#b04040", bg:"#fdeee8" },
  { label:"STEM",       icon:"🔬", color:"#5a7840", bg:"#eef4e8" },
  { label:"Outdoors",   icon:"🌲", color:"#6a7030", bg:"#f2f0e0" },
  { label:"Theater",    icon:"🎭", color:"#904828", bg:"#fdeee5" },
  { label:"Tutoring",   icon:"📚", color:"#7a5020", bg:"#f8ede0" },
  { label:"Mommy & Me", icon:"🤱", color:"#a04060", bg:"#fdeaee" },
];


function getCatMeta(label) {
  return CATEGORIES.find(c => c.label === label) || { icon:"🎯", color:T.accent, bg:T.accentBg };
}

// ── Claude-powered search via Anthropic API ──────────────────────────────────

// ── Activity seed data ────────────────────────────────────────────────────────
const SEED_ACTIVITIES = [
  { id:"a1",  name:"Champions Soccer Academy",       category:"Sports",     address:"245 Field Ave, Brooklyn, NY 11201",        phone:"(718) 555-0101", website:"https://championssoccer.com",      rating:4.8, reviewCount:213, price:"$$",  description:"Year-round youth soccer training for ages 4-18. Recreational leagues and competitive travel teams with UEFA-certified coaches.", hours:"Mon-Sat 9am-7pm", ageRange:"4-18", tags:["outdoor","team","year-round"], activityType:"competitive" },
  { id:"a2",  name:"Little Maestros Music School",   category:"Music",      address:"88 Melody Lane, Brooklyn, NY 11215",        phone:"(718) 555-0202", website:"https://littlemaestros.com",       rating:4.9, reviewCount:187, price:"$$$", description:"Private and group lessons in piano, violin, guitar, and voice for children ages 3 and up. Two recitals per year.", hours:"Mon-Sat 10am-7pm", ageRange:"3-17", tags:["indoor","individual","year-round"], activityType:"recreational" },
  { id:"a3",  name:"Pixel & Paint Art Studio",       category:"Arts",       address:"512 Creative Blvd, Manhattan, NY 10012",    phone:"(212) 555-0303", website:"https://pixelandpaint.com",       rating:4.7, reviewCount:142, price:"$$",  description:"Painting, sculpture, and mixed-media art classes for kids in a nurturing studio environment. All materials included.", hours:"Tue-Sun 10am-6pm", ageRange:"4-14", tags:["indoor","creative","year-round"], activityType:"recreational" },
  { id:"a4",  name:"Brooklyn Dance Center",           category:"Dance",      address:"320 Rhythm St, Brooklyn, NY 11217",         phone:"(718) 555-0404", website:"https://brooklyndance.com",       rating:4.6, reviewCount:298, price:"$$",  description:"Ballet, tap, hip-hop, and contemporary dance for ages 2-18. Spring showcase and holiday performances throughout the year.", hours:"Mon-Sat 9am-8pm", ageRange:"2-18", tags:["indoor","performance","year-round"], activityType:"recreational" },
  { id:"a5",  name:"RoboKids STEM Lab",               category:"STEM",       address:"77 Circuit Dr, Queens, NY 11374",           phone:"(718) 555-0505", website:"https://robokids.com",            rating:4.9, reviewCount:94,  price:"$$$", description:"Hands-on robotics, coding, and engineering for ages 6-16. Kids build and program real robots and apps to take home.", hours:"Tue-Sun 10am-6pm", ageRange:"6-16", tags:["indoor","creative","year-round"], activityType:"recreational" },
  { id:"a6",  name:"Trailblazers Outdoor Camp",       category:"Outdoors",   address:"1 Camp Rd, Hoboken, NJ 07030",              phone:"(201) 555-0606", website:"https://trailblazersnj.com",      rating:4.8, reviewCount:167, price:"$$",  description:"Summer day camp featuring hiking, kayaking, rock climbing, and nature science. Half-day and full-day options available.", hours:"Summer: Mon-Fri 8am-5pm", ageRange:"5-15", tags:["outdoor","nature","summer"], activityType:"recreational" },
  { id:"a7",  name:"Stage Lights Theater Camp",       category:"Theater",    address:"190 Broadway Ave, Manhattan, NY 10013",     phone:"(212) 555-0707", website:"https://stagelights.com",        rating:4.9, reviewCount:156, price:"$$$", description:"Full musical productions with professional direction, costumes, and live accompaniment. Builds confidence and performance skills.", hours:"Mon-Fri 9am-4pm", ageRange:"7-16", tags:["indoor","performance","summer"], activityType:"recreational" },
  { id:"a8",  name:"Bright Futures Tutoring",         category:"Tutoring",   address:"400 Scholar Way, Bronx, NY 10451",          phone:"(718) 555-0808", website:"https://brightfuturestutoring.com", rating:4.7, reviewCount:321, price:"$$", description:"Personalized academic support in math, reading, science, and test prep. Small group and one-on-one sessions for K-12.", hours:"Mon-Sat 9am-7pm", ageRange:"5-18", tags:["indoor","individual","year-round"], activityType:"recreational" },
  { id:"a9",  name:"Elite Gymnastics Center",         category:"Sports",     address:"88 Tumble Dr, Staten Island, NY 10301",     phone:"(718) 555-0909", website:"https://elitegymnastics.com",     rating:4.5, reviewCount:112, price:"$$$", description:"USAG-sanctioned gym offering recreational and competitive gymnastics for ages 3-18. Olympic-trained coaching staff.", hours:"Mon-Sat 9am-7pm", ageRange:"3-18", tags:["indoor","individual","year-round"], activityType:"competitive" },
  { id:"a10", name:"Harmony Swim Academy",            category:"Sports",     address:"55 Aqua Blvd, Queens, NY 11101",            phone:"(718) 555-1010", website:"https://harmonyswim.com",        rating:4.6, reviewCount:88,  price:"$$",  description:"Year-round swim lessons for all levels, from beginner to competitive. Heated indoor pool with certified instructors.", hours:"Daily 7am-8pm", ageRange:"2-18", tags:["indoor","individual","year-round"], activityType:"competitive" },
  { id:"a11", name:"Creative Kids Art Workshop",      category:"Arts",       address:"230 Palette Ave, Astoria, NY 11102",        phone:"(718) 555-1111", website:"https://creativekidsart.com",    rating:4.8, reviewCount:176, price:"$",   description:"Affordable and fun art workshops covering drawing, watercolor, and clay. Drop-in sessions and monthly memberships available.", hours:"Wed-Sun 10am-5pm", ageRange:"3-12", tags:["indoor","creative","year-round"], activityType:"recreational" },
  { id:"a12", name:"Code Wizards Academy",            category:"STEM",       address:"15 Binary Blvd, Manhattan, NY 10003",       phone:"(212) 555-1212", website:"https://codewizards.com",       rating:4.8, reviewCount:78,  price:"$$",  description:"Game design, app development, and web coding taught through fun project-based learning for ages 7-16.", hours:"Mon-Sat 10am-6pm", ageRange:"7-16", tags:["indoor","creative","year-round"], activityType:"recreational" },
  { id:"a13", name:"Nature Cubs Outdoor School",      category:"Outdoors",   address:"300 Greenway Rd, Brooklyn, NY 11215",       phone:"(718) 555-1313", website:"https://naturecubs.com",        rating:4.7, reviewCount:91,  price:"$$",  description:"Year-round nature exploration, wildlife tracking, and environmental science for young adventurers. Screen-free guaranteed.", hours:"Sat-Sun 9am-3pm", ageRange:"4-12", tags:["outdoor","nature","year-round"], activityType:"recreational" },
  { id:"a14", name:"Kick It Martial Arts",            category:"Sports",     address:"175 Warrior Way, Brooklyn, NY 11220",       phone:"(718) 555-1414", website:"https://kickitmartialarts.com",  rating:4.6, reviewCount:203, price:"$$",  description:"Traditional karate and judo building discipline, focus, and fitness. Belt progression program with monthly evaluations.", hours:"Mon-Sat 9am-8pm", ageRange:"4-17", tags:["indoor","individual","year-round"], activityType:"competitive" },
  { id:"a15", name:"Spotlight Dance Studio",          category:"Dance",      address:"60 Pirouette Lane, Brooklyn, NY 11215",     phone:"(718) 555-1515", website:"https://spotlightdance.com",    rating:4.9, reviewCount:228, price:"$$",  description:"Ballet, jazz, tap, and hip-hop dance in a welcoming studio. Annual spring recital at a professional venue.", hours:"Mon-Sat 9am-7pm", ageRange:"2-18", tags:["indoor","performance","year-round"], activityType:"recreational" },
  { id:"a16", name:"Young Actors Workshop",           category:"Theater",    address:"44 Stage St, Williamsburg, NY 11211",       phone:"(718) 555-1616", website:"https://youngactors.com",       rating:4.7, reviewCount:119, price:"$$",  description:"Acting, improv, and scene-study classes for kids and teens. Culminates in a full public performance each semester.", hours:"Sat-Sun 10am-4pm", ageRange:"6-17", tags:["indoor","performance","year-round"], activityType:"recreational" },
  { id:"a17", name:"Math Olympians Tutoring",         category:"Tutoring",   address:"222 Scholar Blvd, Forest Hills, NY 11375",  phone:"(718) 555-1717", website:"https://matholympians.com",     rating:4.8, reviewCount:145, price:"$$",  description:"Specialized math tutoring and enrichment from arithmetic through calculus. Competition prep for AMC and MathCounts.", hours:"Mon-Fri 3pm-8pm, Sat 9am-5pm", ageRange:"6-18", tags:["indoor","individual","year-round"], activityType:"recreational" },
  { id:"a18", name:"Sprouts Baseball League",         category:"Sports",     address:"88 Diamond Ave, Flushing, NY 11355",        phone:"(718) 555-1818", website:"https://sproutsbaseball.com",   rating:4.5, reviewCount:167, price:"$",   description:"Community baseball and softball leagues for all skill levels. Season runs spring through fall with weekend games.", hours:"Spring-Fall weekends", ageRange:"5-16", tags:["outdoor","team","seasonal"], activityType:"competitive" },
  { id:"a19", name:"Tiny Tots Music & Movement",      category:"Music",      address:"10 Nursery Rd, Brooklyn, NY 11215",         phone:"(718) 555-1919", website:"https://tinytots.com",          rating:4.9, reviewCount:312, price:"$",   description:"Music and movement classes for babies, toddlers, and preschoolers. Builds rhythm, coordination, and early musical skills.", hours:"Mon-Fri 9am-12pm", ageRange:"0-5", tags:["indoor","group","year-round"], activityType:"recreational" },
  { id:"a20", name:"Adventure Rock Climbing Gym",     category:"Outdoors",   address:"500 Summit St, Long Island City, NY 11101", phone:"(718) 555-2020", website:"https://adventurerock.com",     rating:4.7, reviewCount:134, price:"$$",  description:"Indoor climbing gym with classes and open climb for kids and families. Birthday parties and group events welcome.", hours:"Mon-Fri 3pm-9pm, Sat-Sun 9am-7pm", ageRange:"4-17", tags:["indoor","individual","year-round"], activityType:"recreational" },
  { id:"a21", name:"Mommy & Me Playhouse",            category:"Mommy & Me", address:"14 Blossom St, Park Slope, NY 11215",       phone:"(718) 555-2121", website:"https://mommymeplayhouse.com",  rating:4.9, reviewCount:278, price:"$",   description:"Structured play classes for babies and toddlers ages 0-3 with their caregivers. Music, movement, sensory play, and social time.", hours:"Mon-Fri 9am-12pm", ageRange:"0-3", tags:["indoor","group","year-round"], activityType:"recreational" },
  { id:"a22", name:"Tiny Steps Parent & Child Yoga",  category:"Mommy & Me", address:"88 Zen Lane, Cobble Hill, NY 11201",        phone:"(718) 555-2222", website:"https://tinystepsyoga.com",     rating:4.8, reviewCount:142, price:"$$",  description:"Gentle yoga and mindfulness sessions for parents and babies or toddlers. Promotes bonding, development, and caregiver wellbeing.", hours:"Tue-Thu 9am-11am, Sat 9am-12pm", ageRange:"0-4", tags:["indoor","wellness","year-round"], activityType:"recreational" },
  { id:"a23", name:"Little Learners Music Together",  category:"Mommy & Me", address:"55 Harmony Ave, Astoria, NY 11102",         phone:"(718) 555-2323", website:"https://littlelearners.com",    rating:4.9, reviewCount:203, price:"$",   description:"Award-winning Music Together program for children birth through age 5 and their grown-ups. Singing, dancing, and instrument exploration.", hours:"Mon-Sat various", ageRange:"0-5", tags:["indoor","music","year-round"], activityType:"recreational" },
];

async function searchActivitiesWithClaude(zip, radiusMiles, category, keyword) {
  await new Promise(r => setTimeout(r, 400));
  let results = [...SEED_ACTIVITIES];
  if (category) results = results.filter(a => a.category === category);
  if (keyword && keyword.trim()) {
    const q = keyword.trim().toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (results.length === 0) throw new Error("No activities found. Try a different category or keyword.");
  return results;
}




// ── Shared UI ────────────────────────────────────────────────────────────────
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
function DetailModal({ place, favorites, onToggleFav, onClose }) {
  const cat = getCatMeta(place.category);
  const isFav = favorites.has(place.id);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
    const [reviewDone, setReviewDone] = useState(false);
  const [reviewSubmitting] = useState(false);


  function handleSubmitReview() {
    if (!reviewAuthor.trim() || !reviewRating || !reviewText.trim()) return;
    setReviewDone(true);
    setReviews(prev => [{ author: reviewAuthor, rating: reviewRating, text: reviewText, created_at: new Date().toISOString() }, ...prev]);
  }
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(80,40,10,0.50)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", backdropFilter:"blur(6px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"22px", maxWidth:"560px", width:"100%", maxHeight:"90vh", overflowY:"auto", position:"relative", boxShadow:"0 28px 56px "+T.shadow }}>

        {/* Header */}
        <div style={{ background:cat.bg, padding:"2rem 1.5rem 1.25rem", borderRadius:"22px 22px 0 0", textAlign:"center" }}>
          <span style={{ fontSize:"3rem" }}>{cat.icon}</span>
          <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1.3rem", marginTop:"0.5rem", lineHeight:1.2 }}>{place.name}</h2>
          <span style={{ background:cat.color+"22", color:cat.color, fontSize:"0.68rem", fontWeight:700, padding:"2px 10px", borderRadius:"99px", border:"1px solid "+cat.color+"44" }}>{cat.icon} {place.category}</span>
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

          {/* Description */}
          <p style={{ color:T.textSoft, fontSize:"0.85rem", lineHeight:1.7, marginBottom:"1.25rem" }}>{place.description}</p>

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
                <span>🌐</span>
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
              {isFav ? "♥ Saved" : "♡ Save"}
            </button>
            {place.website ? (
              <a href={place.website} target="_blank" rel="noreferrer"
                style={{ flex:1, background:"linear-gradient(135deg,"+T.accent+","+T.accentAlt+")", color:"#fff", borderRadius:"99px", padding:"0.65rem 1rem", fontSize:"0.85rem", textDecoration:"none", fontWeight:700, textAlign:"center", display:"block" }}>
                Visit Website →
              </a>
            ) : (
              <a href={"https://www.google.com/search?q="+encodeURIComponent(place.name+" "+place.address)}
                target="_blank" rel="noreferrer"
                style={{ flex:1,                   color:"#2e1a08", borderRadius:"99px", padding:"0.65rem 1rem", fontSize:"0.85rem", textDecoration:"none", fontWeight:800, textAlign:"center", display:"block", background:"#f5e8d5"}}>
                Search on Google →
              </a>
            )}
          </div>

          {/* Reviews */}
          <div style={{ borderTop:"1px solid "+T.border, paddingTop:"1.25rem" }}>
            <h3 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"1rem", marginBottom:"0.85rem" }}>
              Reviews {reviews.length > 0 && <span style={{ color:T.textMuted, fontSize:"0.8rem", fontWeight:400 }}>({reviews.length})</span>}
            </h3>

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
function ActivityCard({ place, favorites, onToggleFav, onSelect, kids, activeKidId, kidSaves, onToggleKidFav }) {
  const cat = getCatMeta(place.category);
  const isFav = favorites.has(place.id);
  return (
    <div onClick={() => onSelect(place)}
      style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"18px", overflow:"hidden", transition:"transform 0.2s,box-shadow 0.2s", position:"relative", boxShadow:"0 2px 12px "+T.shadow, cursor:"pointer" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 18px 36px "+T.shadow; }}
      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px "+T.shadow; }}>

      {/* Color header band */}
      <div style={{ width:"100%", height:"70px", background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem" }}>
        {cat.icon}
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
          {cat.icon} {place.category}{place.ageRange ? " · Ages "+place.ageRange : ""}
        </div>

        {place.address && (
          <div style={{ color:T.textSoft, fontSize:"0.74rem", marginBottom:"0.5rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            📍 {place.address}
          </div>
        )}

        <p style={{ color:T.textSoft, fontSize:"0.78rem", lineHeight:1.5, marginBottom:"0.65rem", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{place.description}</p>

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
    <div style={{ background:"#f5e8d5", padding:"2.25rem 1.5rem", textAlign:"center", position:"relative", overflow:"hidden" }}>
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
          <div style={{ display:"flex", gap:"0.5rem", maxWidth:"380px", margin:"0 auto", flexWrap:"wrap", justifyContent:"center" }}>
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
              style={{ background:"#f5e8d5", color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.6rem 1.4rem", fontSize:"0.85rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
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
                style={{ width:"100%", background:T.bgDeep, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.65rem", fontSize:"0.85rem", color:T.textMid, fontFamily:"inherit", fontWeight:600, cursor:"pointer", marginBottom:"0.5rem" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                {label === "Google" ? "🔵" : "🍎"}  Continue with {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Browse Page ───────────────────────────────────────────────────────────────
function BrowsePage({ initialCategory, favorites, onToggleFav, kids, activeKidId, kidSaves, onToggleKidFav }) {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState(initialCategory || "");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const doSearch = useCallback(async () => {
    const z = zip.trim();
    if (z.length < 5) { setError("Please enter a valid 5-digit ZIP code."); return; }
    setError(""); setLoading(true); setHasSearched(true); setResults([]);
    try {
      setLoadingMsg("Searching for activities near " + z + "…");
      const data = await searchActivitiesWithClaude(z, radius, category, search.trim());
      // Add unique IDs if missing
      const normalized = data.map((p, i) => ({ ...p, id: p.id || (p.name + i).replace(/\s/g,"_") }));
      setResults(normalized);
      if (normalized.length === 0) setError("No activities found near " + z + ". Try a larger radius.");
    } catch(e) {
      setError(e.message || "Search failed. Please try again.");
    }
    setLoading(false); setLoadingMsg("");
  }, [zip, radius, category, search]);

  const selBtn = active => ({
    background: active ? "linear-gradient(135deg,"+T.accent+","+T.accentAlt+")" : "transparent",
    color: active ? "#fff" : T.textSoft,
    border: "1px solid "+(active ? "transparent" : T.border),
    borderRadius:"99px", padding:"0.3rem 0.9rem", fontSize:"0.75rem",
    fontWeight:600, cursor:"pointer", fontFamily:"inherit",
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
            style={{               color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.62rem 1.6rem", fontSize:"0.87rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", boxShadow:"0 3px 14px "+T.shadow, background:"#f5e8d5"}}>
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
              {c.icon} {c.label}
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
            <div style={{ marginBottom:"1rem" }}>
              <span style={{ color:T.textSoft, fontSize:"0.83rem" }}>
                <span style={{ color:T.accent, fontWeight:700 }}>{results.length}</span> activities found near {zip}
              </span>
            </div>
            {viewMode === "list" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                {results.map(p => {
                  const cat = getCatMeta(p.category);
                  return (
                    <div key={p.id} onClick={() => setSelectedPlace(p)}
                      style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"12px", padding:"0.9rem 1.1rem", display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap", cursor:"pointer", boxShadow:"0 2px 8px "+T.shadow }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                      <span style={{ fontSize:"1.8rem", background:cat.bg, padding:"0.45rem", borderRadius:"10px", flexShrink:0 }}>{cat.icon}</span>
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
                {results.map(p => (
                  <ActivityCard key={p.id} place={p} favorites={favorites}
                    onToggleFav={onToggleFav} onSelect={setSelectedPlace}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPlace && (
        <DetailModal place={selectedPlace} favorites={favorites}
          onToggleFav={onToggleFav} onClose={() => setSelectedPlace(null)}/>
      )}
    </div>
  );
}


// ── Favorites Page ────────────────────────────────────────────────────────────
function FavoritesPage({ favPlaces, favorites, onToggleFav, kids, activeKidId, setActiveKidId, kidSaves, onToggleKidFav, onOpenKidsManager }) {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [tab, setTab] = useState("all"); // "all" | kidId

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
          ♥ All Saved ({favPlaces.length})
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

      {displayPlaces.length === 0 ? (
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
      {selectedPlace && <DetailModal place={selectedPlace} favorites={favorites} onToggleFav={onToggleFav} onClose={() => setSelectedPlace(null)}/>}
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onNavigate, onOpenAuth }) {
  return (
    <div>
      <div style={{         padding:"3.5rem 1.5rem 2.5rem", textAlign:"center", borderBottom:"1px solid "+T.border, position:"relative", overflow:"hidden", background:"#fdf6ee"}}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse at 20% 80%, rgba(255,180,220,0.25) 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(160,180,255,0.2) 0%, transparent 45%)", pointerEvents:"none" }}/>
        <div style={{ position:"relative" }}>
          <span style={{ background:"#f5e8d5", border:"none", color:"#2e1a08", fontSize:"0.72rem", fontWeight:800, padding:"4px 16px", borderRadius:"99px", textTransform:"uppercase", letterSpacing:"2px", boxShadow:"0 2px 12px "+T.shadow }}>Your Family Activity Hub</span>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:"clamp(2.2rem,5.5vw,3.6rem)", fontWeight:900, lineHeight:1.08, margin:"1rem 0", color:T.text }}>
            Find Their Next<br/>
            <span style={{ background:"linear-gradient(135deg, #b5601a 0%, #c07820 35%, #8b3e10 70%, #6b2e08 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Favorite Activity</span>
          </h1>
          <p style={{ color:T.textSoft, fontSize:"1.05rem", maxWidth:"460px", margin:"0 auto 2rem", lineHeight:1.75 }}>
            All their activities. One app.
          </p>
          <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => onNavigate("browse")}
              style={{                 color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.75rem 2rem", fontSize:"0.95rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px "+T.shadow, background:"#f5e8d5"}}>
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
              <span style={{ fontSize:"1.7rem" }}>{cat.icon}</span>
              <span style={{ color:cat.color, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"1px" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"2rem 1.5rem",         borderTop:"1px solid "+T.border, borderBottom:"1px solid "+T.border, background:"#fdf6ee"}}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"1.5rem", maxWidth:"660px", margin:"0 auto", textAlign:"center" }}>
          {[{n:"✦",l:"AI Powered Search",c:"#7a5c48"},{n:"9",l:"Categories",c:"#6a6058"},{n:"Any ZIP",l:"Nationwide",c:"#587068"},{n:"Free",l:"Always",c:"#8a6a40"}].map(s => (
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
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  const inp = { width:"100%", background:T.bgInput, border:"1.5px solid "+T.border, borderRadius:"10px", padding:"0.65rem 0.9rem", fontSize:"0.85rem", color:T.text, boxSizing:"border-box", fontFamily:"inherit", display:"block" };
  const lbl = { display:"block", color:T.textMid, fontSize:"0.75rem", fontWeight:700, marginBottom:"0.3rem", textTransform:"uppercase", letterSpacing:"0.8px" };

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    setTimeout(() => { setSubmitted(true); setLoading(false); }, 900);
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
                {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
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
      <div style={{ background:"#f5e8d5", borderRadius:"18px", padding:"2rem", textAlign:"center", marginTop:"1rem" }}>
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
    <div style={{ padding:"1.5rem", maxWidth:"720px", margin:"0 auto", background:T.bg, minHeight:"80vh" }}>
      <div style={{ textAlign:"center", padding:"2rem 0 2.5rem" }}>
        <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📋</div>
        <h2 style={{ fontFamily:"'Fraunces',serif", color:T.text, fontSize:"2rem", marginBottom:"0.75rem" }}>
          About The Sign Up Spot
        </h2>
        <p style={{ color:T.accent, fontSize:"1rem", fontStyle:"italic", fontFamily:"'Fraunces',serif" }}>
          Connecting families to amazing experiences
        </p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
        {[
          { icon:"💡", title:"Our Mission", text:"The Sign Up Spot was created by parents, for parents. We built this platform to bring local kids activities together in one trusted place." },
          { icon:"🤖", title:"AI-Powered Search", text:"Our search uses AI to find real local businesses and programs near any ZIP code — sports academies, arts classes, music schools, STEM camps, outdoor adventures, theater programs, and tutoring centers." },
          { icon:"🤝", title:"What We Do", text:"We help families discover, compare, and connect with local activity providers. Every result includes descriptions, ratings, contact info, and direct links to book or learn more." },
          { icon:"🔒", title:"Trust & Safety", text:"We are committed to showing you real, accurate information. We never accept payment to alter rankings or fabricate listings." },
          { icon:"📬", title:"Get in Touch", text:"Questions or want to feature your program? Reach us at hello@thesignupspot.com or follow us @thesignupspot." },
        ].map(s => (
          <div key={s.title} style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:"16px", padding:"1.3rem", display:"flex", gap:"1rem", alignItems:"flex-start", boxShadow:"0 2px 8px "+T.shadow }}>
            <span style={{ fontSize:"1.75rem", flexShrink:0 }}>{s.icon}</span>
            <div>
              <h3 style={{ color:T.text, fontFamily:"'Fraunces',serif", fontSize:"1.05rem", marginBottom:"0.45rem" }}>{s.title}</h3>
              <p style={{ color:T.textSoft, fontSize:"0.84rem", lineHeight:1.7 }}>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:"1.75rem" }}><NewsletterBanner/></div>
    </div>
  );
}

// ── Hamburger Menu ────────────────────────────────────────────────────────────
// ── Kid Profile Colors ────────────────────────────────────────────────────────
const KID_COLORS = ["#b5601a","#c07820","#904828","#b04040","#5a7840","#8b5e30","#a04060","#7a5020"];

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
            style={{ background:"#f5e8d5", color:"#2e1a08", border:"none", borderRadius:"10px", padding:"0.62rem 1rem", fontSize:"0.87rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", boxShadow:"0 2px 10px "+T.shadow }}>
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

function HamburgerMenu({ currentPage, onNavigate, onClose, favCount, onOpenAuth, user, kids, activeKidId, setActiveKidId, onOpenKidsManager }) {
  const navItems = [
    { page:"home",       icon:"🏠", label:"Home" },
    { page:"browse",     icon:"🔍", label:"Browse Activities" },
    { page:"businesses", icon:"🏢", label:"Local Businesses" },
    { page:"favorites",  icon:"♥",  label:"Saved ("+favCount+")" },
    { page:"about",      icon:"ℹ️", label:"About Us" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(80,40,10,0.35)", zIndex:900, backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:"280px", background:T.bgCard, borderRight:"1px solid "+T.border, zIndex:901, display:"flex", flexDirection:"column", animation:"slideIn 0.22s ease", boxShadow:"4px 0 32px "+T.shadow }}>
        <style>{"@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}"}</style>
        <div style={{ padding:"1.25rem", borderBottom:"1px solid "+T.border, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fdf6ee" }}>
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
              style={{ width:"100%", color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.65rem", fontSize:"0.85rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 3px 14px "+T.shadow, background:"#f5e8d5"}}>
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
        <div style={{ display:"flex", alignItems:"center", padding:"0 1.25rem", height:"52px", gap:"0.75rem" }}>
          <button onClick={() => setMenuOpen(true)}
            style={{ background:T.bgDeep, border:"1px solid "+T.border, color:T.textMid, width:"34px", height:"34px", borderRadius:"8px", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>☰</button>
          {/* Centered logo */}
          <div style={{ flex:1, display:"flex", justifyContent:"center", position:"relative" }}>
            <button onClick={() => navigate("home")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:"1.2rem", lineHeight:1, background:"linear-gradient(135deg, #b5601a 0%, #c07820 35%, #8b3e10 70%, #6b2e08 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                The Sign Up Spot
              </div>
              <div style={{ color:T.textMuted, fontSize:"0.6rem", fontWeight:600, letterSpacing:"2px", textTransform:"uppercase", textAlign:"center", marginTop:"1px" }}>
                Family Activity Hub
              </div>
            </button>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", marginLeft:"auto", alignItems:"center" }}>
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
              style={{                 color:"#2e1a08", border:"none", borderRadius:"99px", padding:"0.35rem 0.9rem", fontSize:"0.75rem", fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 10px "+T.shadow, background:"#f5e8d5"}}>
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
                                   kidSaves={kidSaves} onToggleKidFav={toggleKidFav}/>}
        {page === "favorites"  && <FavoritesPage favPlaces={favPlaces}
                                   favorites={favSet} onToggleFav={toggleFav}
                                   kids={kids} activeKidId={activeKidId}
                                   setActiveKidId={setActiveKidId}
                                   kidSaves={kidSaves} onToggleKidFav={toggleKidFav}
                                   onOpenKidsManager={() => setKidsManagerOpen(true)}/>}
        {page === "businesses" && <BusinessesPage/>}
        {page === "about"      && <AboutPage/>}
      </div>

      <div style={{ background:"#fdf6ee", borderTop:"1px solid "+T.border, padding:"2rem 1.5rem" }}>
        <div style={{ maxWidth:"900px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <div style={{ fontFamily:"'Fraunces',serif", color:T.accent, fontWeight:900, fontSize:"1.1rem", marginBottom:"0.25rem" }}>The Sign Up Spot</div>
            <div style={{ color:T.textMuted, fontSize:"0.75rem" }}>
              © 2026 · Connecting families to amazing experiences
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {[["Home","home"],["Browse","browse"],["Businesses","businesses"],["Saved","favorites"],["About","about"]].map(([l,p]) => (
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
    </div>
  );
}
