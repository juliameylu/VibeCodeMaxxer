module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/lib/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appConfig",
    ()=>appConfig,
    "hasCanvasConfig",
    ()=>hasCanvasConfig,
    "hasFoursquareConfig",
    ()=>hasFoursquareConfig
]);
const appConfig = {
    studentFirstName: ("TURBOPACK compile-time value", "Faith") || "Faith",
    studentInterests: (("TURBOPACK compile-time value", "live music,coastal walks,coffee shops") || "live music,coastal walks,coffee shops").split(",").map((value)=>value.trim()).filter(Boolean),
    location: {
        lat: Number(("TURBOPACK compile-time value", "35.2828") || 35.2828),
        lon: Number(("TURBOPACK compile-time value", "-120.6596") || -120.6596)
    },
    canvas: {
        baseUrl: process.env.CANVAS_BASE_URL,
        token: process.env.CANVAS_API_TOKEN
    },
    foursquare: {
        apiKey: process.env.FOURSQUARE_API_KEY
    }
};
function hasCanvasConfig() {
    return Boolean(appConfig.canvas.baseUrl && appConfig.canvas.token);
}
function hasFoursquareConfig() {
    return Boolean(appConfig.foursquare.apiKey);
}
}),
"[project]/lib/mock-data.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "plannerData",
    ()=>plannerData
]);
const now = Date.now();
const plannerData = {
    profile: {
        firstName: "Faith",
        interests: [
            "live music",
            "coastal walks",
            "coffee shops"
        ]
    },
    weather: {
        condition: "Partly Cloudy",
        tempF: 61,
        summary: "Cool morning in SLO, solid day for indoor study blocks and an evening walk."
    },
    assignments: [
        {
            id: "a1",
            title: "CSC 307 Sprint Retrospective",
            course: "CSC 307",
            dueAt: new Date(now + 20 * 60 * 60 * 1000).toISOString(),
            estimatedMinutes: 80,
            priority: "high"
        },
        {
            id: "a2",
            title: "STAT 312 Problem Set 4",
            course: "STAT 312",
            dueAt: new Date(now + 30 * 60 * 60 * 1000).toISOString(),
            estimatedMinutes: 110,
            priority: "high"
        },
        {
            id: "a3",
            title: "ENGL 241 Reading Notes",
            course: "ENGL 241",
            dueAt: new Date(now + 58 * 60 * 60 * 1000).toISOString(),
            estimatedMinutes: 45,
            priority: "medium"
        }
    ],
    suggestions: [
        {
            id: "p1",
            category: "Restaurants",
            name: "Firestone Grill",
            distanceMiles: 0.8,
            info: "Quick tri-tip, open late",
            openNow: true
        },
        {
            id: "p2",
            category: "Coffee",
            name: "Scout Coffee",
            distanceMiles: 1.2,
            info: "Study-friendly, Wi-Fi",
            openNow: true
        },
        {
            id: "p3",
            category: "Movies",
            name: "Palm Theatre",
            distanceMiles: 1.1,
            info: "Indie films, student pricing nights",
            openNow: false
        },
        {
            id: "p4",
            category: "Shopping",
            name: "Downtown Centre",
            distanceMiles: 0.9,
            info: "Errands and basics",
            openNow: true
        },
        {
            id: "p5",
            category: "Beaches",
            name: "Avila Beach",
            distanceMiles: 9.3,
            info: "Coastal weather 58F, light wind",
            openNow: true
        },
        {
            id: "p6",
            category: "Hikes",
            name: "Bishop Peak Trail",
            distanceMiles: 2.5,
            info: "Dry trail, sunset viewpoint",
            openNow: true
        },
        {
            id: "p7",
            category: "Game Stores",
            name: "Captain Nemo Games",
            distanceMiles: 1.4,
            info: "Board games and TCG events",
            openNow: true
        },
        {
            id: "p8",
            category: "Makerspaces",
            name: "Cal Poly Innovation Sandbox",
            distanceMiles: 0.4,
            info: "Project build benches + mentors",
            openNow: true
        },
        {
            id: "p9",
            category: "School Supplies",
            name: "University Store",
            distanceMiles: 0.3,
            info: "Notebooks, printing, chargers",
            openNow: true
        },
        {
            id: "p10",
            category: "Music Events",
            name: "SLO Brew Rock",
            distanceMiles: 1.0,
            info: "Live set at 8:30 PM",
            openNow: false
        },
        {
            id: "p11",
            category: "Farmers Market",
            name: "Downtown Thursday Market",
            distanceMiles: 1.2,
            info: "Next window Thu 6:00 PM",
            openNow: false
        },
        {
            id: "p12",
            category: "Sporting Events",
            name: "Mustangs Soccer",
            distanceMiles: 0.8,
            info: "Kickoff 7:00 PM",
            openNow: false
        },
        {
            id: "p13",
            category: "Performances",
            name: "PAC Main Stage",
            distanceMiles: 0.6,
            info: "Student improv tonight",
            openNow: false
        }
    ]
};
}),
"[project]/lib/providers/canvas.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchCanvasAssignments",
    ()=>fetchCanvasAssignments
]);
function estimateMinutes(pointsPossible) {
    if (!pointsPossible || pointsPossible < 25) return 45;
    if (pointsPossible < 60) return 75;
    return 110;
}
function getPriorityFromDueDate(dueAt) {
    const hours = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hours <= 36) return "high";
    if (hours <= 72) return "medium";
    return "low";
}
async function fetchCanvasAssignments(baseUrl, token) {
    try {
        const cleanBase = baseUrl.replace(/\/$/, "");
        const url = `${cleanBase}/api/v1/users/self/todo?per_page=20`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            next: {
                revalidate: 300
            }
        });
        if (!res.ok) {
            return [];
        }
        const todos = await res.json();
        return todos.map((todo)=>{
            const assignment = todo.assignment;
            if (!assignment?.id || !assignment.name || !assignment.due_at) {
                return null;
            }
            const dueAt = assignment.due_at;
            return {
                id: String(assignment.id),
                title: assignment.name,
                course: todo.context_name || `Course ${assignment.course_id ?? ""}`.trim(),
                dueAt,
                estimatedMinutes: estimateMinutes(assignment.points_possible),
                priority: getPriorityFromDueDate(dueAt)
            };
        }).filter((item)=>Boolean(item)).sort((a, b)=>new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    } catch  {
        return [];
    }
}
}),
"[project]/lib/providers/places.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchPlacesByCategory",
    ()=>fetchPlacesByCategory
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-rsc] (ecmascript)");
;
const queryByCategory = {
    Restaurants: "restaurant",
    Coffee: "coffee shop",
    Movies: "movie theater",
    Shopping: "shopping center",
    Beaches: "beach",
    Hikes: "hiking trail",
    "Game Stores": "game store",
    Makerspaces: "makerspace",
    "School Supplies": "office supply store",
    "Music Events": "live music venue",
    "Farmers Market": "farmers market",
    "Sporting Events": "stadium",
    Performances: "performing arts theater"
};
function toMiles(distanceMeters) {
    if (!distanceMeters) return 0;
    return Math.round(distanceMeters * 0.000621371 * 10) / 10;
}
async function fetchOneCategory(category, apiKey) {
    const query = queryByCategory[category];
    const ll = `${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].location.lat},${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].location.lon}`;
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}` + `&ll=${encodeURIComponent(ll)}&radius=10000&limit=1&sort=DISTANCE`;
    const res = await fetch(url, {
        headers: {
            Accept: "application/json",
            Authorization: apiKey
        },
        next: {
            revalidate: 1800
        }
    });
    if (!res.ok) {
        return null;
    }
    const data = await res.json();
    const item = data.results?.[0];
    if (!item?.name) {
        return null;
    }
    const descriptor = item.categories?.[0]?.name || query;
    return {
        id: item.fsq_id || `${category.toLowerCase().replace(/\s+/g, "-")}-fallback`,
        category,
        name: item.name,
        distanceMiles: toMiles(item.distance),
        info: `${descriptor} near campus`,
        openNow: Boolean(item.hours?.open_now)
    };
}
async function fetchPlacesByCategory(categories, apiKey) {
    const settled = await Promise.allSettled(categories.map((category)=>fetchOneCategory(category, apiKey)));
    return settled.map((result)=>result.status === "fulfilled" ? result.value : null).filter((item)=>Boolean(item));
}
}),
"[project]/lib/providers/weather.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchWeather",
    ()=>fetchWeather
]);
function weatherCodeToCondition(code) {
    if (code === undefined) return "Unknown";
    if (code === 0) return "Clear";
    if ([
        1,
        2,
        3
    ].includes(code)) return "Partly Cloudy";
    if ([
        45,
        48
    ].includes(code)) return "Foggy";
    if ([
        51,
        53,
        55,
        61,
        63,
        65,
        80,
        81,
        82
    ].includes(code)) return "Rain";
    if ([
        71,
        73,
        75,
        77,
        85,
        86
    ].includes(code)) return "Snow";
    if ([
        95,
        96,
        99
    ].includes(code)) return "Thunderstorms";
    return "Cloudy";
}
async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` + "&current=temperature_2m,weather_code&temperature_unit=fahrenheit";
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            next: {
                revalidate: 900
            }
        });
        if (!res.ok) {
            return null;
        }
        const data = await res.json();
        const tempF = Math.round(data.current?.temperature_2m ?? 0);
        const condition = weatherCodeToCondition(data.current?.weather_code);
        return {
            condition,
            tempF,
            summary: `${condition} in San Luis Obispo. Plan focused study blocks around your class schedule.`
        };
    } catch  {
        return null;
    }
}
}),
"[project]/lib/types.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CATEGORY_ORDER",
    ()=>CATEGORY_ORDER
]);
const CATEGORY_ORDER = [
    "Restaurants",
    "Coffee",
    "Movies",
    "Shopping",
    "Beaches",
    "Hikes",
    "Game Stores",
    "Makerspaces",
    "School Supplies",
    "Music Events",
    "Farmers Market",
    "Sporting Events",
    "Performances"
];
}),
"[project]/lib/planner-data.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getPlannerData",
    ()=>getPlannerData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mock-data.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$canvas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/providers/canvas.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$places$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/providers/places.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$weather$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/providers/weather.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/types.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
