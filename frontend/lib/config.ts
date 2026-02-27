const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081").trim();

// プロトコル補完 (Railwayなどはhttps、ローカルはhttp)
let url = rawApiUrl;
if (!url.startsWith("http")) {
  url = (url.includes("localhost") || url.includes("127.0.0.1")) ? `http://${url}` : `https://${url}`;
}

// 末尾のスラッシュを除去
url = url.replace(/\/$/, "");

// /api の二重付与を防ぎつつ必ず付加する
export const API_BASE = url.endsWith("/api") ? url : `${url}/api`;

console.log("DEBUG: API_BASE is set to:", API_BASE);
