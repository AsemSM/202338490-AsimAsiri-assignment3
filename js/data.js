// Project data. Loaded first: js/projects.js reads PROJECTS and
// PROJECT_TOPICS to build the cards and the filter buttons.
// Kept as a .js file rather than .json because fetching local JSON is blocked
// when the page is opened straight from disk (file://).
//
// The array order is the "Featured" sort order.
//
// Fields
//   id          unique, stable key
//   name        project name shown as the card heading
//   nameNative  optional name in its original language, with its lang code
//   year        year of the event or work, used by the "Newest" sort
//   event       where it was built or shown, shown before the result
//   result      placement or status
//   description one or two short sentences
//   tags        technologies used, shown as chips and searched
//   topics      filter groups, each one must be listed in PROJECT_TOPICS

// Filter buttons appear in this order, after "All".
const PROJECT_TOPICS = ["AI", "Web", "Hackathon", "Games"];

const PROJECTS = [
  {
    id: "bayn",
    name: "Bayn",
    year: 2026,
    event: "MASAR",
    result: "Final phase, top 60 of 6,000",
    description:
      "A B2B RFQ platform. A business owner describes what they need to outfit a space " +
      "in plain free text, and the platform turns that into structured specs, matches " +
      "verified suppliers, and returns one comparison table instead of them chasing " +
      "quotes manually.",
    tags: ["React", "TypeScript", "Tailwind", "Zod", "Gemini Flash", "Wathq API"],
    topics: ["AI", "Web"]
  },
  {
    id: "tahseel",
    name: "Tahseel",
    year: 2026,
    event: "VentureX",
    result: "Finalist, top 20 of 1,600+",
    description: "A VentureX finalist prototype built on Google OR-Tools, an optimization library.",
    tags: ["Google OR-Tools"],
    topics: ["AI", "Web", "Hackathon"]
  },
  {
    id: "nahj",
    name: "Nahj",
    year: 2026,
    event: "Farq Hackathon",
    result: "Finalist, top 20 of 650+",
    description: "A Farq Hackathon finalist prototype built on UniTime, an open source university timetabling system.",
    tags: ["UniTime"],
    topics: ["AI", "Web", "Hackathon"]
  },
  {
    id: "rasd",
    name: "RASD",
    nameNative: { text: "رصد", lang: "ar" },
    year: 2026,
    event: "Sharqiyah Province Hackathon",
    result: "1st place",
    description:
      "A dashboard that pulls government service complaints together, classifies each " +
      "against 6 standard performance indicators, and flags high-risk issues before they " +
      "escalate. It includes a live-complaint heatmap, ministry leaderboard, and " +
      "root-cause breakdown per issue.",
    tags: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Leaflet"],
    topics: ["AI", "Web", "Hackathon"]
  },
  {
    id: "ai-file-manager",
    name: "AI File Manager",
    year: 2026,
    event: "Personal project",
    result: "In progress",
    description: "A desktop file manager with AI features through the Claude API. Still in progress.",
    tags: ["Electron", "React", "Node.js", "Claude API"],
    topics: ["AI"]
  },
  {
    id: "swarm-satellite-tracking",
    name: "Swarm Satellite Tracking",
    year: 2026,
    event: "OAG Hackathon",
    result: "2nd place",
    description: "An AI swarm system for tracking satellites, built as a hackathon prototype.",
    tags: ["AI", "Python", "JavaScript"],
    topics: ["AI", "Hackathon"]
  },
  {
    id: "qattapay",
    name: "QattaPay",
    year: 2025,
    event: "Streamathon",
    result: "Live demo to judges",
    description: "A group payment system built on the Stream API, demoed live to the judges.",
    tags: ["JavaScript", "Stream API", "Node.js"],
    topics: ["Web", "Hackathon"]
  },
  {
    id: "verdant",
    name: "Verdant",
    year: 2025,
    event: "Saudi game developer expo",
    result: "Presented",
    description:
      "A task-based survival game built in PICO-8 and Lua. Now being ported to Unity " +
      "for a Steam release.",
    tags: ["PICO-8", "Lua", "Unity"],
    topics: ["Games"]
  },
  {
    id: "abra-ca-burger",
    name: "Abra-Ca-Burger",
    year: 2026,
    event: "ByteVectors internship",
    result: "Game mechanics lead",
    description: "A game built in Godot during my ByteVectors internship, where I led the game mechanics.",
    tags: ["Godot", "GDScript"],
    topics: ["Games"]
  }
];