function cloneFallback() {
    return {
        profile: {
            firstName: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plannerData"].profile.firstName,
            interests: [
                ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plannerData"].profile.interests
            ]
        },
        weather: {
            ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plannerData"].weather
        },
        assignments: [
            ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plannerData"].assignments
        ],
        suggestions: [
            ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plannerData"].suggestions
        ]
    };
}
function mergeSuggestions(liveSuggestions, fallbackSuggestions) {
    const bestByCategory = new Map();
    for (const suggestion of liveSuggestions){
        bestByCategory.set(suggestion.category, suggestion);
    }
    for (const suggestion of fallbackSuggestions){
        if (!bestByCategory.has(suggestion.category)) {
            bestByCategory.set(suggestion.category, suggestion);
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CATEGORY_ORDER"].map((category)=>bestByCategory.get(category)).filter((item)=>Boolean(item));
}
async function getPlannerData() {
    const base = cloneFallback();
    base.profile.firstName = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].studentFirstName;
    base.profile.interests = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].studentInterests;
    const [weatherResult, assignmentsResult, placesResult] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$weather$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fetchWeather"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].location.lat, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].location.lon),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasCanvasConfig"])() ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$canvas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fetchCanvasAssignments"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].canvas.baseUrl, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].canvas.token) : Promise.resolve([]),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasFoursquareConfig"])() ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$providers$2f$places$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fetchPlacesByCategory"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CATEGORY_ORDER"], __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appConfig"].foursquare.apiKey) : Promise.resolve([])
    ]);
    if (weatherResult) {
        base.weather = weatherResult;
    }
    if (assignmentsResult.length > 0) {
        base.assignments = assignmentsResult;
    }
    if (placesResult.length > 0) {
        base.suggestions = mergeSuggestions(placesResult, base.suggestions);
    }
    return base;
}
}),
"[project]/lib/smart-mode.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getModeCopy",
    ()=>getModeCopy,
    "getUrgentAssignments",
    ()=>getUrgentAssignments,
    "getWorkloadMode",
    ()=>getWorkloadMode
]);
const HOURS_36 = 36;
const HOURS_72 = 72;
function hoursUntil(dateIso) {
    const now = Date.now();
    const target = new Date(dateIso).getTime();
    return (target - now) / (1000 * 60 * 60);
}
function getUrgentAssignments(assignments) {
    return assignments.filter((item)=>{
        const hours = hoursUntil(item.dueAt);
        return hours > 0 && hours <= HOURS_36;
    });
}
function getWorkloadMode(assignments) {
    const urgentCount = getUrgentAssignments(assignments).length;
    if (urgentCount >= 2) {
        return "WORK_FIRST";
    }
    const mediumWindowCount = assignments.filter((item)=>{
        const hours = hoursUntil(item.dueAt);
        return hours > HOURS_36 && hours <= HOURS_72;
    }).length;
    if (urgentCount === 0 && mediumWindowCount === 0) {
        return "FUN_FIRST";
    }
    return "BALANCED";
}
function getModeCopy(mode, urgentCount) {
    if (mode === "WORK_FIRST") {
        return {
            title: "Do your work first, then pick a nearby reward",
            body: `You have ${urgentCount} assignments due in the next 36 hours. Knock out your top task, then take a local break.`
        };
    }
    if (mode === "FUN_FIRST") {
        return {
            title: "No urgent school work right now",
            body: "Deadlines are clear for today. Explore hikes, events, performances, and local spots around SLO."
        };
    }
    return {
        title: "Balanced day plan",
        body: "Do one focused school block, then take one local activity break to keep momentum."
    };
}
}),
"[project]/app/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomePage,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$planner$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/planner-data.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$smart$2d$mode$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/smart-mode.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/types.ts [app-rsc] (ecmascript)");
;
;
;
;
function formatDue(dateIso) {
    return new Date(dateIso).toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
    });
}
function AssignmentItem({ assignment }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        className: "tile task-item",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "eyebrow",
                children: assignment.course
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                children: assignment.title
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    "Due ",
                    formatDue(assignment.dueAt)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    assignment.estimatedMinutes,
                    " min estimate"
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
function PlaceItem({ place }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        className: "tile place-item",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                children: place.name
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: place.info
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: [
                    place.distanceMiles,
                    " mi away"
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: place.openNow ? "status open" : "status closed",
                children: place.openNow ? "Open now" : "Check hours"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
const dynamic = "force-dynamic";
async function HomePage() {
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$planner$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPlannerData"])();
    const urgent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$smart$2d$mode$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUrgentAssignments"])(data.assignments);
    const mode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$smart$2d$mode$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getWorkloadMode"])(data.assignments);
    const modeCopy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$smart$2d$mode$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getModeCopy"])(mode, urgent.length);
    const suggestionsByCategory = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CATEGORY_ORDER"].map((category)=>({
            category,
            items: data.suggestions.filter((item)=>item.category === category)
        }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "shell",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "hero reveal",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "eyebrow",
                        children: "SLO Student Day Planner"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        children: [
                            "Hello, ",
                            data.profile.firstName,
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": true,
                                children: "👋"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 55,
                                columnNumber: 43
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            data.weather.condition,
                            ", ",
                            data.weather.tempF,
                            "F. ",
                            data.weather.summary
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "grid-two reveal delay-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: "Today's Top 3 Priorities"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "list",
                                children: data.assignments.slice(0, 3).map((assignment)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(AssignmentItem, {
                                        assignment: assignment
                                    }, assignment.id, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "panel mode-panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "eyebrow",
                                children: "Smart Mode"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: modeCopy.title
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: modeCopy.body
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mode-tag",
                                children: [
                                    "Mode: ",
                                    mode.replace("_", " ")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "panel reveal delay-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        children: "What's Open Around You (SLO)"
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "categories",
                        children: suggestionsByCategory.map(({ category, items })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                className: "category-block",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: category
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 85,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "list compact",
                                        children: items.map((place)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(PlaceItem, {
                                                place: place
                                            }, place.id, false, {
                                                fileName: "[project]/app/page.tsx",
                                                lineNumber: 88,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 86,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, category, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 84,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "grid-two reveal delay-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: "Suggested After-Class Plan"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 98,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "list",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Grab supplies at University Store before your STAT set."
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 100,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Book a quick maker session for your CSC milestone."
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 101,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Plan dinner at Firestone Grill before evening study."
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 102,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 99,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "panel",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: "Data Sources to Plug In"
                            }, void 0, false, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "list",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Canvas API: classes, grades, assignment deadlines"
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 109,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Weather API: current + hourly forecast"
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 110,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "Maps/Places API: nearby open locations by category"
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 111,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "tile",
                                        children: "User profile: interests, preferred activity types"
                                    }, void 0, false, {
                                        fileName: "[project]/app/page.tsx",
                                        lineNumber: 112,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/page.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/page.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/page.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4f28f9c3._.js.map