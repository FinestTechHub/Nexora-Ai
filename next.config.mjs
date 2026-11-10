// Cleans the Supabase address so a hidden space, a trailing "/" or a leftover "/rest/v1/" can never break login.
const clean = (u = "") => {
  try { return new URL(u.trim().replace(/^["']|["']$/g, "")).origin; } catch { return u.trim(); }
};

const nextConfig = {
  env: { NEXT_PUBLIC_SUPABASE_URL: clean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
};

export default nextConfig;
