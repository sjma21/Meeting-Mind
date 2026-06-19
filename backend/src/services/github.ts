const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".md", ".json",
]);

const EXCLUDED_PATHS = [
  "node_modules", ".git", "dist", "build", ".next",
  "coverage", "__pycache__", ".venv",
];

const MAX_FILES = 200;
const MAX_FILE_SIZE = 50 * 1024; // 50KB

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface RepoInfo {
  name: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  language: string | null;
}

export async function getRepoInfo(
  owner: string,
  repo: string,
  token: string
): Promise<RepoInfo> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: ghHeaders(token),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    name: string;
    description: string | null;
    default_branch: string;
    stargazers_count: number;
    language: string | null;
  };

  return {
    name: data.name,
    description: data.description,
    defaultBranch: data.default_branch,
    stars: data.stargazers_count,
    language: data.language,
  };
}

interface TreeItem {
  path: string;
  type: string;
  size?: number;
}

export async function getFileTree(
  owner: string,
  repo: string,
  token: string
): Promise<string[]> {
  // Get default branch first
  const info = await getRepoInfo(owner, repo, token);

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${info.defaultBranch}?recursive=1`,
    { headers: ghHeaders(token) }
  );

  if (!res.ok) throw new Error(`Failed to fetch file tree: ${res.status}`);

  const data = await res.json() as { tree: TreeItem[] };

  return data.tree
    .filter((item) => {
      if (item.type !== "blob") return false;
      const path = item.path;
      if (EXCLUDED_PATHS.some((ex) => path.includes(ex))) return false;
      const ext = "." + path.split(".").pop();
      return ALLOWED_EXTENSIONS.has(ext);
    })
    .map((item) => item.path)
    .slice(0, MAX_FILES);
}

export async function getFileContent(
  owner: string,
  repo: string,
  filePath: string,
  token: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: ghHeaders(token) }
  );

  if (!res.ok) return null;

  const data = await res.json() as { size: number; content: string; encoding: string };

  if (data.size > MAX_FILE_SIZE) return null;
  if (data.encoding !== "base64") return null;

  return Buffer.from(data.content, "base64").toString("utf-8");
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  // Normalize SSH format
  const normalized = url
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .replace("git@github.com:", "https://github.com/");

  const match = normalized.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);

  return { owner: match[1], repo: match[2] };
}
