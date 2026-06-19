import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Check } from "lucide-react";
import * as api from "../lib/api";
import { testClaudeKey, testRecallKey } from "../lib/api";
import type { ApiKeys } from "../types";

type TestState = "idle" | "testing" | "ok" | "fail";

interface ApiKeyFieldProps {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  isSaved: boolean;
  testState: TestState;
  onTest: () => void;
}

function ApiKeyField({
  label, helper, value, onChange, isSaved, testState, onTest,
}: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          {isSaved && testState === "idle" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {testState === "testing" && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…
            </span>
          )}
          {testState === "ok" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5" /> Connected
            </span>
          )}
          {testState === "fail" && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <XCircle className="w-3.5 h-3.5" /> Invalid key
            </span>
          )}
          <button
            type="button"
            onClick={onTest}
            disabled={testState === "testing" || !value}
            className="text-xs text-indigo-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Test
          </button>
        </div>
      </div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter your ${label}`}
          className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">{helper}</p>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const [name, setName] = useState("");

  const [claudeKey, setClaudeKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [recallKey, setRecallKey] = useState("");
  const [githubToken, setGithubToken] = useState("");

  const [savedKeys, setSavedKeys] = useState<ApiKeys>({});
  const [keySaving, setKeySaving] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [emailNotify, setEmailNotify] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);

  const [testStates, setTestStates] = useState<Record<string, TestState>>({
    claude: "idle",
    openrouter: "idle",
    recall: "idle",
    github: "idle",
  });

  useEffect(() => {
    api.getKeys().then((keys) => {
      setSavedKeys(keys);
      // Pre-fill with masked values so user knows keys are saved
      if (keys.claudeKey) setClaudeKey(keys.claudeKey);
      if (keys.openrouterKey) setOpenrouterKey(keys.openrouterKey);
      if (keys.recallKey) setRecallKey(keys.recallKey);
      if (keys.githubToken) setGithubToken(keys.githubToken);
    }).catch(() => {});
  }, []);

  async function handleSaveKeys() {
    setKeySaving(true);
    setKeyError(null);
    try {
      // Only send non-masked values (if user typed a real key)
      const payload: ApiKeys = {};
      if (!claudeKey.includes("••")) payload.claudeKey = claudeKey;
      if (!openrouterKey.includes("••")) payload.openrouterKey = openrouterKey;
      if (!recallKey.includes("••")) payload.recallKey = recallKey;
      if (!githubToken.includes("••")) payload.githubToken = githubToken;

      await api.saveKeys(payload);
      const updated = await api.getKeys();
      setSavedKeys(updated);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    } catch (e: unknown) {
      setKeyError(e instanceof Error ? e.message : "Failed to save keys");
    } finally {
      setKeySaving(false);
    }
  }

  function setTest(key: string, state: TestState) {
    setTestStates((prev) => ({ ...prev, [key]: state }));
  }

  async function testGitHub() {
    setTest("github", "testing");
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      setTest("github", res.ok ? "ok" : "fail");
    } catch {
      setTest("github", "fail");
    }
    setTimeout(() => setTest("github", "idle"), 4000);
  }

  async function testOpenRouter() {
    setTest("openrouter", "testing");
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${openrouterKey}` },
      });
      setTest("openrouter", res.ok ? "ok" : "fail");
    } catch {
      setTest("openrouter", "fail");
    }
    setTimeout(() => setTest("openrouter", "idle"), 4000);
  }

  async function testClaude() {
    const rawKey = claudeKey.includes("••") ? "" : claudeKey;
    if (!rawKey) return;
    setTest("claude", "testing");
    try {
      const { ok } = await testClaudeKey(rawKey);
      setTest("claude", ok ? "ok" : "fail");
    } catch {
      setTest("claude", "fail");
    }
    setTimeout(() => setTest("claude", "idle"), 4000);
  }

  async function testRecall() {
    const rawKey = recallKey.includes("••") ? "" : recallKey;
    if (!rawKey) return;
    setTest("recall", "testing");
    try {
      const { ok } = await testRecallKey(rawKey);
      setTest("recall", ok ? "ok" : "fail");
    } catch {
      setTest("recall", "fail");
    }
    setTimeout(() => setTest("recall", "idle"), 4000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Save
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">API Keys</h2>
        <p className="text-sm text-gray-500 mb-5">
          Your API keys are stored securely and never shared.
        </p>
        <div className="space-y-5">
          <ApiKeyField
            label="Claude API Key"
            helper="Used to generate task descriptions and Claude Code prompts"
            value={claudeKey}
            onChange={setClaudeKey}
            isSaved={!!savedKeys.claudeKey}
            testState={testStates.claude}
            onTest={testClaude}
          />
          <ApiKeyField
            label="OpenRouter API Key"
            helper="Used to create embeddings for semantic file search"
            value={openrouterKey}
            onChange={setOpenrouterKey}
            isSaved={!!savedKeys.openrouterKey}
            testState={testStates.openrouter}
            onTest={testOpenRouter}
          />
          <ApiKeyField
            label="Recall.ai API Key"
            helper="Used to send a bot into your video meetings to record the transcript"
            value={recallKey}
            onChange={setRecallKey}
            isSaved={!!savedKeys.recallKey}
            testState={testStates.recall}
            onTest={testRecall}
          />
          <ApiKeyField
            label="GitHub Personal Access Token"
            helper="Used to index your repositories and map tasks to specific files"
            value={githubToken}
            onChange={setGithubToken}
            isSaved={!!savedKeys.githubToken}
            testState={testStates.github}
            onTest={testGitHub}
          />

          {keyError && (
            <p className="text-sm text-red-600">{keyError}</p>
          )}

          <button
            onClick={handleSaveKeys}
            disabled={keySaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {keySaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {keySaved && <Check className="w-4 h-4" />}
            {keySaved ? "Saved!" : "Save All Keys"}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-3">
          <Toggle
            label="Receive email when meeting report is ready"
            checked={emailNotify}
            onChange={setEmailNotify}
          />
          <Toggle
            label="Auto-start analysis when meeting ends"
            checked={autoAnalyze}
            onChange={setAutoAnalyze}
          />
        </div>
      </div>
    </div>
  );
}
