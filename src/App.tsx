import { useState, useRef, useEffect } from "react";

const ACTIVITIES = [
  { id: 1, icon: "✏️", label: "Do a drawing", points: 10, category: "creative", time: "10 mins", flow: "media", mediaModes: ["photo"] },
  { id: 2, icon: "🏃", label: "Pick some outdoor games", points: 15, category: "outdoor", time: "15 mins", flow: "outdoor" },
  { id: 3, icon: "💃", label: "Do a dance", points: 10, category: "physical", time: "10 mins", flow: "media", mediaModes: ["video", "photo"] },
  { id: 4, icon: "🎵", label: "Sing a song", points: 10, category: "creative", time: "10 mins", flow: "media", mediaModes: ["video", "photo"] },
  { id: 5, icon: "🧩", label: "Solve a puzzle", points: 20, category: "thinking", time: "20 mins", flow: "puzzle" },
  { id: 6, icon: "🏠", label: "Pick 10 unique objects not in daily use", points: 15, category: "thinking", time: "15 mins", flow: "media", mediaModes: ["photo"] },
  { id: 7, icon: "📅", label: "Daily discipline", points: 20, category: "habit", time: "All day", flow: "checklist" },
  { id: 8, icon: "✨", label: "Something else", points: 10, category: "creative", time: "10 mins", flow: "choice" },
];

const BADGES = [
  { id: "first", icon: "🌟", label: "First Quest", desc: "Complete your first activity", earned: true },
  { id: "streak3", icon: "🔥", label: "On Fire", desc: "3-day streak", earned: true },
  { id: "creative", icon: "🎨", label: "Creative Mind", desc: "Complete 5 creative tasks", earned: false },
  { id: "outdoor", icon: "🌿", label: "Explorer", desc: "Go outside 3 times", earned: false },
  { id: "legend", icon: "👑", label: "Legend", desc: "Earn 500 points total", earned: false },
];

const PARENT_PIN = "1234";

// Accounts are created by users at sign-up. Nothing is pre-filled.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── GPS / media settings (adjust here) ──
const GOOD_ACCURACY_M = 30;        // GPS fix must be within this many metres
const FALLBACK_ACCURACY_M = 60;    // accepted if no better fix arrives in time
const PARK_SEARCH_RADIUS_M = 120;  // how close a park/playground must be
const PLAY_MIN_SECONDS = 10 * 60;  // minimum outdoor play time before "I'm done"
const MIN_VIDEO_SECONDS = 5;       // minimum video length for dance/song

// ── Reinforcement learning: AI Coach (ε-greedy value learning over quests) ──
const RL_ALPHA = 0.3;          // learning rate α
const RL_OPTIMISTIC_Q = 20;    // starting value: encourages trying every quest
const RL_START_EPSILON = 0.5;  // starting exploration rate ε
const RL_MIN_EPSILON = 0.1;    // always keep some exploration
const RL_EPSILON_DECAY = 0.9;  // exploration shrinks with each learning step
const RL_MAX_REWARD = 25;      // used to scale the chart bars

const initialQTable = () => Object.fromEntries(ACTIVITIES.map(a => [a.id, { q: RL_OPTIMISTIC_Q, n: 0 }]));
const epsilonFor = (steps) => Math.max(RL_MIN_EPSILON, RL_START_EPSILON * Math.pow(RL_EPSILON_DECAY, steps));

// ε-greedy: explore a random quest with probability ε, otherwise pick the highest-valued quest
const chooseQuest = (qTable, epsilon) => {
  const ids = ACTIVITIES.map(a => a.id);
  if (Math.random() < epsilon) return ids[Math.floor(Math.random() * ids.length)];
  const best = Math.max(...ids.map(id => qTable[id].q));
  const bestIds = ids.filter(id => qTable[id].q === best);
  return bestIds[Math.floor(Math.random() * bestIds.length)];
};

const OUTDOOR_GAMES = [
  { id: "hide", icon: "🙈", name: "Hide and Seek", how: "One person counts to 20 while everyone hides. Then go find them all!" },
  { id: "tag", icon: "🏃", name: "Tag (Catch Me)", how: "One person is 'it' and chases. Tag a friend to pass on the 'it'." },
  { id: "hop", icon: "🦶", name: "Hopscotch", how: "Draw boxes on the ground and hop through them on one foot. Don't step on the lines!" },
  { id: "kho", icon: "🤸", name: "Kho-Kho", how: "Chasers sit in a line. Runners try to run past them and tag the line without being caught." },
  { id: "skip", icon: "🪢", name: "Skipping Rope", how: "Jump over a rope turned by two friends. See how many jumps you can do!" },
  { id: "relay", icon: "🏁", name: "Relay Race", how: "Split into two teams. Pass a ball or cap down the line, one runner at a time." },
  { id: "ball", icon: "⚽", name: "Ball Toss", how: "Stand facing a friend and toss a ball back and forth. Take one step back after each catch." },
  { id: "freeze", icon: "🗿", name: "Statue Freeze", how: "Dance when the music plays and freeze like a statue when it stops." },
];

const OTHER_ACTIVITIES = [
  { id: "blocks", icon: "🧱", name: "Build with blocks", how: "Build a tower, a house or a bridge with blocks or Lego. Make it as tall as you can!" },
  { id: "snack", icon: "🍳", name: "Help make a snack", how: "Ask an adult to help you make a simple snack, like a fruit plate or sandwich." },
  { id: "story", icon: "📖", name: "Read aloud", how: "Read a short story out loud to a family member, using your best storytelling voice." },
  { id: "plane", icon: "✈️", name: "Paper airplane", how: "Fold a paper airplane and see how far it can fly. Try to beat your best distance!" },
  { id: "plant", icon: "🌱", name: "Care for a plant", how: "Water a plant or take care of a pet with an adult's help." },
  { id: "corner", icon: "🧹", name: "Tidy one corner", how: "Pick one corner of the house and arrange or clean it neatly." },
];

const CHECKLIST_ITEMS = [
  { id: "teeth", icon: "🪥", text: "Brushed my teeth" },
  { id: "bed", icon: "🛏️", text: "Made my bed" },
  { id: "toys", icon: "🧸", text: "Put my toys and clothes back" },
  { id: "study", icon: "📚", text: "Studied or did homework for 30 min" },
  { id: "water", icon: "💧", text: "Drank enough water" },
  { id: "help", icon: "🙏", text: "Helped someone at home" },
];

const PUZZLES = [
  { q: "What has four legs but cannot walk?", answers: ["table", "a table"], hint: "You eat your dinner on it!" },
  { q: "What gets wetter the more it dries?", answers: ["towel", "a towel"], hint: "You use it after a bath." },
  { q: "What has a head and a tail but no body?", answers: ["coin", "a coin"], hint: "You can use it to buy sweets at a shop." },
  { q: "What has hands but cannot clap?", answers: ["clock", "a clock"], hint: "It tells you what time it is." },
  { q: "Find the missing number: 2, 4, 6, __, 10", answers: ["8", "eight"], hint: "Count by 2s!" },
  { q: "Unscramble this word: T - A - C", answers: ["cat", "a cat"], hint: "A furry pet that says meow." },
  { q: "Unscramble this word: N - O - O - M", answers: ["moon"], hint: "It shines in the sky at night." },
];

// ── Rewards ──
const SHOP_ITEMS = [
  { id: "phone10", icon: "📱", name: "10-minute phone break", cost: 30, kind: "break", minutes: 10 },
  { id: "phone15", icon: "📱", name: "15-minute phone break", cost: 40, kind: "break", minutes: 15 },
  { id: "dessert", icon: "🍨", name: "Pick tonight's dessert", cost: 25, kind: "family" },
  { id: "story", icon: "📖", name: "15-minute story time with a parent", cost: 30, kind: "family" },
  { id: "game", icon: "🎲", name: "Family game night: you choose", cost: 50, kind: "family" },
  { id: "outing", icon: "🌳", name: "Choose the weekend outing", cost: 80, kind: "family" },
];
const CHEST_REWARDS = [
  "🎨 Sticker pack unlocked! Show a parent",
  "🎵 Pick the song in the car",
  "🍪 Bonus treat! Ask a parent",
  "⏱️ Ask a parent for 5 bonus phone minutes",
  "🌟 Golden star badge earned!",
];
const QUESTS_PER_CHEST = 3;

const initialLog = [
  { id: 1, activity: "Do a drawing", time: "2026-02-21 10:30 AM", points: 10, verify: "📸 Photo" },
  { id: 2, activity: "Do a dance", time: "2026-02-21 02:15 PM", points: 10, verify: "🎬 Video" },
  { id: 3, activity: "Pick some outdoor games", time: "2026-02-20 04:00 PM", points: 15, verify: "📍 GPS" },
  { id: 4, activity: "Sing a song", time: "2026-02-20 09:00 AM", points: 10, verify: "📸 Photo" },
];

const AI_KEYWORDS = ["ai", "generated", "dall", "midjourney", "stable", "diffusion", "deepfake", "synthetic", "gpt", "openai", "artificial", "fake", "sd_", "bing_image", "adobe_fire", "firefly", "canva_ai", "imagine", "flux"];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const pill = (bg, disabled = false) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 40, padding: "12px 28px",
  fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", width: "100%",
  opacity: disabled ? 0.5 : 1, marginTop: 8,
});

