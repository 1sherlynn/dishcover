# Client-only persistence with a thin serverless LLM proxy

Dishcover's MVP has no auth and no user database — deliberately. All user data (Pantry, Avoid List, Equipment, Dietary Preferences, generated recipes, favorites, Theme choice) lives in browser storage on the user's device, persistent across visits. The only backend is a thin Next.js API-route proxy on Vercel whose sole jobs are: hold the LLM API key server-side, enforce a per-IP rate limit, and enforce a hard daily spend cap. The app is deployed publicly but is for personal + friends use, not a promoted launch — which is why light abuse protection is sufficient.

Consequences: data is per-device/per-browser and lost if browser data is cleared; there is deliberately no server-side record of users or recipes. If accounts ever arrive, this becomes a client→server data migration, accepted knowingly to keep a 30-day solo build focused on product.
