const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
// /api が含まれていない場合は自動で追加し、末尾のスラッシュは取り除く
export const API_BASE = (rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api`);
