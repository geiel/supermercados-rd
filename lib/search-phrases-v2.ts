"use server";

import { db } from "@/db";
import { PERMITED_STOP_WORDS, STOP_WORDS, UNIT } from "./stopwords";
import { productsBrandsSelect, productsSelect, searchPhases } from "@/db/schema";

const SUPERMARKETS_BRAND = [80, 81, 19, 69, 30, 55, 110, 53, 78];

const ALL_STOP_WORDS = new Set(
  [
    ...STOP_WORDS,
    ...PERMITED_STOP_WORDS,
    ...UNIT,
    "&"
  ]
    .map((word) => normalizeStopWord(word))
    .filter(Boolean)
);

const replaceWords = [
    { word: " /p", replacement: " para " },
    { word: " /s", replacement: " sin " },
    { word: " s/", replacement: " sin " },
    { word: " /c", replacement: " con " },
    { word: " c/", replacement: " con " },
]

const BATCH_SIZE = 500;
const PRODUCT_CONCURRENCY = 100;

export async function refreshPhrasesV2() {
  console.log("[phrases-v2] Starting refresh");

  let offset = 0;
  let productsProcessed = 0;
  let phrasesPrepared = 0;

  const brands = await db.query.productsBrands.findMany();

  while (true) {
    const products = await db.query.products.findMany({
      limit: BATCH_SIZE,
      offset,
    });

    if (products.length === 0) {
      break;
    }

    console.log(
      `[phrases-v2] Processing batch offset=${offset} size=${products.length}`
    );

    for (let index = 0; index < products.length; index += PRODUCT_CONCURRENCY) {
      const chunk = products.slice(index, index + PRODUCT_CONCURRENCY);

      const chunkResults = await Promise.all(
        chunk.map(async (product) => {
          const brand = await getProductBrand(product, brands);
          let productName = formatProductName(product.name);

          if (brand) {
            productName = removeBrandFromName(productName, brand);
          }

          const basePhrases = buildPhrases(productName);
          if (basePhrases.length === 0) {
            return {
              phrases: [] as string[],
            };
          }

          const brandPhrases = brand
            ? appendBrandToPhrases(basePhrases, brand.toLocaleLowerCase())
            : [];

          return {
            phrases: [...basePhrases, ...brandPhrases],
          };
        })
      );

      const phrasesToInsert = chunkResults.flatMap((result) =>
        result.phrases.map((phrase) => ({ phrase }))
      );

      phrasesPrepared += phrasesToInsert.length;
      productsProcessed += chunk.length;

      if (phrasesToInsert.length > 0) {
        const insertStart = Date.now();
        await db
          .insert(searchPhases)
          .values(phrasesToInsert)
          .onConflictDoNothing();
        const insertDuration = Date.now() - insertStart;
        console.log(
          `[phrases-v2] Inserted ${phrasesToInsert.length} phrases (chunk size ${chunk.length}) in ${insertDuration}ms`
        );
      }

      if (productsProcessed % 500 === 0) {
        console.log(
          `[phrases-v2] Processed ${productsProcessed} products (${phrasesPrepared} phrases prepared)`
        );
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(
    `[phrases-v2] Refresh complete. Products processed: ${productsProcessed}, phrases prepared: ${phrasesPrepared}`
  );
}

async function getProductBrand(product: productsSelect, brands: productsBrandsSelect[]) {
    if (!SUPERMARKETS_BRAND.includes(product.brandId)) {
        const brand = await db.query.productsBrands.findFirst({
            where: (brands, { eq }) => eq(brands.id, product.brandId),
            columns: {
                name: true
            }
        });
        
        if (brand) {
            return brand.name;
        }
    }

    const matchedCandidates = brands.filter(brand => brandWordsInProduct(product.name, brand.name));
    const matchedBrand = matchedCandidates.length === 0 ? null : matchedCandidates.sort(
            (a, b) =>  normalizeToWords(b.name).length - normalizeToWords(a.name).length)[0];
    
    if (matchedBrand) {
        return matchedBrand.name;
    }

    return null;
}

function formatProductName(text: string): string {
  let result = text.toLowerCase();

  for (const item of replaceWords) {
    result = result.replaceAll(item.word, item.replacement);
  }

  result = result.replace(/\([^)]*\)/g, " ");
  result = result.replace(/[.,;:!?'"`]/g, " ");
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return result.replace(/\b[a-zA-Z]\/[a-zA-Z]\b/g, "").replace(/\s{2,}/g, " ").trim();
}

function removeBrandFromName(productName: string, brand: string): string {
  const brandWords = new Set(normalizeToWords(brand));

  if (brandWords.size === 0) return productName;

  const words = productName.split(/\s+/);

  const cleanedWords = words.filter((word) => {
    const normalizedWord = normalizeToWords(word)[0] ?? "";
    return !brandWords.has(normalizedWord);
  });

  return cleanedWords.join(" ").replace(/\s{2,}/g, " ").trim();
}


function normalizeApostrophes(text: string): string {
  // replace all weird apostrophes with a normal one
  return text.replace(/[´’`]/g, "'");
}

function normalizeToWords(text: string): string[] {
  return normalizeApostrophes(text)           // unify ´ ’ ` to '
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")          // remove accents
    .toLowerCase()
    .replace(/['´’`]/g, "")                   // 🔴 remove apostrophes completely
    .replace(/[^a-z0-9]+/g, " ")              // other non-alphanumerics → space
    .trim()
    .split(/\s+/);
}

function brandWordsInProduct(productName: string, brand: string): boolean {
  const productWords = normalizeToWords(productName);
  const brandWords = normalizeToWords(brand);

  let j = 0;

  for (let i = 0; i < productWords.length && j < brandWords.length; i++) {
    if (productWords[i] === brandWords[j]) {
      j++;
    }
  }

  return j === brandWords.length;
}


function buildPhrases(productName: string): string[] {
  const tokens = tokenize(productName);
  const tokensWithoutStopWords = tokens.filter((token) => !isStopWord(token));
  if (tokensWithoutStopWords.length === 0) {
    return [];
  }

  const phrases: string[] = [];

  for (let wordCount = 1; wordCount <= 4; wordCount++) {
    if (tokensWithoutStopWords.length < wordCount) {
      break;
    }

    const withoutStopWords = tokensWithoutStopWords
      .slice(0, wordCount)
      .join(" ");

    phrases.push(withoutStopWords);

    if (wordCount === 1) {
      continue;
    }

    const withStopWords = buildPhraseWithStopWords(tokens, wordCount);
    if (withStopWords && withStopWords !== withoutStopWords) {
      phrases.push(withStopWords);
    }
  }

  return phrases;
}

function buildPhraseWithStopWords(tokens: string[], wordCount: number) {
  let nonStopWordsSeen = 0;
  let endIndex = -1;

  for (let index = 0; index < tokens.length; index++) {
    if (!isStopWord(tokens[index])) {
      nonStopWordsSeen++;
      if (nonStopWordsSeen === wordCount) {
        endIndex = index;
        break;
      }
    }
  }

  if (endIndex === -1) {
    return null;
  }

  const candidate = tokens.slice(0, endIndex + 1).join(" ").trim();
  return candidate || null;
}

function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function appendBrandToPhrases(phrases: string[], brand: string) {
  return phrases.map((phrase) => `${phrase} ${brand}`.trim());
}

function normalizeStopWord(word: string) {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isStopWord(word: string) {
  const normalized = normalizeStopWord(word);
  return normalized ? ALL_STOP_WORDS.has(normalized) : false;
}