const looksAiGenerated = (file) => {
  const name = file.name.toLowerCase().replace(/[_\-\s]/g, "");
  for (const kw of AI_KEYWORDS) {
    if (name.includes(kw)) return `Filename contains AI keyword: "${kw}"`;
  }
  return false;
};

// Samples a 64×64 frame (photo, or a frame from a video) and measures colour variance.
// Real photos have high variance; solid placeholders and flat fakes do not.
const measureMedia = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "img");
    const finish = (fn, value) => { URL.revokeObjectURL(url); fn(value); };

    const measure = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(el, 0, 0, 64, 64);
        const { data } = ctx.getImageData(0, 0, 64, 64);
        const n = data.length / 4;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
        r /= n; g /= n; b /= n;
        let variance = 0;
        for (let i = 0; i < data.length; i += 4) {
          variance += (data[i] - r) ** 2 + (data[i + 1] - g) ** 2 + (data[i + 2] - b) ** 2;
        }
        finish(resolve, { variance: variance / n, duration: isVideo ? el.duration : null });
      } catch (err) {
        finish(reject, err);
      }
    };

    el.onerror = () => finish(reject, new Error("unreadable"));
    if (isVideo) {
      el.muted = true;
      el.playsInline = true;
      el.preload = "auto";
      el.onloadedmetadata = () => {
        if (!el.videoWidth) return finish(reject, new Error("unreadable"));
        el.onseeked = measure;
        el.currentTime = Math.min(1, (el.duration || 1) / 2);
      };
    } else {
      el.onload = measure;
    }
    el.src = url;
  });

// Waits for a GPS fix accurate enough to trust. Returns { promise, cancel }.
const acquireFix = (onAccuracy) => {
  let watchId = null;
  let timer = null;
  let best = null;
  let settled = false;

  const stop = () => {
    settled = true;
    clearTimeout(timer);
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  };

  const promise = new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      settled = true;
      reject({ code: "unsupported" });
      return;
    }
    timer = setTimeout(() => {
      if (settled) return;
      stop();
      if (best && best.accuracy <= FALLBACK_ACCURACY_M) resolve(best);
      else reject({ code: "timeout" });
    }, 25000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;
        const c = pos.coords;
        if (!best || c.accuracy < best.accuracy) {
          best = { lat: c.latitude, lng: c.longitude, accuracy: c.accuracy };
        }
        if (onAccuracy) onAccuracy(best.accuracy);
        if (c.accuracy <= GOOD_ACCURACY_M) {
          stop();
          resolve(best);
        }
      },
      (err) => {
        if (settled) return;
        stop();
        reject({ code: err.code === 1 ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    );
  });

  return { promise, cancel: stop };
};

