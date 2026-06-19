import OpenAI from "openai";

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1000;

function makeClient(openrouterKey: string) {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openrouterKey,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(
  texts: string[],
  openrouterKey: string
): Promise<number[][]> {
  const client = makeClient(openrouterKey);
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });

    results.push(...response.data.map((d) => d.embedding));

    if (i + BATCH_SIZE < texts.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

export async function embedSingleText(
  text: string,
  openrouterKey: string
): Promise<number[]> {
  const client = makeClient(openrouterKey);

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: [text],
  });

  return response.data[0].embedding;
}
