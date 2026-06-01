import { useState, useEffect, useRef } from "react";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  async get(key) {
    try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
  },
};

// ─── Seed users ───────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", username: "alex",   password: "hops123",  avatar: "🍺" },
  { id: "u2", username: "brenda", password: "malt456",  avatar: "🌾" },
  { id: "u3", username: "carlos", password: "yeast789", avatar: "🍻" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const starLabel = n => ["","★☆☆☆☆","★★☆☆☆","★★★☆☆","★★★★☆","★★★★★"][n] ?? "";
const avg = arr => arr.length ? (arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(1) : null;
const fmtDate = iso => new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

// Convert file to base64
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [me, setMe]               = useState(null);
  const [breweries, setBreweries] = useState([]);
  const [view, setView]           = useState("feed");
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await store.get("breweries");
      if (stored) setBreweries(stored);
      setLoading(false);
    })();
  }, []);

  const saveBreweries = async next => { setBreweries(next); await store.set("breweries", next); };

  if (loading) return <Splash />;
  if (!me) return <Login onLogin={setMe} />;

  return (
    <Shell me={me} view={view} setView={setView} onLogout={() => setMe(null)}>
      {view === "feed" && (
        <Feed breweries={breweries} me={me} onSelect={b=>{setSelected(b);setView("detail");}} />
      )}
      {view === "add" && (
        <AddBrewery me={me}
          onSave={b=>{const next=[b,...breweries];saveBreweries(next);setView("feed");}}
          onCancel={()=>setView("feed")} />
      )}
      {view === "detail" && selected && (
        <Detail
          brewery={breweries.find(b=>b.id===selected.id)||selected}
          me={me}
          onUpdate={updated=>{const next=breweries.map(b=>b.id===updated.id?updated:b);saveBreweries(next);setSelected(updated);}}
          onBack={()=>setView("feed")}
        />
      )}
    </Shell>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={css.splash}>
      <div style={css.splashIcon}>🍺</div>
      <p style={{color:"#c8a96e",fontFamily:"'Playfair Display',serif",fontSize:14}}>Loading…</p>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");

  const submit = () => {
    const found = SEED_USERS.find(u => u.username===user.trim().toLowerCase() && u.password===pass);
    if (found) { setErr(""); onLogin(found); }
    else setErr("Wrong username or password.");
  };

  return (
    <div style={css.loginWrap}>
      <div style={css.loginCard}>
        <div style={css.loginLogo}>🍺</div>
        <h1 style={css.loginTitle}>HopLog</h1>
        <p style={css.loginSub}>Your crew's brewery journal</p>
        <div style={css.field}>
          <label style={css.label}>Username</label>
          <input style={css.input} value={user} onChange={e=>setUser(e.target.value)} placeholder="alex" autoCapitalize="none" />
        </div>
        <div style={css.field}>
          <label style={css.label}>Password</label>
          <input style={css.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••" />
        </div>
        {err && <p style={css.err}>{err}</p>}
        <button style={css.btnPrimary} onClick={submit}>Sign In</button>
        <p style={css.hint}>Demo accounts: alex / hops123 · brenda / malt456 · carlos / yeast789</p>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell({ me, view, setView, onLogout, children }) {
  return (
    <div style={css.shell}>
      <header style={css.header}>
        <span style={css.headerLogo}>🍺 HopLog</span>
        <div style={css.headerRight}>
          <span style={css.avatar}>{me.avatar}</span>
          <span style={css.username}>{me.username}</span>
          <button style={css.logoutBtn} onClick={onLogout}>Out</button>
        </div>
      </header>
      <main style={css.main}>{children}</main>
      {(view === "feed" || view === "add") && (
        <nav style={css.nav}>
          <button style={{...css.navBtn,...(view==="feed"?css.navActive:{})}} onClick={()=>setView("feed")}>
            <span style={css.navIcon}>🗺</span><span style={css.navLabel}>Breweries</span>
          </button>
          <button style={css.fabBtn} onClick={()=>setView("add")}>＋</button>
          <button style={{...css.navBtn,opacity:.4}} disabled>
            <span style={css.navIcon}>📊</span><span style={css.navLabel}>Stats</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function Feed({ breweries, me, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = breweries.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={css.page}>
      <input style={css.search} placeholder="🔍 Search breweries…" value={search} onChange={e=>setSearch(e.target.value)} />
      {filtered.length === 0 && (
        <div style={css.empty}>
          <p style={{fontSize:48}}>🏭</p>
          <p style={{color:"#c8a96e"}}>No breweries yet.<br/>Tap ＋ to add one!</p>
        </div>
      )}
      {filtered.map(b => <BreweryCard key={b.id} brewery={b} me={me} onClick={()=>onSelect(b)} />)}
    </div>
  );
}

function BreweryCard({ brewery: b, me, onClick }) {
  const ratings = (b.beers||[]).flatMap(beer=>(beer.ratings||[]).map(r=>r.score));
  const overallAvg = avg(ratings);
  const checkedIn = (b.checkins||[]).some(c=>c.userId===me.id);
  const beerCount = (b.beers||[]).length;

  return (
    <div style={css.card} onClick={onClick}>
      {b.photo && (
        <img src={b.photo} alt={b.name}
          style={{width:"100%",height:140,objectFit:"cover",borderRadius:"8px 8px 0 0",margin:"-16px -16px 12px",width:"calc(100% + 32px)"}} />
      )}
      <div style={css.cardTop}>
        <div>
          <div style={css.cardName}>{b.name}</div>
          <div style={css.cardCity}>{[b.city,b.state].filter(Boolean).join(", ")}</div>
        </div>
        <div style={css.cardRight}>
          {overallAvg && <div style={css.cardRating}>⭐ {overallAvg}</div>}
          {checkedIn && <div style={css.checkedBadge}>✓ Visited</div>}
        </div>
      </div>
      <div style={css.cardMeta}>
        <span style={css.metaChip}>🍺 {beerCount} beer{beerCount!==1?"s":""}</span>
        <span style={css.metaChip}>👥 {(b.checkins||[]).length} check-in{(b.checkins||[]).length!==1?"s":""}</span>
        {b.style && <span style={css.metaChip}>🏷 {b.style}</span>}
        {b.lat && b.lng && <span style={css.metaChip}>📍 Has location</span>}
      </div>
    </div>
  );
}

// ─── Add Brewery ──────────────────────────────────────────────────────────────
function AddBrewery({ me, onSave, onCancel }) {
  const [form, setForm]     = useState({ name:"", city:"", state:"", style:"", notes:"" });
  const [photo, setPhoto]   = useState(null);
  const [locMode, setLocMode] = useState("manual"); // manual | gps
  const [lat, setLat]       = useState("");
  const [lng, setLng]       = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const fileRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const pickPhoto = async e => {
    const file = e.target.files[0];
    if (!file) return;
    // Resize/compress via canvas
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = await toBase64(file);
  };

  const getGPS = () => {
    setGpsStatus("Getting location…");
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setGpsStatus("✓ Location captured!"); },
      ()  => setGpsStatus("Could not get location. Try manual entry.")
    );
  };

  const save = () => {
    if (!form.name.trim()) return;
    onSave({
      id: Date.now().toString(),
      ...form,
      photo: photo || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      addedBy: me.id,
      addedAt: new Date().toISOString(),
      beers: [], checkins: [], comments: [],
    });
  };

  return (
    <div style={css.page}>
      <h2 style={css.pageTitle}>Add Brewery</h2>

      {/* Photo */}
      <div style={css.field}>
        <label style={css.label}>📸 Photo</label>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={pickPhoto} />
        {photo
          ? <div style={{position:"relative"}}>
              <img src={photo} alt="preview" style={{width:"100%",borderRadius:10,maxHeight:180,objectFit:"cover"}} />
              <button style={css.removePhotoBtn} onClick={()=>setPhoto(null)}>✕</button>
            </div>
          : <button style={css.photoPickerBtn} onClick={()=>fileRef.current.click()}>
              <span style={{fontSize:28}}>📷</span>
              <span style={{fontSize:13,color:"#888"}}>Tap to add photo</span>
            </button>
        }
      </div>

      {/* Basic info */}
      {[["name","Brewery Name *","e.g. Dogfish Head"],["city","City","e.g. Milton"],["state","State","e.g. DE"],["style","Style/Type","e.g. Craft, Taproom"]].map(([k,label,ph])=>(
        <div key={k} style={css.field}>
          <label style={css.label}>{label}</label>
          <input style={css.input} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} />
        </div>
      ))}

      {/* Location */}
      <div style={css.field}>
        <label style={css.label}>📍 Location</label>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button style={{...css.tabToggle,...(locMode==="gps"?css.tabToggleActive:{})}} onClick={()=>setLocMode("gps")}>Use GPS</button>
          <button style={{...css.tabToggle,...(locMode==="manual"?css.tabToggleActive:{})}} onClick={()=>setLocMode("manual")}>Manual</button>
        </div>
        {locMode === "gps" && (
          <div>
            <button style={css.btnOutline} onClick={getGPS}>📡 Get My Location</button>
            {gpsStatus && <p style={{color: gpsStatus.startsWith("✓")?"#6fcf6f":"#e07070", fontSize:13, marginTop:6}}>{gpsStatus}</p>}
            {lat && lng && <p style={{color:"#888",fontSize:12,marginTop:4}}>Lat: {lat}, Lng: {lng}</p>}
          </div>
        )}
        {locMode === "manual" && (
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <label style={{...css.label,fontSize:11}}>Latitude</label>
              <input style={css.input} value={lat} onChange={e=>setLat(e.target.value)} placeholder="e.g. 38.9072" />
            </div>
            <div style={{flex:1}}>
              <label style={{...css.label,fontSize:11}}>Longitude</label>
              <input style={css.input} value={lng} onChange={e=>setLng(e.target.value)} placeholder="e.g. -77.0369" />
            </div>
          </div>
        )}
        <p style={{color:"#555",fontSize:11,marginTop:6}}>Tip: search the brewery on Google Maps, long-press to get coordinates.</p>
      </div>

      <div style={css.field}>
        <label style={css.label}>Notes</label>
        <textarea style={{...css.input,height:80,resize:"none"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Vibe, food, parking…" />
      </div>

      <div style={css.btnRow}>
        <button style={css.btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={css.btnPrimary} onClick={save}>Save Brewery</button>
      </div>
      <div style={{height:20}} />
    </div>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────
function Detail({ brewery: b, me, onUpdate, onBack }) {
  const [tab, setTab]         = useState("beers");
  const [addingBeer, setAddingBeer] = useState(false);
  const [comment, setComment] = useState("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const photoRef = useRef();
  const checkedIn = (b.checkins||[]).some(c=>c.userId===me.id);

  const checkIn = () => {
    if (checkedIn) return;
    onUpdate({ ...b, checkins: [...(b.checkins||[]), { userId:me.id, username:me.username, avatar:me.avatar, date:new Date().toISOString() }] });
  };

  const addBeer = beer => { onUpdate({ ...b, beers: [...(b.beers||[]), beer] }); setAddingBeer(false); };

  const rateBeer = (beerId, score, note) => {
    const beers = (b.beers||[]).map(beer => {
      if (beer.id !== beerId) return beer;
      const others = (beer.ratings||[]).filter(r=>r.userId!==me.id);
      return { ...beer, ratings: [...others, { userId:me.id, username:me.username, score, note, date:new Date().toISOString() }] };
    });
    onUpdate({ ...b, beers });
  };

  const postComment = () => {
    if (!comment.trim()) return;
    onUpdate({ ...b, comments: [...(b.comments||[]), { id:Date.now().toString(), userId:me.id, username:me.username, avatar:me.avatar, text:comment.trim(), date:new Date().toISOString() }] });
    setComment("");
  };

  const changePhoto = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      onUpdate({ ...b, photo: canvas.toDataURL("image/jpeg", 0.7) });
    };
    img.src = await toBase64(file);
  };

  const mapsUrl = b.lat && b.lng
    ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
    : b.name && b.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name+" "+b.city)}`
    : null;

  const ratings = (b.beers||[]).flatMap(beer=>(beer.ratings||[]).map(r=>r.score));
  const overallAvg = avg(ratings);

  return (
    <div style={css.page}>
      <button style={css.backBtn} onClick={onBack}>← Back</button>

      {/* Hero photo */}
      <div style={{position:"relative",marginBottom:16}}>
        {b.photo
          ? <img src={b.photo} alt={b.name} style={{width:"100%",height:200,objectFit:"cover",borderRadius:12}} />
          : <div style={css.photoPlaceholder}>🏭</div>
        }
        <button style={css.changePhotoBtn} onClick={()=>photoRef.current.click()}>📷 {b.photo?"Change":"Add"} Photo</button>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={changePhoto} />
      </div>

      {/* Info */}
      <div style={css.detailHeader}>
        <h2 style={css.detailName}>{b.name}</h2>
        <p style={css.detailCity}>{[b.city,b.state].filter(Boolean).join(", ")}</p>
        {b.style && <span style={css.metaChip}>🏷 {b.style}</span>}
        {overallAvg && <div style={css.bigRating}>⭐ {overallAvg} avg</div>}
        {b.notes && <p style={css.detailNotes}>{b.notes}</p>}
      </div>

      {/* Map button */}
      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={css.mapBtn}>
          🗺 Open in Google Maps
        </a>
      )}

      {/* Coordinates display */}
      {b.lat && b.lng && (
        <p style={{color:"#555",fontSize:11,textAlign:"center",marginBottom:12}}>
          📍 {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
        </p>
      )}

      {/* Check-in */}
      <button style={checkedIn ? css.checkedBtn : css.checkInBtn} onClick={checkIn} disabled={checkedIn}>
        {checkedIn ? "✓ You've been here!" : "📍 Check In"}
      </button>

      {/* Tabs */}
      <div style={css.tabs}>
        {[["beers","🍺 Beers"],["checkins","📍 Check-ins"],["comments","💬 Comments"]].map(([k,label])=>(
          <button key={k} style={{...css.tab,...(tab===k?css.tabActive:{})}} onClick={()=>setTab(k)}>{label}</button>
        ))}
      </div>

      {/* Beers tab */}
      {tab === "beers" && (
        <div>
          {!addingBeer && <button style={css.btnOutline} onClick={()=>setAddingBeer(true)}>+ Add Beer</button>}
          {addingBeer && <AddBeer me={me} onSave={addBeer} onCancel={()=>setAddingBeer(false)} />}
          {(b.beers||[]).length === 0 && !addingBeer && <p style={css.emptyMsg}>No beers logged yet.</p>}
          {(b.beers||[]).map(beer => (
            <BeerCard key={beer.id} beer={beer} me={me} onRate={(score,note)=>rateBeer(beer.id,score,note)} />
          ))}
        </div>
      )}

      {/* Check-ins tab */}
      {tab === "checkins" && (
        <div>
          {(b.checkins||[]).length === 0 && <p style={css.emptyMsg}>No check-ins yet.</p>}
          {(b.checkins||[]).map((c,i) => (
            <div key={i} style={css.commentCard}>
              <span style={{fontSize:22}}>{c.avatar}</span>
              <div><strong style={{color:"#e8d5a3"}}>{c.username}</strong><div style={{color:"#888",fontSize:12}}>{fmtDate(c.date)}</div></div>
              <span style={{marginLeft:"auto",color:"#c8a96e",fontSize:13}}>📍 Visited</span>
            </div>
          ))}
        </div>
      )}

      {/* Comments tab */}
      {tab === "comments" && (
        <div>
          <div style={css.commentBox}>
            <textarea style={{...css.input,height:70,resize:"none",flex:1}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Leave a note about this place…" />
            <button style={css.postBtn} onClick={postComment}>Post</button>
          </div>
          {(b.comments||[]).length === 0 && <p style={css.emptyMsg}>No comments yet.</p>}
          {[...(b.comments||[])].reverse().map(c => (
            <div key={c.id} style={css.commentCard}>
              <span style={{fontSize:22}}>{c.avatar}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <strong style={{color:"#e8d5a3"}}>{c.username}</strong>
                  <span style={{color:"#666",fontSize:12}}>{fmtDate(c.date)}</span>
                </div>
                <p style={{margin:"4px 0 0",color:"#ccc",fontSize:14}}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{height:20}} />
    </div>
  );
}

// ─── Add Beer ─────────────────────────────────────────────────────────────────
function AddBeer({ me, onSave, onCancel }) {
  const [form, setForm] = useState({ name:"", style:"", abv:"" });
  const [score, setScore] = useState(0);
  const [note, setNote]   = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = () => {
    if (!form.name.trim()) return;
    onSave({
      id: Date.now().toString(), ...form,
      addedBy: me.id, addedAt: new Date().toISOString(),
      ratings: score > 0 ? [{ userId:me.id, username:me.username, score, note, date:new Date().toISOString() }] : [],
    });
  };

  return (
    <div style={css.addBeerBox}>
      <h3 style={{color:"#c8a96e",margin:"0 0 12px",fontFamily:"'Playfair Display',serif"}}>New Beer</h3>
      {[["name","Beer Name *","e.g. Sixty Minute IPA"],["style","Style","e.g. IPA, Stout"],["abv","ABV %","e.g. 6.0"]].map(([k,label,ph])=>(
        <div key={k} style={css.field}>
          <label style={css.label}>{label}</label>
          <input style={css.input} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} />
        </div>
      ))}
      <div style={css.field}>
        <label style={css.label}>Your Rating</label>
        <div style={css.stars}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} style={{...css.starBtn,color:n<=score?"#f5c518":"#444"}} onClick={()=>setScore(n)}>★</button>
          ))}
          {score > 0 && <span style={{color:"#888",fontSize:13,marginLeft:6}}>{score}/5</span>}
        </div>
      </div>
      <div style={css.field}>
        <label style={css.label}>Tasting Note</label>
        <input style={css.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Hoppy, citrusy, smooth…" />
      </div>
      <div style={css.btnRow}>
        <button style={css.btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={css.btnPrimary} onClick={save}>Add Beer</button>
      </div>
    </div>
  );
}

// ─── Beer Card ────────────────────────────────────────────────────────────────
function BeerCard({ beer, me, onRate }) {
  const [editing, setEditing] = useState(false);
  const [score, setScore]     = useState(0);
  const [note, setNote]       = useState("");
  const myRating   = (beer.ratings||[]).find(r=>r.userId===me.id);
  const allRatings = beer.ratings||[];
  const avgScore   = avg(allRatings.map(r=>r.score));

  return (
    <div style={css.beerCard}>
      <div style={css.beerTop}>
        <div>
          <div style={css.beerName}>{beer.name}</div>
          <div style={css.beerMeta}>{[beer.style, beer.abv?"ABV "+beer.abv+"%":null].filter(Boolean).join(" · ")}</div>
        </div>
        {avgScore && <div style={css.beerAvg}>⭐ {avgScore}</div>}
      </div>
      {allRatings.map(r=>(
        <div key={r.userId} style={css.ratingRow}>
          <span style={{color:"#888",fontSize:13}}>{r.username}</span>
          <span style={{color:"#f5c518",fontSize:13}}>{starLabel(r.score)}</span>
          {r.note && <span style={{color:"#aaa",fontSize:12,fontStyle:"italic"}}>{r.note}</span>}
        </div>
      ))}
      {!myRating && !editing && (
        <button style={css.rateBtn} onClick={()=>setEditing(true)}>Rate this beer</button>
      )}
      {editing && (
        <div style={css.rateBox}>
          <div style={css.stars}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} style={{...css.starBtn,color:n<=score?"#f5c518":"#444"}} onClick={()=>setScore(n)}>★</button>
            ))}
          </div>
          <input style={{...css.input,marginTop:6}} value={note} onChange={e=>setNote(e.target.value)} placeholder="Tasting note…" />
          <div style={css.btnRow}>
            <button style={css.btnSecondary} onClick={()=>setEditing(false)}>Cancel</button>
            <button style={css.btnPrimary} onClick={()=>{if(score>0){onRate(score,note);setEditing(false);}}}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BG = "#0f0c08", CARD = "#1a1510", GOLD = "#c8a96e", GOLD2 = "#e8d5a3", BORDER = "#2e2418";

const css = {
  splash: { background:BG, height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  splashIcon: { fontSize:64, marginBottom:16 },

  loginWrap: { background:BG, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  loginCard: { background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:"32px 24px", width:"100%", maxWidth:380 },
  loginLogo: { fontSize:56, textAlign:"center", marginBottom:8 },
  loginTitle: { fontFamily:"'Playfair Display',serif", color:GOLD2, fontSize:32, textAlign:"center", margin:"0 0 4px" },
  loginSub: { color:"#888", textAlign:"center", fontSize:14, marginBottom:24 },
  hint: { color:"#555", fontSize:11, textAlign:"center", marginTop:16, lineHeight:1.6 },

  shell: { background:BG, minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Georgia',serif", color:"#ddd" },
  header: { background:"#13100c", borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 },
  headerLogo: { fontFamily:"'Playfair Display',serif", color:GOLD, fontSize:20, fontWeight:"bold" },
  headerRight: { display:"flex", alignItems:"center", gap:8 },
  avatar: { fontSize:22 },
  username: { color:GOLD2, fontSize:14 },
  logoutBtn: { background:"transparent", border:`1px solid ${BORDER}`, color:"#888", borderRadius:6, padding:"3px 8px", fontSize:12, cursor:"pointer" },
  main: { flex:1, overflowY:"auto", paddingBottom:80 },

  nav: { position:"fixed", bottom:0, left:0, right:0, background:"#13100c", borderTop:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-around", height:60, zIndex:10 },
  navBtn: { background:"transparent", border:"none", color:"#666", display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer", flex:1, gap:2 },
  navActive: { color:GOLD },
  navIcon: { fontSize:22 },
  navLabel: { fontSize:11 },
  fabBtn: { background:GOLD, color:"#0f0c08", border:"none", borderRadius:"50%", width:52, height:52, fontSize:26, cursor:"pointer", boxShadow:`0 4px 16px rgba(200,169,110,.4)`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 },

  page: { padding:"16px 16px 0" },
  pageTitle: { fontFamily:"'Playfair Display',serif", color:GOLD2, fontSize:24, marginBottom:16 },
  search: { width:"100%", boxSizing:"border-box", background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:"#ddd", fontSize:15, marginBottom:16, outline:"none" },

  card: { background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:16, marginBottom:12, cursor:"pointer", overflow:"hidden" },
  cardTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 },
  cardName: { fontFamily:"'Playfair Display',serif", color:GOLD2, fontSize:18, fontWeight:"bold" },
  cardCity: { color:"#888", fontSize:13, marginTop:2 },
  cardRight: { textAlign:"right", display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" },
  cardRating: { color:GOLD, fontSize:15, fontWeight:"bold" },
  checkedBadge: { background:"#1e3a1e", color:"#6fcf6f", fontSize:11, padding:"2px 7px", borderRadius:10 },
  cardMeta: { display:"flex", gap:8, flexWrap:"wrap" },
  metaChip: { background:"#201a12", color:"#999", fontSize:11, padding:"3px 8px", borderRadius:8 },

  empty: { textAlign:"center", padding:"60px 20px", color:"#666" },
  emptyMsg: { color:"#555", textAlign:"center", padding:"20px 0", fontSize:14 },

  field: { marginBottom:14 },
  label: { display:"block", color:GOLD, fontSize:13, marginBottom:5 },
  input: { width:"100%", boxSizing:"border-box", background:"#201a12", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", color:"#ddd", fontSize:15, outline:"none", fontFamily:"inherit" },
  err: { color:"#e07070", fontSize:13, textAlign:"center", marginBottom:8 },
  btnRow: { display:"flex", gap:10, marginTop:8 },
  btnPrimary: { flex:1, background:GOLD, color:"#0f0c08", border:"none", borderRadius:10, padding:"12px 0", fontSize:15, fontWeight:"bold", cursor:"pointer", fontFamily:"'Playfair Display',serif" },
  btnSecondary: { flex:1, background:"transparent", color:"#888", border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px 0", fontSize:15, cursor:"pointer" },
  btnOutline: { width:"100%", background:"transparent", border:`1px dashed ${GOLD}`, color:GOLD, borderRadius:10, padding:"10px 0", fontSize:14, cursor:"pointer", marginBottom:14 },

  photoPickerBtn: { width:"100%", background:"#201a12", border:`2px dashed ${BORDER}`, borderRadius:10, padding:"24px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" },
  removePhotoBtn: { position:"absolute", top:8, right:8, background:"rgba(0,0,0,.6)", color:"#fff", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14 },
  photoPlaceholder: { width:"100%", height:160, background:"#201a12", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 },
  changePhotoBtn: { position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,.7)", color:GOLD, border:`1px solid ${GOLD}`, borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer" },

  mapBtn: { display:"block", width:"100%", boxSizing:"border-box", background:"#0d1f2d", border:`1px solid #1a4a6a`, color:"#5bb8f5", borderRadius:10, padding:"12px 0", fontSize:15, textAlign:"center", textDecoration:"none", marginBottom:8 },

  tabToggle: { flex:1, background:"#201a12", border:`1px solid ${BORDER}`, color:"#888", borderRadius:8, padding:"8px 0", fontSize:13, cursor:"pointer" },
  tabToggleActive: { background:"#2a1f10", border:`1px solid ${GOLD}`, color:GOLD },

  backBtn: { background:"transparent", border:"none", color:GOLD, fontSize:15, cursor:"pointer", padding:"0 0 12px", display:"block" },
  detailHeader: { marginBottom:12 },
  detailName: { fontFamily:"'Playfair Display',serif", color:GOLD2, fontSize:26, margin:"0 0 4px" },
  detailCity: { color:"#888", fontSize:14, marginBottom:8 },
  bigRating: { color:GOLD, fontSize:20, fontWeight:"bold", margin:"8px 0" },
  detailNotes: { color:"#aaa", fontSize:14, fontStyle:"italic", background:"#1a1510", borderLeft:`3px solid ${BORDER}`, padding:"8px 12px", borderRadius:4, margin:"8px 0 0" },

  checkInBtn: { width:"100%", background:"#1e2e1e", border:`1px solid #3a6a3a`, color:"#6fcf6f", borderRadius:10, padding:"12px 0", fontSize:15, cursor:"pointer", marginBottom:16 },
  checkedBtn: { width:"100%", background:"#1e3a1e", border:`1px solid #3a6a3a`, color:"#4caf4c", borderRadius:10, padding:"12px 0", fontSize:15, cursor:"default", marginBottom:16, opacity:.7 },

  tabs: { display:"flex", gap:4, marginBottom:16, borderBottom:`1px solid ${BORDER}` },
  tab: { background:"transparent", border:"none", color:"#666", fontSize:13, padding:"8px 12px", cursor:"pointer", borderBottom:"2px solid transparent" },
  tabActive: { color:GOLD, borderBottom:`2px solid ${GOLD}` },

  addBeerBox: { background:"#1a1510", border:`1px solid ${BORDER}`, borderRadius:12, padding:16, marginBottom:16 },
  beerCard: { background:"#1a1510", border:`1px solid ${BORDER}`, borderRadius:10, padding:14, marginBottom:10 },
  beerTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 },
  beerName: { color:GOLD2, fontSize:16, fontWeight:"bold" },
  beerMeta: { color:"#888", fontSize:12, marginTop:2 },
  beerAvg: { color:GOLD, fontSize:15, fontWeight:"bold" },
  ratingRow: { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4, fontSize:13 },
  rateBtn: { background:"transparent", border:`1px solid ${BORDER}`, color:GOLD, borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", marginTop:6 },
  rateBox: { marginTop:8 },
  stars: { display:"flex", alignItems:"center", gap:4 },
  starBtn: { background:"transparent", border:"none", fontSize:28, cursor:"pointer", padding:0 },

  commentBox: { display:"flex", gap:8, alignItems:"flex-end", marginBottom:14 },
  postBtn: { background:GOLD, color:"#0f0c08", border:"none", borderRadius:8, padding:"10px 16px", fontSize:14, cursor:"pointer", whiteSpace:"nowrap", fontWeight:"bold" },
  commentCard: { display:"flex", gap:10, alignItems:"flex-start", background:"#1a1510", border:`1px solid ${BORDER}`, borderRadius:10, padding:12, marginBottom:8 },
};
