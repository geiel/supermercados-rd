"use server";

import { db } from "@/db";
import { PERMITED_STOP_WORDS, STOP_WORDS, UNIT } from "./stopwords";
import { isNumeric } from "./utils";
import { searchPhases } from "@/db/schema";


function tokenizeAndFilter(title: string): string[] {
  const noAccents = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/n\u0303/g, "ñ")
    .replace(/[\u0300-\u036f]/g, "");

  const protectedFractions = noAccents.replace(/(\d+\/\d+)/g, "::$1::");
  const clean = protectedFractions.replace(/[^a-z0-9%/áéíóúñü\s:]/g, " ");
  const unwrapped = clean.replace(/::/g, "");

  const tokens = unwrapped.split(/\s+/).filter((tok) => tok.trim() !== "");

  return tokens.filter((tok) => !new Set(STOP_WORDS).has(tok));
}

function generateNgrams(tokens: string[]): Set<string> {
  const out = new Set<string>();

  // 1) Unigrams
  for (const t of tokens) {
    if (PERMITED_STOP_WORDS.includes(t)) {
      continue;
    }

    if (isNumeric(t)) {
      continue;
    }

    if (t.includes("/")) {
      continue;
    }

    out.add(t);
  }

  // 2) Adjacent bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    if (
      tokens[i] === tokens[i + 1] ||
      PERMITED_STOP_WORDS.includes(tokens[i + 1]) ||
      (isNumeric(tokens[1]) && isNumeric(tokens[i + 1])) ||
      isNumeric(tokens[i + 1])
    ) {
      continue;
    }

    if (!isNumeric(tokens[i]) && UNIT.includes(tokens[i + 1])) {
      continue;
    }

    out.add(tokens[i] + " " + tokens[i + 1]);
  }

  // 3) Adjacent trigrams
  for (let i = 0; i < tokens.length - 2; i++) {
    if (
      tokens[i] === tokens[i + 1] ||
      tokens[i] === tokens[i + 2] ||
      tokens[i + 1] === tokens[i + 2] ||
      PERMITED_STOP_WORDS.includes(tokens[i + 2]) ||
      (isNumeric(tokens[1]) && isNumeric(tokens[i + 1])) ||
      (isNumeric(tokens[i + 1]) && isNumeric(tokens[i + 2]))
    ) {
      continue;
    }

    if (!isNumeric(tokens[i + 1]) && UNIT.includes(tokens[i + 2])) {
      continue;
    }

    out.add(tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2]);
  }

  // 4) Adjacent 4-grams
  for (let i = 0; i < tokens.length - 3; i++) {
    const t1 = tokens[i];
    const t2 = tokens[i + 1];
    const t3 = tokens[i + 2];
    const t4 = tokens[i + 3];

    if (isNumeric(t4)) {
      continue;
    }
    if (PERMITED_STOP_WORDS.includes(t4)) {
      continue;
    }
    const quartet = [t1, t2, t3, t4];
    const uniqueCount = new Set(quartet).size;
    if (uniqueCount < 4) {
      continue;
    }

    if (!isNumeric(t3) && UNIT.includes(t4)) {
      continue;
    }

    out.add(`${t1} ${t2} ${t3} ${t4}`);
  }

  return out;
}

function extractSearchPhrases(productName: string): string[] {
  const contentTokens = tokenizeAndFilter(productName);
  const phraseSet = generateNgrams(contentTokens);
  return Array.from(phraseSet);
}

export async function refreshPhrases() {
  console.log("[INFO] Start inserting");

  const products = await db.query.products.findMany({
    columns: { name: true },
  });
  const total = products.length;
  console.log(`[INFO] Found ${total} products to process.`);

  const BATCH_SIZE = 300;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = products.slice(offset, offset + BATCH_SIZE);

    await Promise.all(
      batch.map(async (product) => {
        const phrases = extractSearchPhrases(product.name);
        for (const phrase of phrases) {
          await db
            .insert(searchPhases)
            .values({ phrase })
            .onConflictDoNothing();
        }
      })
    );

    const done = Math.min(offset + BATCH_SIZE, total);
    const pct = (done / total) * 100;
    console.log(
      `[INFO] ${done}/${total} products processed (${pct.toFixed(1)}%)`
    );
  }
}