// Asks OpenStreetMap (Overpass) whether a park, playground or pitch is nearby.
// Returns the place name, or null if there is none.
const checkOutdoorPlace = async (lat, lng) => {
  const q = `[out:json][timeout:15];nwr["leisure"~"^(park|playground|pitch|recreation_ground|garden)$"](around:${PARK_SEARCH_RADIUS_M},${lat},${lng});out tags center 1;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
  });
  if (!res.ok) throw new Error("map-service");
  const json = await res.json();
  const el = json.elements && json.elements[0];
  if (!el) return null;
  const tags = el.tags || {};
  return tags.name || (tags.leisure ? tags.leisure.replace(/_/g, " ") : "Outdoor play area");
};

const gpsErrorText = (err) => {
  if (err instanceof Error) return "Couldn't check the park map. Check your internet connection and try again.";
  switch (err.code) {
    case "denied": return "Location is blocked. Allow location for this site in your browser or phone settings, then try again.";
    case "timeout": return "Couldn't get a clear GPS signal. Step out under the open sky and try again.";
    case "unsupported": return "This device can't share its location.";
    default: return "Location isn't available right now. Try again in a moment.";
  }
};

const verifyLabel = (task, file) => {
  switch (task.flow) {
    case "outdoor": return "📍 GPS";
    case "puzzle": return "🧩 Puzzle";
    case "checklist": return "✅ Checklist + 📸 Photo";
    case "choice": return "✨ Pick + 📸 Photo";
    default: return file && file.type.startsWith("video/") ? "🎬 Video" : "📸 Photo";
  }
};

const successTitle = (task) => {
  if (task.flow === "outdoor") return "GPS Verified!";
  if (task.flow === "puzzle") return "Puzzle Solved!";
  return "AI Verified!";
};

const verifyTag = (a) => {
  if (a.flow === "outdoor") return "📍 GPS";
  if (a.flow === "puzzle") return "🧩 Puzzle";
  if (a.flow === "checklist") return "✅ Checklist + 📸";
  if (a.flow === "choice") return "✨ Pick + 📸";
  return a.mediaModes && a.mediaModes[0] === "video" ? "🎬 Video or 📸" : "📸 AI Photo";
};

export default function ReadySetPlay() {
  const [view, setView] = useState("kids");
  const [dark, setDark] = useState(false);
  const [points, setPoints] = useState(45);
  const [screenTime, setScreenTime] = useState(10);
  const [streak, setStreak] = useState(3);
  const [log, setLog] = useState(initialLog);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("All");
  const [reportTab, setReportTab] = useState("Daily Report");
  const [notification, setNotification] = useState(null);
  const [dailyLimit, setDailyLimit] = useState(60);
  const [streakAnim, setStreakAnim] = useState(false);

  // Auth
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [authScreen, setAuthScreen] = useState("welcome"); // welcome | signin | signup | google
  const emptyForm = { name: "", email: "", password: "", confirm: "", role: "kids" };
  const [authForm, setAuthForm] = useState(emptyForm);
  const [authError, setAuthError] = useState("");

  // Reinforcement learning agent (AI Coach)
  const [qTable, setQTable] = useState(initialQTable);
  const [rlSteps, setRlSteps] = useState(0);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [coachPick, setCoachPick] = useState(null);

  // Rewards
  const [totalEarned, setTotalEarned] = useState(45);   // lifetime points (for the progress bar)
  const [breakUsed, setBreakUsed] = useState(0);        // phone-break minutes used today
  const [breakLeft, setBreakLeft] = useState(null);     // seconds left in a phone break, null = none
  const [questsSinceChest, setQuestsSinceChest] = useState(0);
  const [redeemed, setRedeemed] = useState([]);
  const epsilon = epsilonFor(rlSteps);

  useEffect(() => {
    setCoachPick(chooseQuest(qTable, epsilon));
  }, [qTable, rlSteps]);

  // PIN
  const [pinLocked, setPinLocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinShake, setPinShake] = useState(false);

  // Task modal
  const [activeTask, setActiveTask] = useState(null);
  const [step, setStep] = useState("idle"); // pick | do | verify | analyzing | rejected | success
  const [choice, setChoice] = useState(null);
  const [checks, setChecks] = useState({});
  const [mediaMode, setMediaMode] = useState("photo");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const fileInputRef = useRef(null);

  // Puzzle
  const [puzzles, setPuzzles] = useState([]);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzleInput, setPuzzleInput] = useState("");
  const [puzzleWrong, setPuzzleWrong] = useState(0);
  const [puzzleMsg, setPuzzleMsg] = useState("");

  // GPS
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | locating | checking | ready | playing | finishing | error
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsPlace, setGpsPlace] = useState(null);
  const [gpsMsg, setGpsMsg] = useState("");
  const [playSeconds, setPlaySeconds] = useState(0);
  const gpsCancelRef = useRef(null);
  const playTimerRef = useRef(null);
  const playStartRef = useRef(0);

  useEffect(() => {
    return () => {
      clearInterval(playTimerRef.current);
      if (gpsCancelRef.current) gpsCancelRef.current();
    };
  }, []);

  const maxPoints = 100;
  const progress = Math.min((totalEarned / maxPoints) * 100, 100);
  const todayLog = log.filter(l => l.time.includes("2026-02-21"));
  const todayPoints = todayLog.reduce((a, b) => a + b.points, 0);
  const doneCount = CHECKLIST_ITEMS.filter(i => checks[i.id]).length;

  const showNotif = (msg, color = "#0f766e") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2800);
  };

  // Phone-break countdown
  useEffect(() => {
    if (breakLeft === null) return;
    if (breakLeft <= 0) {
      setBreakLeft(null);
      showNotif("⏰ Break over! Time for quests 💪", "#0f766e");
      return;
    }
    const t = setTimeout(() => setBreakLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [breakLeft]);

  const redeem = (item) => {
    if (points < item.cost) {
      showNotif(`You need ${item.cost - points} more points for this`, "#dc2626");
      return;
    }
    if (item.kind === "break") {
      if (breakLeft !== null) { showNotif("A phone break is already running", "#dc2626"); return; }
      if (breakUsed + item.minutes > dailyLimit) {
        showNotif(`Not enough screen time left today (limit ${dailyLimit} min)`, "#dc2626");
        return;
      }
      setBreakUsed(u => u + item.minutes);
      setBreakLeft(item.minutes * 60);
      showNotif(`📱 ${item.minutes}-minute phone break started!`, "#0e7490");
    } else {
      showNotif(`🎁 ${item.name} unlocked! Tell a parent.`, "#16a34a");
    }
    setPoints(p => p - item.cost);
    setRedeemed(r => [{ id: Date.now(), name: item.name, cost: item.cost }, ...r]);
  };

  const openChest = () => {
    const reward = CHEST_REWARDS[Math.floor(Math.random() * CHEST_REWARDS.length)];
    setQuestsSinceChest(0);
    showNotif(reward, "#f59e0b");
  };

  const filteredActivities = ACTIVITIES.filter((a) => {
    const matchSearch = a.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      filterTab === "All" ||
      (filterTab === "Favs" && [1, 3].includes(a.id)) ||
      (filterTab === "Tokens" && a.points >= 15) ||
      (filterTab === "Gems" && a.points >= 20);
    return matchSearch && matchFilter;
  });

  // ── Modal helpers ──
  const stopGps = () => {
    clearInterval(playTimerRef.current);
    playTimerRef.current = null;
    if (gpsCancelRef.current) { gpsCancelRef.current(); gpsCancelRef.current = null; }
  };

  const resetModal = () => {
    stopGps();
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setStep("idle");
    setChoice(null);
    setChecks({});
    setMediaFile(null);
    setMediaPreview(null);
    setRejectReason("");
    setGpsStatus("idle");
    setGpsAccuracy(null);
    setGpsPlace(null);
    setGpsMsg("");
    setPlaySeconds(0);
    setPuzzleIdx(0);
    setPuzzleInput("");
    setPuzzleWrong(0);
    setPuzzleMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeModal = () => {
    resetModal();
    setActiveTask(null);
  };

  const startTask = (task) => {
    resetModal();
    setActiveTask(task);
    setMediaMode(task.mediaModes ? task.mediaModes[0] : "photo");
    if (task.flow === "media") setStep("verify");
    else if (task.flow === "outdoor" || task.flow === "choice") setStep("pick");
    else if (task.flow === "checklist") setStep("do");
    else if (task.flow === "puzzle") {
      setPuzzles(shuffle(PUZZLES).slice(0, 3));
      setStep("do");
    }
  };

  // ── Media (photo / video) ──
  // Q-learning style update: Q ← Q + α (reward − Q). Reward = points, or 0 when an upload is rejected.
  const updateAgent = (activityId, reward) => {
    setQTable(prev => {
      const cur = prev[activityId];
      return { ...prev, [activityId]: { q: cur.q + RL_ALPHA * (reward - cur.q), n: cur.n + 1 } };
    });
    setRlSteps(s => s + 1);
    setRewardHistory(h => [...h.slice(-19), { reward }]);
  };

  const rejectMedia = (reason) => {
    if (activeTask) updateAgent(activeTask.id, 0);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setRejectReason(reason);
    setStep("rejected");
  };

  const switchMode = (m) => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaFile(null);
    setMediaMode(m);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const wantVideo = mediaMode === "video";
    const typeOk = wantVideo ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!typeOk) {
      showNotif(wantVideo ? "Please choose a video file 🎬" : "Please choose a photo 📸", "#dc2626");
      return;
    }

    const reason = looksAiGenerated(file);
    if (reason) { rejectMedia(reason); return; }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setRejectReason("");
  };

  const verifyMedia = async () => {
    if (!mediaFile) {
      fileInputRef.current && fileInputRef.current.click();
      return;
    }
    setStep("analyzing");
    try {
      const { variance, duration } = await measureMedia(mediaFile);
      await new Promise(r => setTimeout(r, 2200));
      if (mediaFile.type.startsWith("video/") && isFinite(duration) && duration < MIN_VIDEO_SECONDS) {
        rejectMedia(`This video is only ${Math.round(duration)} seconds. Please record at least ${MIN_VIDEO_SECONDS} seconds!`);
        return;
      }
      if (variance < 30) {
        rejectMedia("Image appears to be a solid or near-solid colour — not a real photo");
        return;
      }
      setStep("success");
    } catch {
      rejectMedia("We couldn't read this file. Please try a different one.");
    }
  };

  // ── Puzzle ──
  const submitPuzzle = () => {
    const p = puzzles[puzzleIdx];
    const ans = puzzleInput.trim().toLowerCase();
    if (!p || !ans) return;
    if (p.answers.includes(ans)) {
      setPuzzleInput("");
      setPuzzleWrong(0);
      if (puzzleIdx + 1 >= puzzles.length) {
        setStep("success");
      } else {
        setPuzzleIdx(i => i + 1);
        setPuzzleMsg("🎉 Correct! Next one...");
      }
    } else {
      setPuzzleWrong(w => w + 1);
      setPuzzleMsg("Not quite, try again! 🤔");
    }
  };

  // ── GPS ──
  const runLocationCheck = async () => {
    setGpsStatus("locating");
    setGpsMsg("");
    setGpsPlace(null);
    setGpsAccuracy(null);
    const fix = acquireFix((acc) => setGpsAccuracy(Math.round(acc)));
    gpsCancelRef.current = fix.cancel;
    try {
      const best = await fix.promise;
      setGpsStatus("checking");
      const place = await checkOutdoorPlace(best.lat, best.lng);
      if (!place) {
        setGpsMsg("You're not near a park or playground yet. Walk to an outdoor play area, then try again.");
        setGpsStatus("error");
        return;
      }
      setGpsPlace(place);
      setGpsAccuracy(Math.round(best.accuracy));
      setGpsStatus("ready");
    } catch (err) {
      setGpsMsg(gpsErrorText(err));
      setGpsStatus("error");
    }
  };

  const startPlaying = () => {
    playStartRef.current = Date.now();
    setPlaySeconds(0);
    setGpsMsg("");
    setGpsStatus("playing");
    clearInterval(playTimerRef.current);
    playTimerRef.current = setInterval(() => {
      setPlaySeconds(Math.floor((Date.now() - playStartRef.current) / 1000));
    }, 1000);
  };

  const backToPlaying = (msg) => {
    setGpsMsg(msg);
    setGpsStatus("playing");
  };

  const finishPlaying = async () => {
    const elapsed = Math.floor((Date.now() - playStartRef.current) / 1000);
    if (elapsed < PLAY_MIN_SECONDS) return;
    setGpsStatus("finishing");
    setGpsMsg("");
    const fix = acquireFix((acc) => setGpsAccuracy(Math.round(acc)));
    gpsCancelRef.current = fix.cancel;
    try {
      const best = await fix.promise;
      const place = await checkOutdoorPlace(best.lat, best.lng);
      if (!place) {
        backToPlaying("You're not at a park or playground right now. Go back to your play spot, then tap 'I'm done' again.");
        return;
      }
      stopGps();
      setStep("success");
    } catch (err) {
      backToPlaying(gpsErrorText(err));
    }
  };

  // ── Claim ──
  const handleClaim = () => {
    const task = activeTask;
    const newPts = points + task.points;
    setPoints(newPts);
    updateAgent(task.id, task.points);
    setTotalEarned(t => t + task.points);
    setQuestsSinceChest(q => q + 1);
    setScreenTime(s => s + 10);
    const now = new Date();
    const timeStr = `2026-02-21 ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    setLog(prev => [{ id: Date.now(), activity: task.label, time: timeStr, points: task.points, verify: verifyLabel(task, mediaFile) }, ...prev]);
    closeModal();
    setStreakAnim(true);
    setTimeout(() => setStreakAnim(false), 700);
    showNotif(`+${task.points} pts! 🎉 +10 min screen time unlocked`, "#16a34a");
  };

  // ── PIN ──
  const handlePinKey = (key) => {
    if (key === "del") {
      setPinInput(p => p.slice(0, -1));
      setPinError(false);
      return;
    }
    const next = pinInput + key;
    setPinInput(next);
    if (next.length === 4) {
      if (next === PARENT_PIN) {
        setPinLocked(false);
        setPinInput("");
        setPinError(false);
        showNotif("Welcome, Parent! 🛡️", "#134e4a");
      } else {
        setPinError(true);
        setPinShake(true);
        setTimeout(() => { setPinInput(""); setPinShake(false); }, 700);
      }
    }
  };

  const switchToParent = () => {
    setView("parent");
    setPinLocked(true);
    setPinInput("");
    setPinError(false);
  };

  const outdoorOptions = activeTask && activeTask.flow === "outdoor" ? OUTDOOR_GAMES : OTHER_ACTIVITIES;
  const modes = activeTask ? (activeTask.mediaModes || ["photo"]) : ["photo"];
  const proofHint =
    activeTask && activeTask.flow === "checklist" ? "Show us your tidy room or your finished tasks!" :
    activeTask && activeTask.flow === "choice" ? "Show us what you did!" :
    mediaMode === "video" ? `Record at least ${MIN_VIDEO_SECONDS} seconds of you doing it!` :
    "Choose a real photo you took yourself";

  const updateForm = (key, value) => setAuthForm(f => ({ ...f, [key]: value }));

  const goTo = (screen) => {
    setAuthError("");
    setAuthForm(emptyForm);
    setAuthScreen(screen);
  };

  const finishLogin = (account) => {
    setUser(account);
    setView(account.role);
    setPinLocked(account.role !== "parent");
    setPinInput("");
    setAuthError("");
    setAuthForm(emptyForm);
  };

  const handleSignIn = () => {
    const email = authForm.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setAuthError("Please enter a valid email address."); return; }
    if (!authForm.password) { setAuthError("Please enter your password."); return; }
    const account = accounts.find(a => a.email === email && a.password === authForm.password);
    if (!account) { setAuthError("Email or password is not correct."); return; }
    finishLogin(account);
  };

  const handleSignUp = () => {
    const name = authForm.name.trim();
    const email = authForm.email.trim().toLowerCase();
    if (!name) { setAuthError("Please enter your name."); return; }
    if (!EMAIL_RE.test(email)) { setAuthError("Please enter a valid email address."); return; }
    if (accounts.some(a => a.email === email)) { setAuthError("An account with this email already exists. Please log in instead."); return; }
    if (authForm.password.length < 6) { setAuthError("Password must be at least 6 characters."); return; }
    if (authForm.password !== authForm.confirm) { setAuthError("Passwords do not match."); return; }
    const account = { role: authForm.role, name, email, password: authForm.password, provider: "email" };
    setAccounts(prev => [...prev, account]);
    finishLogin(account);
  };

  const handleGoogle = () => {
    const email = authForm.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setAuthError("Please enter a valid Google email address."); return; }
    const existing = accounts.find(a => a.email === email);
    if (existing) {
      if (existing.provider !== "google") {
        setAuthError("This email signs in with a password. Use 'Log in with email' instead.");
        return;
      }
      finishLogin(existing);
      return;
    }
    const name = authForm.name.trim();
    if (!name) { setAuthError("Please enter your name."); return; }
    const account = { role: authForm.role, name, email, password: "", provider: "google" };
    setAccounts(prev => [...prev, account]);
    finishLogin(account);
  };

  const logout = () => {
    closeModal();
    setUser(null);
    setAuthScreen("welcome");
    setAuthForm(emptyForm);
    setAuthError("");
    setView("kids");
    setPinLocked(true);
    setPinInput("");
    setPinError(false);
  };

  if (!user) {
    const inputStyle = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "2px solid #ccfbf1", fontSize: 15, outline: "none", fontFamily: "inherit", marginBottom: 12 };
    const label = (text) => <div style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: "#115e59", marginBottom: 4 }}>{text}</div>;
    const errorBox = authError ? (
      <div style={{ background: "#fef2f2", color: "#ef4444", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 700, marginBottom: 12, textAlign: "left" }}>❌ {authError}</div>
    ) : null;
    const linkBtn = (text, onClick) => (
      <button onClick={onClick} style={{ background: "none", border: "none", color: "#0f766e", fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 10, textDecoration: "underline" }}>{text}</button>
    );
    const googleBtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#fff", border: "2px solid #e2e8f0", color: "#1e293b", borderRadius: 40, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 };
    // ── Login backdrop: layered gradient, dot texture, floating emoji stickers ──
    // [emoji, left%, top%, size px, tilt deg, animation delay s]
    const BG_STICKERS = [
      ["🧩", 8, 10, 46, -12, 0], ["⭐", 84, 8, 40, 14, 0.8], ["🎨", 88, 36, 44, -8, 1.6],
      ["🏃", 6, 46, 42, 10, 2.2], ["🎵", 78, 66, 40, -14, 0.4], ["🌈", 14, 80, 48, 6, 1.1],
      ["🚀", 60, 90, 40, -6, 2.6], ["🏆", 90, 88, 38, 12, 0.6], ["🪁", 36, 6, 40, -10, 1.9],
      ["🦄", 40, 92, 36, 8, 2.9], ["🍎", 92, 58, 34, -16, 1.3], ["🧸", 2, 24, 40, 12, 0.2],
    ];
    const card = (children) => (
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "radial-gradient(circle at 18% 22%, #99f6e4 0%, transparent 38%), radial-gradient(circle at 86% 82%, #0d9488 0%, transparent 42%), linear-gradient(160deg,#0f766e 0%,#115e59 55%,#14b8a6 100%)" }}>
        <style>{`
          @keyframes stickerFloat { 0%,100% { transform: translateY(0) rotate(var(--tilt)); } 50% { transform: translateY(-16px) rotate(calc(var(--tilt) + 6deg)); } }
          @keyframes softPulse { 0%,100% { opacity: .35; } 50% { opacity: .6; } }
          @media (prefers-reduced-motion: reduce) { .sticker, .glow { animation: none !important; } }
        `}</style>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,.28) 1.5px, transparent 1.5px)", backgroundSize: "22px 22px", opacity: .5 }} />
        <div aria-hidden="true" className="glow" style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.14)", top: -80, right: -70, animation: "softPulse 6s ease-in-out infinite" }} />
        <div aria-hidden="true" className="glow" style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.12)", bottom: -60, left: -50, animation: "softPulse 7s ease-in-out 1s infinite" }} />
        {BG_STICKERS.map(([e, x, y, size, tilt, delay], i) => (
          <span key={i} aria-hidden="true" className="sticker" style={{ position: "absolute", left: `${x}%`, top: `${y}%`, fontSize: size, lineHeight: 1, pointerEvents: "none", userSelect: "none", "--tilt": `${tilt}deg`, filter: "drop-shadow(0 8px 14px rgba(120,20,60,.25))", opacity: .8, animation: `stickerFloat ${5 + (i % 4)}s ease-in-out ${delay}s infinite` }}>{e}</span>
        ))}
        <div style={{ background: "#fff", borderRadius: 22, padding: "44px 28px 30px", width: "100%", maxWidth: 360, boxShadow: "0 30px 70px rgba(120,20,60,.28), 0 8px 20px rgba(0,0,0,.08)", textAlign: "center", boxSizing: "border-box", position: "relative", zIndex: 1 }}>
          <div style={{ width: 76, height: 76, margin: "-82px auto 0", borderRadius: 26, background: "linear-gradient(135deg,#99f6e4,#14b8a6)", border: "5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, boxShadow: "0 12px 24px rgba(15,118,110,.30)" }}>🧠</div>
          <h1 style={{ margin: "14px 0 0", fontSize: 26, fontWeight: 900, color: "#1e3a5f", letterSpacing: .3 }}>Ready Set Play</h1>
          <div style={{ display: "inline-block", marginTop: 8, background: "#f0fdfa", color: "#115e59", fontWeight: 800, fontSize: 11, letterSpacing: 1.4, padding: "4px 12px", borderRadius: 99, textTransform: "uppercase" }}>Play · Learn · Grow</div>
          {children}
        </div>
      </div>
    );

    if (authScreen === "welcome") {
      return card(
        <>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 18px" }}>Log in to start your quests</p>
          <button onClick={() => goTo("google")} style={googleBtn}>
            <span style={{ fontWeight: 900, color: "#4285f4", fontSize: 17 }}>G</span> Continue with Google
          </button>
          <button onClick={() => goTo("signin")} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)")}>✉️ Log in with email</button>
          <p style={{ color: "#64748b", fontSize: 13, margin: "18px 0 0" }}>Don't have an account yet?</p>
          {linkBtn("Create a new account", () => goTo("signup"))}
        </>
      );
    }

    if (authScreen === "google") {
      return card(
        <>
          <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 16px", fontWeight: 700 }}>Continue with your Google account</p>
          {label("I am a")}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["kids", "🧒 Kid"], ["parent", "🛡️ Parent"]].map(([r, text]) => (
              <button key={r} onClick={() => updateForm("role", r)} style={{ flex: 1, padding: "10px 8px", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 14, border: `2px solid ${authForm.role === r ? "#0f766e" : "#ccfbf1"}`, background: authForm.role === r ? "#f0fdfa" : "#fff", color: "#115e59" }}>
                {text}
              </button>
            ))}
          </div>
          {label("Name (for new accounts)")}
          <input value={authForm.name} onChange={e => updateForm("name", e.target.value)} placeholder="Your name" autoComplete="name" style={inputStyle} />
          {label("Your Google email")}
          <input type="email" value={authForm.email} onChange={e => updateForm("email", e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleGoogle(); }} placeholder="you@gmail.com" autoComplete="email" style={inputStyle} />
          {errorBox}
          <button onClick={handleGoogle} style={pill("linear-gradient(90deg,#4285f4,#34a853)", !authForm.email)}>Continue with Google</button>
          {linkBtn("← Back", () => goTo("welcome"))}
          <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 14 }}>Real Google sign-in needs a Google Cloud client ID. Until it is added, the email entered here is not verified with Google.</p>
        </>
      );
    }

    if (authScreen === "signin") {
      return card(
        <>
          <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 16px", fontWeight: 700 }}>Log in with your email</p>
          {label("Email")}
          <input
            type="email"
            value={authForm.email}
            onChange={e => updateForm("email", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSignIn(); }}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />
          {label("Password")}
          <input
            type="password"
            value={authForm.password}
            onChange={e => updateForm("password", e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSignIn(); }}
            placeholder="Your password"
            autoComplete="current-password"
            style={inputStyle}
          />
          {errorBox}
          <button onClick={handleSignIn} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)", !authForm.email || !authForm.password)}>Log in</button>
          <p style={{ color: "#64748b", fontSize: 13, margin: "16px 0 0" }}>No account yet?</p>
          {linkBtn("Create a new account", () => goTo("signup"))}
          {linkBtn("← Back", () => goTo("welcome"))}
        </>
      );
    }

    // Sign up (default)
    return card(
      <>
        <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 16px", fontWeight: 700 }}>Create your new account</p>
        {label("I am a")}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["kids", "🧒 Kid"], ["parent", "🛡️ Parent"]].map(([r, text]) => (
            <button key={r} onClick={() => updateForm("role", r)} style={{ flex: 1, padding: "10px 8px", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 14, border: `2px solid ${authForm.role === r ? "#0f766e" : "#ccfbf1"}`, background: authForm.role === r ? "#f0fdfa" : "#fff", color: "#115e59" }}>
              {text}
            </button>
          ))}
        </div>
        {label("Name")}
        <input value={authForm.name} onChange={e => updateForm("name", e.target.value)} placeholder="Your name" autoComplete="name" style={inputStyle} />
        {label("Email")}
        <input type="email" value={authForm.email} onChange={e => updateForm("email", e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle} />
        {label("Password (at least 6 characters)")}
        <input type="password" value={authForm.password} onChange={e => updateForm("password", e.target.value)} placeholder="Create a password" autoComplete="new-password" style={inputStyle} />
        {label("Confirm password")}
        <input type="password" value={authForm.confirm} onChange={e => updateForm("confirm", e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSignUp(); }} placeholder="Type it again" autoComplete="new-password" style={inputStyle} />
        {errorBox}
        <button onClick={handleSignUp} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)")}>Create account</button>
        <p style={{ color: "#64748b", fontSize: 13, margin: "16px 0 0" }}>Already have an account?</p>
        {linkBtn("Log in", () => goTo("signin"))}
        {linkBtn("← Back", () => goTo("welcome"))}
      </>
    );
  }

  return (
    <div className={dark ? "rsp-dark" : undefined} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: "100vh", position: "relative", isolation: "isolate", paddingBottom: 40, background: dark
      ? "radial-gradient(circle at 15% 10%, #4c1d95 0%, transparent 40%), radial-gradient(circle at 90% 90%, #0e7490 0%, transparent 45%), linear-gradient(160deg,#0f172a 0%,#1e1b4b 60%,#312e81 100%)"
      : view === "kids"
      ? "radial-gradient(circle at 8% 10%, #ccfbf1 0%, transparent 38%), radial-gradient(circle at 94% 40%, #5eead4 0%, transparent 36%), radial-gradient(circle at 90% 92%, #2dd4bf 0%, transparent 42%), linear-gradient(160deg,#f0fdfa 0%,#f0fdfa 100%)"
      : "radial-gradient(circle at 10% 12%, #ccfbf1 0%, transparent 40%), radial-gradient(circle at 92% 88%, #e0f2fe 0%, transparent 45%), linear-gradient(160deg,#f0fdfa 0%,#f8fafc 100%)" }}>

      {dark && (
        <style>{`
          .rsp-dark [style*="background: rgb(255, 255, 255)"] { background: #1e1b4b !important; border-color: #3730a3 !important; }
          .rsp-dark [style*="background: rgb(248, 250, 252)"], .rsp-dark [style*="background: rgb(241, 245, 249)"] { background: #0f172a !important; }
          .rsp-dark [style*="background: rgb(255, 245, 245)"], .rsp-dark [style*="background: rgb(255, 249, 240)"], .rsp-dark [style*="background: rgb(255, 244, 230)"], .rsp-dark [style*="background: rgb(255, 240, 246)"], .rsp-dark [style*="background: rgb(240, 253, 250)"], .rsp-dark [style*="background: rgb(240, 249, 255)"], .rsp-dark [style*="background: rgb(254, 252, 232)"] { background: #312e81 !important; }
          .rsp-dark [style*="color: rgb(30, 41, 59)"] { color: #f1f5f9 !important; }
          .rsp-dark [style*="color: rgb(100, 116, 139)"], .rsp-dark [style*="color: rgb(148, 163, 184)"] { color: #cbd5e1 !important; }
        `}</style>
      )}

      {/* Decorative backdrop (kids only): sits behind all content */}
      {view === "kids" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden" }}>
          <style>{`
            @keyframes kidSticker { 0%,100% { transform: translateY(0) rotate(var(--tilt)); } 50% { transform: translateY(-12px) rotate(calc(var(--tilt) + 5deg)); } }
            @media (prefers-reduced-motion: reduce) { .kid-sticker { animation: none !important; } }
          `}</style>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,107,107,.12) 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
          {[["🧩", 3, 14, 34, -10], ["⭐", 93, 10, 28, 12], ["🎨", 95, 46, 30, -8], ["🏃", 2, 58, 30, 10], ["🎵", 90, 78, 28, -12], ["🌈", 4, 88, 34, 6], ["🚀", 50, 96, 26, -6], ["🦄", 84, 30, 24, 8]].map(([e, x, y, size, tilt], i) => (
            <span key={i} className="kid-sticker" style={{ position: "absolute", left: `${x}%`, top: `${y}%`, fontSize: size, opacity: .4, "--tilt": `${tilt}deg`, animation: `kidSticker ${5 + (i % 3)}s ease-in-out ${i * .4}s infinite` }}>{e}</span>
          ))}
        </div>
      )}

      {/* Top Nav */}
      <div style={{ background: dark ? "linear-gradient(90deg,#4c1d95,#0e7490)" : "linear-gradient(90deg,#0f766e,#1e3a5f)", boxShadow: "0 6px 24px rgba(15,23,42,.18)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>🧠</span>
            <span style={{ fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: 1 }}>Ready Set Play</span>
          </div>
          <div style={{ display: "flex", background: "#ffffff22", borderRadius: 30, overflow: "hidden" }}>
            <button onClick={() => setView("kids")} style={{ padding: "6px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, borderRadius: 30, background: view === "kids" ? "#fff" : "transparent", color: view === "kids" ? "#0f766e" : "#fff", transition: "all .2s" }}>
              🏠 Kids
            </button>
            <button onClick={switchToParent} style={{ padding: "6px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, borderRadius: 30, background: view === "parent" ? "#fff" : "transparent", color: view === "parent" ? "#0f766e" : "#fff", transition: "all .2s" }}>
              🔒 Parent
            </button>
          </div>
          <button onClick={() => setDark(d => !d)} aria-label="Toggle dark mode" title={dark ? "Light mode" : "Dark mode"} style={{ background: "#ffffff22", border: "none", color: "#fff", fontSize: 15, borderRadius: 30, padding: "4px 10px", cursor: "pointer", marginLeft: 8 }}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button onClick={logout} style={{ background: "#ffffff22", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 30, padding: "6px 12px", cursor: "pointer", marginLeft: 8 }}>
            Log out
          </button>
        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notification.color, color: "#fff", padding: "12px 24px", borderRadius: 40, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 30px #0003", whiteSpace: "nowrap" }}>
          {notification.msg}
        </div>
      )}

      {/* ── TASK MODAL ── */}
      {activeTask && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 28, padding: 28, maxWidth: 360, width: "100%", maxHeight: "90vh", overflowY: "auto", textAlign: "center", boxShadow: "0 20px 60px #0005", position: "relative" }}>
            <button onClick={closeModal} style={{ position: "absolute", top: 16, right: 16, background: "#f1f5f9", border: "none", borderRadius: 50, width: 30, height: 30, cursor: "pointer", fontWeight: 700, color: "#64748b", fontSize: 16 }}>✕</button>

            {/* Shared hidden file input for photo/video */}
            <input
              ref={fileInputRef}
              type="file"
              accept={mediaMode === "video" ? "video/*" : "image/*"}
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {/* STEP: pick (outdoor games / something else) */}
            {step === "pick" && (
              <>
                <div style={{ fontSize: 46 }}>{activeTask.icon}</div>
                <h2 style={{ color: "#115e59", margin: "8px 0 4px", fontSize: 20 }}>{activeTask.label}</h2>
                <p style={{ color: "#94a3b8", marginBottom: 14, fontSize: 13 }}>Pick one to play or do</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                  {outdoorOptions.map(o => (
                    <button key={o.id} onClick={() => { setChoice(o); setStep("do"); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", background: "#f0fdfa", border: "2px solid #ccfbf1", borderRadius: 14, padding: "10px 12px", cursor: "pointer" }}>
                      <span style={{ fontSize: 22 }}>{o.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{o.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{o.how}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP: do — outdoor GPS flow */}
            {step === "do" && activeTask.flow === "outdoor" && choice && (
              <>
                <div style={{ fontSize: 46 }}>{choice.icon}</div>
                <h2 style={{ color: "#155e75", margin: "8px 0 4px", fontSize: 20 }}>{choice.name}</h2>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>{choice.how}</p>

                {(gpsStatus === "idle" || gpsStatus === "error") && (
                  <>
                    {gpsStatus === "error" && (
                      <div style={{ background: "#fef2f2", color: "#b91c1c", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{gpsMsg}</div>
                    )}
                    <div style={{ background: "#e0f2fe", border: "2px dashed #22d3ee", borderRadius: 16, padding: 14, marginBottom: 6 }}>
                      <div style={{ fontSize: 30 }}>📍</div>
                      <p style={{ color: "#155e75", fontWeight: 700, margin: "6px 0 2px", fontSize: 13 }}>Go to a park or playground first</p>
                      <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>Keep location turned on for this site</p>
                    </div>
                    <button onClick={runLocationCheck} style={pill("linear-gradient(90deg,#0e7490,#22d3ee)")}>
                      📍 {gpsStatus === "error" ? "Try again" : "Check my location"}
                    </button>
                    <button onClick={() => { setChoice(null); setStep("pick"); }} style={{ background: "transparent", color: "#94a3b8", border: "none", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}>↩ Pick a different game</button>
                  </>
                )}

                {(gpsStatus === "locating" || gpsStatus === "checking") && (
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ fontSize: 40, animation: "pulse 1s ease-in-out infinite" }}>📡</div>
                    <p style={{ color: "#155e75", fontWeight: 700, margin: "8px 0 4px" }}>
                      {gpsStatus === "locating" ? "Finding your exact spot..." : "Checking for a park nearby..."}
                    </p>
                    {gpsStatus === "locating" && (
                      <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
                        {gpsAccuracy !== null ? `Accuracy: ${gpsAccuracy} m` : "Waiting for signal"} · need {GOOD_ACCURACY_M} m or better
                      </p>
                    )}
                  </div>
                )}

                {gpsStatus === "ready" && (
                  <>
                    <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 16, padding: 14, marginBottom: 10, textAlign: "left" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 22 }}>🛰️</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>GPS Verified ✓</div>
                          <div style={{ fontSize: 12, color: "#16a34a" }}>📍 {gpsPlace} · accuracy {gpsAccuracy} m</div>
                        </div>
                      </div>
                    </div>
                    <button onClick={startPlaying} style={pill("linear-gradient(90deg,#16a34a,#22c55e)")}>▶ Start playing</button>
                  </>
                )}

                {(gpsStatus === "playing" || gpsStatus === "finishing") && (
                  <>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Playing at {gpsPlace}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: "#155e75", margin: "4px 0" }}>{fmtTime(playSeconds)}</div>
                    <div style={{ background: "#e0f2fe", borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ background: "linear-gradient(90deg,#0e7490,#22d3ee)", height: "100%", width: `${Math.min((playSeconds / PLAY_MIN_SECONDS) * 100, 100)}%`, transition: "width .5s" }} />
                    </div>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
                      {playSeconds >= PLAY_MIN_SECONDS
                        ? "Great playing! You can finish now 🎉"
                        : `Play for ${fmtTime(PLAY_MIN_SECONDS - playSeconds)} more to finish`}
                    </p>
                    {gpsMsg && (
                      <div style={{ background: "#fef2f2", color: "#b91c1c", borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{gpsMsg}</div>
                    )}
                    <button
                      disabled={playSeconds < PLAY_MIN_SECONDS || gpsStatus === "finishing"}
                      onClick={finishPlaying}
                      style={pill("linear-gradient(90deg,#0f766e,#14b8a6)", playSeconds < PLAY_MIN_SECONDS || gpsStatus === "finishing")}
                    >
                      {gpsStatus === "finishing" ? "Checking your location..." : "🏁 I'm done playing"}
                    </button>
                  </>
                )}
              </>
            )}

            {/* STEP: do — "Something else" */}
            {step === "do" && activeTask.flow === "choice" && choice && (
              <>
                <div style={{ fontSize: 46 }}>{choice.icon}</div>
                <h2 style={{ color: "#115e59", margin: "8px 0 4px", fontSize: 20 }}>{choice.name}</h2>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>{choice.how}</p>
                <div style={{ background: "#f0fdfa", borderRadius: 14, padding: 12, fontSize: 13, color: "#115e59", fontWeight: 600, marginBottom: 6 }}>
                  🎯 Do this activity now. When you're finished, tap the button and upload a photo as proof!
                </div>
                <button onClick={() => setStep("verify")} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)")}>✅ I finished it! Upload proof</button>
                <button onClick={() => { setChoice(null); setStep("pick"); }} style={{ background: "transparent", color: "#94a3b8", border: "none", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}>↩ Pick a different one</button>
              </>
            )}

            {/* STEP: do — Daily discipline checklist */}
            {step === "do" && activeTask.flow === "checklist" && (
              <>
                <div style={{ fontSize: 46 }}>{activeTask.icon}</div>
                <h2 style={{ color: "#115e59", margin: "8px 0 4px", fontSize: 20 }}>Daily Discipline</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>Tick every task you finished today</p>
                <div style={{ fontWeight: 800, color: "#0f766e", fontSize: 13, marginBottom: 10 }}>{doneCount} / {CHECKLIST_ITEMS.length} done</div>
                {CHECKLIST_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setChecks(c => ({ ...c, [item.id]: !c[item.id] }))}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 14, border: `2px solid ${checks[item.id] ? "#86efac" : "#ccfbf1"}`, background: checks[item.id] ? "#f0fdf4" : "#fff", cursor: "pointer", marginBottom: 8, fontWeight: 700, fontSize: 13, color: "#0f172a" }}
                  >
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.text}</span>
                    <span>{checks[item.id] ? "✅" : "⬜"}</span>
                  </button>
                ))}
                <button
                  disabled={doneCount < CHECKLIST_ITEMS.length}
                  onClick={() => setStep("verify")}
                  style={pill("linear-gradient(90deg,#0f766e,#14b8a6)", doneCount < CHECKLIST_ITEMS.length)}
                >
                  📸 Next: upload photo proof
                </button>
              </>
            )}

            {/* STEP: do — Puzzles / riddles */}
            {step === "do" && activeTask.flow === "puzzle" && puzzles[puzzleIdx] && (
              <>
                <div style={{ fontSize: 46 }}>🧩</div>
                <h2 style={{ color: "#115e59", margin: "8px 0 4px", fontSize: 20 }}>Puzzle {puzzleIdx + 1} of {puzzles.length}</h2>
                <div style={{ background: "#f0fdfa", borderRadius: 16, padding: 16, margin: "12px 0", fontWeight: 800, color: "#1e3a5f", fontSize: 16 }}>
                  {puzzles[puzzleIdx].q}
                </div>
                {puzzleWrong >= 1 && (
                  <div style={{ background: "#fefce8", color: "#a16207", borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                    💡 Hint: {puzzles[puzzleIdx].hint}
                  </div>
                )}
                <input
                  value={puzzleInput}
                  onChange={e => setPuzzleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submitPuzzle(); }}
                  placeholder="Type your answer..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "2px solid #ccfbf1", fontSize: 15, outline: "none", textAlign: "center", fontFamily: "inherit" }}
                />
                {puzzleMsg && <p style={{ color: "#0f766e", fontWeight: 700, fontSize: 13, margin: "10px 0 0" }}>{puzzleMsg}</p>}
                <button onClick={submitPuzzle} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)", !puzzleInput.trim())}>✔ Check answer</button>
              </>
            )}

            {/* STEP: verify — photo or video upload */}
            {step === "verify" && (
              <>
                <div style={{ fontSize: 46 }}>{activeTask.icon}</div>
                <h2 style={{ color: "#115e59", margin: "8px 0 4px", fontSize: 19 }}>{activeTask.label}</h2>
                <p style={{ color: "#94a3b8", marginBottom: 14, fontSize: 13 }}>{proofHint}</p>

                {modes.length > 1 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#f0fdfa", borderRadius: 30, padding: 4 }}>
                    {modes.map(m => (
                      <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, border: "none", borderRadius: 30, padding: "8px 10px", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mediaMode === m ? "#0f766e" : "transparent", color: mediaMode === m ? "#fff" : "#0f766e" }}>
                        {m === "video" ? "🎬 Upload Video" : "📸 Upload Photo"}
                      </button>
                    ))}
                  </div>
                )}

                {!mediaPreview ? (
                  <div onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ background: "#f0fdfa", borderRadius: 16, padding: "24px 20px", marginBottom: 6, border: "2px dashed #14b8a6", cursor: "pointer" }}>
                    <div style={{ fontSize: 38 }}>{mediaMode === "video" ? "🎬" : "📸"}</div>
                    <p style={{ color: "#0f766e", fontWeight: 700, margin: "8px 0 2px" }}>Tap to upload a {mediaMode === "video" ? "video" : "photo"}</p>
                    <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>AI will check your upload</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: 6 }}>
                    {mediaFile && mediaFile.type.startsWith("video/") ? (
                      <video src={mediaPreview} controls playsInline muted style={{ width: "100%", maxHeight: 180, borderRadius: 16, border: "3px solid #14b8a6", marginBottom: 10 }} />
                    ) : (
                      <img src={mediaPreview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 16, border: "3px solid #14b8a6", marginBottom: 10 }} />
                    )}
                    <p style={{ color: "#115e59", fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>✅ Selected: {mediaFile && mediaFile.name}</p>
                    <button onClick={verifyMedia} style={pill("linear-gradient(90deg,#0f766e,#14b8a6)")}>
                      🔍 Verify This {mediaMode === "video" ? "Video" : "Photo"}
                    </button>
                    <button
                      onClick={() => {
                        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
                        setMediaFile(null);
                        setMediaPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      style={{ background: "transparent", color: "#94a3b8", border: "none", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 8 }}
                    >
                      ↩ Choose a different one
                    </button>
                  </div>
                )}
              </>
            )}

            {/* STEP: analyzing */}
            {step === "analyzing" && (
              <>
                <div style={{ fontSize: 52 }}>🔄</div>
                <h2 style={{ color: "#115e59", margin: "16px 0 8px" }}>AI Verifying...</h2>
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Checking your upload</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20, textAlign: "left" }}>
                  {["Checking your upload...", "Identifying activity...", "Confirming task match..."].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0fdfa", borderRadius: 12, padding: "10px 14px" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: "3px solid #14b8a6", borderTopColor: "transparent", animation: `spin ${.8 + i * .2}s linear infinite`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#115e59", fontWeight: 600 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* STEP: rejected */}
            {step === "rejected" && (
              <>
                <div style={{ fontSize: 60 }}>🚫</div>
                <h2 style={{ color: "#dc2626", margin: "12px 0 6px", fontSize: 20 }}>Upload Rejected!</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>Our AI found a problem with this upload.</p>
                <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 18, padding: 18, marginBottom: 18, textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
                    <div>
                      <p style={{ fontWeight: 800, color: "#b91c1c", margin: "0 0 4px", fontSize: 14 }}>AI Detection Result</p>
                      <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 8px" }}>{rejectReason || "Upload may be AI-generated or not a real photo"}</p>
                      <div style={{ background: "#fee2e2", borderRadius: 10, padding: "8px 12px" }}>
                        <p style={{ color: "#7f1d1d", fontSize: 11, margin: 0, lineHeight: 1.6 }}>
                          ⚠️ Please upload a genuine {mediaMode === "video" ? "video" : "photo"} you made yourself.<br />
                          AI-generated images, screenshots and fake uploads are not allowed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setRejectReason(""); setStep("verify"); }}
                  style={pill("linear-gradient(90deg,#0f766e,#14b8a6)")}
                >
                  📸 Try a Different Upload
                </button>
                <button onClick={closeModal} style={{ background: "transparent", color: "#94a3b8", border: "none", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 8 }}>
                  Cancel
                </button>
              </>
            )}

            {/* STEP: success */}
            {step === "success" && (
              <>
                <div style={{ fontSize: 60 }}>🎉</div>
                <h2 style={{ color: "#16a34a", margin: "12px 0 4px", fontSize: 22 }}>{successTitle(activeTask)}</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>
                  Great job completing <strong style={{ color: "#1e3a5f" }}>{activeTask.label}</strong>!
                </p>
                <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "2px solid #86efac", borderRadius: 20, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 36 }}>🏆</div>
                  <div style={{ fontWeight: 900, fontSize: 28, color: "#16a34a", margin: "6px 0 2px" }}>+{activeTask.points} Points</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#22c55e" }}>📱 +10 min screen time</div>
                  <div style={{ background: "#86efac", borderRadius: 99, height: 6, marginTop: 10, overflow: "hidden" }}>
                    <div style={{ background: "#16a34a", height: "100%", width: "100%", animation: "growBar .5s ease" }} />
                  </div>
                </div>
                <button onClick={handleClaim} style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)", color: "#fff", border: "none", borderRadius: 40, padding: "14px 36px", fontWeight: 900, fontSize: 17, cursor: "pointer", width: "100%", boxShadow: "0 8px 24px #ffa94d60" }}>
                  Claim Reward! 🎉
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PIN LOCK MODAL ── */}
      {view === "parent" && pinLocked && (
        <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#0f172a,#1e3a5f)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🔒</div>
            <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 24, margin: "0 0 4px" }}>Parent Access</h2>
            <p style={{ color: "#99f6e4", fontSize: 14, marginBottom: 28 }}>Enter your 4-digit PIN to continue</p>

            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 28, animation: pinShake ? "shake .4s ease" : "none" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: pinInput.length > i ? "#14b8a6" : "transparent", border: `3px solid ${pinError ? "#f87171" : "#99f6e4"}`, transition: "all .15s", transform: pinInput.length > i ? "scale(1.2)" : "scale(1)" }} />
              ))}
            </div>

            {pinError && (
              <div style={{ background: "#fef2f2", color: "#ef4444", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                ❌ Incorrect PIN. Try again.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 260, margin: "0 auto" }}>
              {["1","2","3","4","5","6","7","8","9","","0","del"].map((k, i) => (
                <button key={i} onClick={() => k !== "" && handlePinKey(k)} style={{
                  padding: "16px", borderRadius: 16, border: "none", cursor: k ? "pointer" : "default",
                  background: k === "del" ? "#134e4a" : k === "" ? "transparent" : "#ffffff15",
                  color: "#fff", fontWeight: 800, fontSize: k === "del" ? 18 : 20,
                  backdropFilter: "blur(10px)", transition: "all .15s",
                  opacity: k === "" ? 0 : 1,
                }}>
                  {k === "del" ? "⌫" : k}
                </button>
              ))}
            </div>

            <button onClick={() => setView("kids")} style={{ background: "none", border: "none", color: "#99f6e4", cursor: "pointer", fontSize: 13, marginTop: 8, textDecoration: "underline" }}>
              Back to Kids View
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>

        {/* ────── KIDS VIEW ────── */}
        {view === "kids" && (
          <>
            <div style={{ background: "linear-gradient(135deg,#0f766e,#14b8a6)", borderRadius: "0 0 28px 28px", padding: "20px 20px 26px", color: "#fff", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ margin: 0, opacity: .8, fontSize: 13 }}>Welcome back! 👋</p>
                  <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 900 }}>Hi, {user.name}!</h1>
                </div>
                <div style={{ background: "#ffffff22", borderRadius: 16, padding: "8px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, transition: "transform .3s", transform: streakAnim ? "scale(1.5) rotate(10deg)" : "scale(1)" }}>🔥</div>
                  <div style={{ fontWeight: 900, fontSize: 20 }}>{streak}</div>
                  <div style={{ fontSize: 10, opacity: .8 }}>day streak</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {[["⭐", "Points", points], ["📱", "Screen Time", `${screenTime}m`], ["✅", "Today", todayLog.length]].map(([ico, label, val]) => (
                  <div key={label} style={{ flex: 1, background: "#ffffff22", borderRadius: 14, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, opacity: .8 }}>{ico} {label}</div>
                    <div style={{ fontWeight: 900, fontSize: 22 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: .9, marginBottom: 6 }}>
                  <span>Reward Progress</span><span>{totalEarned} / {maxPoints}</span>
                </div>
                <div style={{ background: "#ffffff33", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ background: "#fbbf24", height: "100%", width: `${progress}%`, borderRadius: 99, transition: "width .6s ease" }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 10px", color: "#1e3a5f", fontWeight: 800 }}>🏅 My Badges</h3>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {BADGES.map(b => (
                  <div key={b.id} title={b.desc} style={{ minWidth: 72, background: b.earned ? "linear-gradient(135deg,#fef9c3,#fde68a)" : "#f1f5f9", borderRadius: 16, padding: "10px 8px", textAlign: "center", border: `2px solid ${b.earned ? "#fbbf24" : "#e2e8f0"}`, opacity: b.earned ? 1 : .5, cursor: "help", flexShrink: 0 }}>
                    <div style={{ fontSize: 26 }}>{b.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#115e59", marginTop: 4 }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {breakLeft !== null && (
              <div style={{ background: "linear-gradient(90deg,#0e7490,#22d3ee)", color: "#fff", borderRadius: 20, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>📱 Phone break time</div>
                  <div style={{ fontSize: 12, opacity: .9 }}>Enjoy it! Quests come back when the timer ends.</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtTime(breakLeft)}</div>
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 24, padding: 18, marginBottom: 20, boxShadow: "0 4px 20px #f59e0b22" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 800, color: "#1e3a5f", fontSize: 16 }}>🎁 Reward Shop</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#d97706", background: "#fefce8", padding: "4px 10px", borderRadius: 30 }}>{points} pts</span>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                Phone breaks count toward today's {dailyLimit}-min limit ({Math.max(0, dailyLimit - breakUsed)} min left).
              </p>
              {SHOP_ITEMS.map(item => {
                const canAfford = points >= item.cost;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #f1f5f9", borderRadius: 14, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{item.icon} {item.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.cost} pts</div>
                    </div>
                    <button onClick={() => redeem(item)} style={{ background: canAfford ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "#e2e8f0", color: canAfford ? "#fff" : "#94a3b8", border: "none", borderRadius: 30, padding: "6px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Redeem</button>
                  </div>
                );
              })}

              <div style={{ marginTop: 10, background: "#f0fdfa", borderRadius: 16, padding: 14, textAlign: "center" }}>
                <div style={{ fontWeight: 800, color: "#115e59", fontSize: 14 }}>🎉 Surprise Chest</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "8px 0" }}>
                  {[...Array(QUESTS_PER_CHEST)].map((_, i) => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < questsSinceChest ? "#14b8a6" : "#ccfbf1" }} />
                  ))}
                </div>
                {questsSinceChest >= QUESTS_PER_CHEST ? (
                  <button onClick={openChest} style={{ background: "linear-gradient(90deg,#0f766e,#14b8a6)", color: "#fff", border: "none", borderRadius: 30, padding: "8px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Open chest!</button>
                ) : (
                  <div style={{ fontSize: 12, color: "#7e22ce" }}>Complete {QUESTS_PER_CHEST - questsSinceChest} more quest{QUESTS_PER_CHEST - questsSinceChest === 1 ? "" : "s"} to open it</div>
                )}
              </div>
            </div>

            {coachPick && (() => {
              const pick = ACTIVITIES.find(a => a.id === coachPick);
              return (
                <div style={{ background: "linear-gradient(135deg,#0f172a,#134e4a)", borderRadius: 24, padding: 18, color: "#fff", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: .85 }}>🤖 AI Coach suggests</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0" }}>
                    <div style={{ fontSize: 30 }}>{pick.icon}</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>{pick.label}</div>
                      <div style={{ fontSize: 12, opacity: .8 }}>Learned from {rlSteps} quest{rlSteps === 1 ? "" : "s"} so far</div>
                    </div>
                  </div>
                  <button onClick={() => startTask(pick)} style={{ background: "#fbbf24", color: "#0f172a", border: "none", borderRadius: 40, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", width: "100%" }}>▶ Try this quest</button>
                </div>
              );
            })()}

            <div style={{ background: "#fff", borderRadius: 24, padding: 18, boxShadow: "0 4px 20px #ff6b6b18" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 800, color: "#1e3a5f", fontSize: 16 }}>Choose Activity</span>
                <span style={{ fontSize: 11, color: "#14b8a6", fontWeight: 700, background: "#f0fdfa", padding: "4px 10px", borderRadius: 30 }}>📍 GPS + AI Ready</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["All","Favs","Tokens","Gems"].map(t => (
                  <button key={t} onClick={() => setFilterTab(t)} style={{ padding: "5px 14px", borderRadius: 30, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: filterTab === t ? "#0f766e" : "#f0fdfa", color: filterTab === t ? "#fff" : "#0f766e", transition: "all .2s" }}>
                    {t}
                  </button>
                ))}
              </div>
              <div style={{ background: "#f0fdfa", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span>🔍</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tasks..." style={{ border: "none", background: "transparent", flex: 1, fontSize: 14, outline: "none", color: "#333" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {filteredActivities.map(a => (
                  <button key={a.id} onClick={() => startTask(a)} style={{ background: "linear-gradient(135deg,#f0fdfa,#f0fdfa)", border: "2px solid #ccfbf1", borderRadius: 16, padding: "14px 12px", textAlign: "left", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ background: a.flow === "outdoor" ? "linear-gradient(135deg,#0e7490,#22d3ee)" : "linear-gradient(135deg,#0f766e,#14b8a6)", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {a.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", lineHeight: 1.3 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "#14b8a6", fontWeight: 700, marginTop: 3 }}>+{a.points} pts</div>
                      <div style={{ fontSize: 10, color: a.flow === "outdoor" ? "#0e7490" : "#c084fc", marginTop: 1 }}>{verifyTag(a)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ────── PARENT VIEW ────── */}
        {view === "parent" && !pinLocked && (
          <>
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius: "0 0 28px 28px", padding: "20px 20px 26px", color: "#fff", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, opacity: .7, fontSize: 12 }}>Saturday, February 21, 2026</p>
                  <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900 }}>Parent Dashboard</h1>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 36 }}>🛡️</div>
                  <button onClick={() => { setPinLocked(true); setPinInput(""); }} style={{ background: "#ffffff22", border: "none", color: "#fff", fontSize: 11, borderRadius: 30, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>
                    🔒 Lock
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {[["Tasks Today", todayLog.length, "#99f6e4"], ["Points Earned", todayPoints, "#fbbf24"], ["Screen Earned", `${screenTime}m`, "#34d399"]].map(([label, val, color]) => (
                  <div key={label} style={{ flex: 1, background: "#ffffff1a", borderRadius: 14, padding: 12 }}>
                    <div style={{ fontSize: 11, opacity: .8 }}>{label}</div>
                    <div style={{ fontWeight: 900, fontSize: 24, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: "0 4px 20px #0001" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
                {["Daily Report","Weekly Report","Tasks Done","Custom"].map(t => (
                  <button key={t} onClick={() => setReportTab(t)} style={{ padding: "6px 14px", borderRadius: 30, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", background: reportTab === t ? "#1e3a5f" : "#f1f5f9", color: reportTab === t ? "#fff" : "#64748b", transition: "all .2s" }}>
                    {t === "Daily Report" ? "📋" : t === "Weekly Report" ? "📅" : t === "Tasks Done" ? "✅" : "⚙️"} {t}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Tasks Completed Today", val: todayLog.length, bg: "#f0fdfa", color: "#134e4a" },
                  { label: "Points Earned Today", val: todayPoints, bg: "#fefce8", color: "#d97706" },
                  { label: "Screen Time Earned", val: `${screenTime} mins`, bg: "#f0fdf4", color: "#16a34a" },
                  { label: "🔥 Current Streak", val: `${streak} days`, bg: "#fff7ed", color: "#ea580c" },
                ].map(({ label, val, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: 16, padding: 16 }}>
                    <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 900, fontSize: 26, color }}>{val}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ margin: "0 0 12px", color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}>✅ Activity History</h3>
              {log.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{item.activity}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {item.time} · <span style={{ color: item.verify?.includes("GPS") ? "#0ea5e9" : "#14b8a6" }}>{item.verify}</span>
                    </div>
                  </div>
                  <div style={{ background: "#f0fdf4", color: "#16a34a", fontWeight: 800, fontSize: 13, padding: "4px 12px", borderRadius: 30 }}>+{item.points} pts</div>
                </div>
              ))}
            </div>

            {/* Rewards and phone breaks */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: "0 4px 20px #0001" }}>
              <h3 style={{ margin: "0 0 12px", color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}>🎁 Rewards and phone breaks</h3>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "#f0f9ff", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 11, color: "#0369a1", fontWeight: 700 }}>Phone break used today</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#0369a1" }}>{breakUsed} / {dailyLimit} min</div>
                </div>
                <div style={{ flex: 1, background: "#fefce8", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontSize: 11, color: "#a16207", fontWeight: 700 }}>Points to spend</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#a16207" }}>{points}</div>
                </div>
              </div>
              {redeemed.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>No rewards redeemed yet.</div>
              ) : redeemed.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#1e293b", fontWeight: 700 }}>{r.name}</span>
                  <span style={{ color: "#d97706", fontWeight: 800 }}>−{r.cost} pts</span>
                </div>
              ))}
            </div>

            {/* AI Coach: reinforcement learning panel */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: "0 4px 20px #0001" }}>
              <h3 style={{ margin: "0 0 4px", color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}>🤖 AI Coach (reinforcement learning)</h3>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                The agent learns which quests earn the most points for this child and suggests the next one. Points are the reward. A rejected upload gives a reward of 0.
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[["Learning steps", rlSteps], ["Exploration ε", `${Math.round(epsilon * 100)}%`], ["Learning rate α", RL_ALPHA]].map(([l, v]) => (
                  <div key={l} style={{ flex: 1, background: "#f0fdfa", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "#115e59", fontWeight: 700 }}>{l}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "#134e4a" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>Learned value per quest (starts at {RL_OPTIMISTIC_Q})</div>
              {ACTIVITIES.map(a => {
                const v = qTable[a.id].q;
                const pct = Math.max(0, Math.min(100, (v / RL_MAX_REWARD) * 100));
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <div style={{ width: 130, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.icon} {a.label}</div>
                    <div style={{ flex: 1, background: "#f0fdfa", borderRadius: 99, height: 10, overflow: "hidden" }}>
                      <div style={{ background: "linear-gradient(90deg,#0d9488,#14b8a6)", height: "100%", width: `${pct}%`, transition: "width .5s" }} />
                    </div>
                    <div style={{ width: 36, textAlign: "right", fontWeight: 700, color: "#134e4a" }}>{v.toFixed(1)}</div>
                  </div>
                );
              })}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a5f", margin: "14px 0 8px" }}>Reward from each recent quest</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
                {rewardHistory.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No quests yet. Finish a quest to watch the agent learn.</div>}
                {rewardHistory.map((h, i) => (
                  <div key={i} title={`Reward ${h.reward}`} style={{ flex: 1, background: h.reward > 0 ? "#0f766e" : "#f87171", height: `${Math.max(8, (h.reward / RL_MAX_REWARD) * 100)}%`, borderRadius: 4 }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Purple = verified quest (points) · Red = rejected upload (0)</div>
            </div>

            <div style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: "0 4px 20px #0001" }}>
              <h3 style={{ margin: "0 0 14px", color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}>⚙️ Screen Time Controls</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#475569" }}>Daily Max Screen Time</span>
                <span style={{ fontWeight: 800, color: "#115e59", fontSize: 16 }}>{dailyLimit} min</span>
              </div>
              <input type="range" min={20} max={120} step={10} value={dailyLimit} onChange={e => { setDailyLimit(Number(e.target.value)); showNotif(`Daily limit set to ${e.target.value} mins`); }} style={{ width: "100%", accentColor: "#0f766e" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                <span>20 min</span><span>120 min</span>
              </div>
              <div style={{ marginTop: 14, background: "#f0fdfa", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#115e59", fontWeight: 700, marginBottom: 6 }}>
                  <span>Used: {breakUsed} min</span><span>Limit: {dailyLimit} min</span>
                </div>
                <div style={{ background: "#ccfbf1", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ background: `linear-gradient(90deg,${breakUsed / dailyLimit > .8 ? "#ef4444,#f87171" : "#0f766e,#14b8a6"})`, height: "100%", width: `${Math.min((breakUsed / dailyLimit) * 100, 100)}%`, borderRadius: 99, transition: "width .5s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{Math.round((breakUsed / dailyLimit) * 100)}% of daily limit used</div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 4px 20px #0001" }}>
              <h3 style={{ margin: "0 0 14px", color: "#1e3a5f", fontWeight: 800, fontSize: 14 }}>🏅 Child's Badge Progress</h3>
              {BADGES.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: b.earned ? "#fefce8" : "#f8fafc", borderRadius: 14, border: `1px solid ${b.earned ? "#fde68a" : "#e2e8f0"}`, marginBottom: 8 }}>
                  <span style={{ fontSize: 26, opacity: b.earned ? 1 : .4 }}>{b.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{b.desc}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.earned ? "#16a34a" : "#cbd5e1" }}>{b.earned ? "✅ Earned" : "🔒 Locked"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes bounce2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes growBar { from { width:0 } to { width:100% } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
        button { transition: transform .15s, opacity .15s; }
        button:active { transform: scale(.94) !important; }
      `}</style>
    </div>
  );
}
