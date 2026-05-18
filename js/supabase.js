// ============================================================
//  CREDENTIALS SUPABASE — à renseigner avant tout déploiement
// ============================================================
const SUPABASE_URL = "https://rfirfcpsjoushvhtbyqk.supabase.co";      // ← ligne 2 : coller votre Project URL ici
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaXJmY3Bzam91c2h2aHRieXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTMzOTUsImV4cCI6MjA5NDAyOTM5NX0.TgtvfWzBoNA1hjpLlgR57RbqBKPg9fzdjcJEIffbtfg";      // ← ligne 3 : coller votre Anon public key ici
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
