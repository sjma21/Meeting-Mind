import { supabase } from "../lib/supabase.js";

export interface ApiKeys {
  claudeKey?: string;
  openrouterKey?: string;
  recallKey?: string;
  githubToken?: string;
}

export async function getApiKeys(userId: string): Promise<ApiKeys> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("claude_key, openrouter_key, recall_key, github_token")
    .eq("user_id", userId)
    .single();

  if (error || !data) return {};

  return {
    claudeKey: data.claude_key ?? undefined,
    openrouterKey: data.openrouter_key ?? undefined,
    recallKey: data.recall_key ?? undefined,
    githubToken: data.github_token ?? undefined,
  };
}

export async function saveApiKeys(userId: string, keys: ApiKeys): Promise<void> {
  const { error } = await supabase.from("api_keys").upsert(
    {
      user_id: userId,
      claude_key: keys.claudeKey ?? null,
      openrouter_key: keys.openrouterKey ?? null,
      recall_key: keys.recallKey ?? null,
      github_token: keys.githubToken ?? null,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(`Failed to save API keys: ${error.message}`);
}
