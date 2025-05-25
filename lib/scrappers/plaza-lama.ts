import { productsShopsPrices } from "@/db/schema";
import { isLessThan12HoursAgo } from "./utils";
import {
  doneProcessLog,
  ignoreLog,
  initProcessLog,
  processErrorLog,
} from "./logs";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  hideProductPrice,
  showProductPrice,
  validateHistory,
} from "../db-utils";

const scrapper = "Plaza Lama";

const raw = [
  {
    operationName: "GetProductsBySKU",
    variables: {
      getProductsBySkuInput: {
        clientId: "PLAZA_LAMA",
        skus: [] as string[],
        storeReference: "PL08-D",
      },
    },
    query:
      "fragment CategoryFields on CategoryModel {\n  active\n  boost\n  hasChildren\n  categoryNamesPath\n  isAvailableInHome\n  level\n  name\n  path\n  reference\n  slug\n  photoUrl\n  imageUrl\n  shortName\n  isFeatured\n  isAssociatedToCatalog\n  __typename\n}\n\nfragment CatalogProductTagModel on CatalogProductTagModel {\n  description\n  enabled\n  textColor\n  filter\n  tagReference\n  backgroundColor\n  name\n  __typename\n}\n\nfragment CatalogProductFormatModel on CatalogProductFormatModel {\n  format\n  equivalence\n  unitEquivalence\n  clickMultiplier\n  minQty\n  maxQty\n  __typename\n}\n\nfragment Taxes on ProductTaxModel {\n  taxId\n  taxName\n  taxType\n  taxValue\n  taxSubTotal\n  __typename\n}\n\nfragment PromotionCondition on PromotionCondition {\n  quantity\n  price\n  priceBeforeTaxes\n  taxTotal\n  taxes {\n    ...Taxes\n    __typename\n  }\n  __typename\n}\n\nfragment Promotion on Promotion {\n  type\n  isActive\n  conditions {\n    ...PromotionCondition\n    __typename\n  }\n  description\n  endDateTime\n  startDateTime\n  __typename\n}\n\nfragment PromotedModel on PromotedModel {\n  isPromoted\n  onLoadBeacon\n  onClickBeacon\n  onViewBeacon\n  onBasketChangeBeacon\n  onWishlistBeacon\n  __typename\n}\n\nfragment SpecificationModel on SpecificationModel {\n  title\n  values {\n    label\n    value\n    __typename\n  }\n  __typename\n}\n\nfragment NutritionalDetailsInformation on NutritionalDetailsInformation {\n  servingName\n  servingSize\n  servingUnit\n  servingsPerPortion\n  nutritionalTable {\n    nutrientName\n    quantity\n    unit\n    quantityPerPortion\n    dailyValue\n    __typename\n  }\n  bottomInfo\n  __typename\n}\n\nfragment Promotions on PromotionV2 {\n  type\n  description\n  promotionReference\n  startDateTime\n  endDateTime\n  isActive\n  conditions {\n    field\n    operator\n    values\n    value\n    __typename\n  }\n  benefit {\n    type\n    label\n    value\n    values\n    imagesURL\n    __typename\n  }\n  __typename\n}\n\nfragment CatalogProductModel on CatalogProductModel {\n  name\n  price\n  photosUrl\n  unit\n  subUnit\n  subQty\n  description\n  sku\n  ean\n  maxQty\n  minQty\n  clickMultiplier\n  nutritionalDetails\n  isActive\n  slug\n  brand\n  stock\n  securityStock\n  boost\n  isAvailable\n  location\n  priceBeforeTaxes\n  taxTotal\n  promotion {\n    ...Promotion\n    __typename\n  }\n  taxes {\n    ...Taxes\n    __typename\n  }\n  categories {\n    ...CategoryFields\n    __typename\n  }\n  categoriesData {\n    ...CategoryFields\n    __typename\n  }\n  formats {\n    ...CatalogProductFormatModel\n    __typename\n  }\n  tags {\n    ...CatalogProductTagModel\n    __typename\n  }\n  specifications {\n    ...SpecificationModel\n    __typename\n  }\n  promoted {\n    ...PromotedModel\n    __typename\n  }\n  score\n  relatedProducts\n  ingredients\n  stockWarning\n  nutritionalDetailsInformation {\n    ...NutritionalDetailsInformation\n    __typename\n  }\n  productVariants\n  isVariant\n  isDominant\n  promotions {\n    ...Promotions\n    __typename\n  }\n  seals\n  __typename\n}\n\nquery GetProductsBySKU($getProductsBySkuInput: GetProductsBySKUInput!) {\n  getProductsBySKU(getProductsBySKUInput: $getProductsBySkuInput) {\n    ...CatalogProductModel\n    __typename\n  }\n}",
  },
];

async function getProductInfo(sku: string | null) {
  if (!sku) {
    return null;
  }

  let jsonResponse: unknown;

  raw[0].variables.getProductsBySkuInput.skus = [sku];

  try {
    const response = await fetch(
      "https://nextgentheadless.instaleap.io/api/v3",
      {
        method: "POST",
        body: JSON.stringify(raw),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9",
          "Content-Type": "application/json",
        },
      }
    );

    jsonResponse = await response.json();
  } catch (err) {
    console.log(err);
    return null;
  }

  const productInfo = z
    .array(
      z.object({
        data: z.object({
          getProductsBySKU: z.array(
            z.object({
              price: z.number(),
              promotion: z.nullable(
                z.object({
                  conditions: z.array(
                    z.object({
                      price: z.number(),
                    })
                  ),
                })
              ),
            })
          ),
        }),
      })
    )
    .safeParse(jsonResponse);

  if (productInfo.error) {
    console.log(productInfo.error);
    return null;
  }

  return productInfo.data[0];
}

async function processByProductShopPrice(
  productShopPrice: productsShopsPrices
) {
  if (
    productShopPrice.updateAt &&
    isLessThan12HoursAgo(productShopPrice.updateAt)
  ) {
    return;
  }

  initProcessLog(scrapper, productShopPrice);
  const productInfo = await getProductInfo(productShopPrice.api);

  if (!productInfo) {
    processErrorLog(scrapper, productShopPrice);
    return;
  }

  if (productInfo.data.getProductsBySKU.length === 0) {
    console.log(productInfo);
    processErrorLog(scrapper, productShopPrice);
    await hideProductPrice(productShopPrice);
    return;
  }

  showProductPrice(productShopPrice);
  const productPrice = productInfo.data.getProductsBySKU[0].promotion
    ? productInfo.data.getProductsBySKU[0].promotion.conditions[0].price
    : productInfo.data.getProductsBySKU[0].price;
  const regularPrice = productInfo.data.getProductsBySKU[0].price;

  await validateHistory(
    productShopPrice.productId,
    productShopPrice.shopId,
    productPrice + ""
  );

  if (
    productShopPrice.currentPrice &&
    Number(productShopPrice.currentPrice) === productPrice
  ) {
    ignoreLog(scrapper, productShopPrice);
    await db
      .update(productsShopsPrices)
      .set({ updateAt: new Date() })
      .where(
        and(
          eq(productsShopsPrices.productId, productShopPrice.productId),
          eq(productsShopsPrices.shopId, productShopPrice.shopId)
        )
      );
    return;
  }

  await db
    .update(productsShopsPrices)
    .set({
      currentPrice: productPrice.toString(),
      regularPrice: regularPrice.toString(),
      updateAt: new Date(),
    })
    .where(
      and(
        eq(productsShopsPrices.productId, productShopPrice.productId),
        eq(productsShopsPrices.shopId, productShopPrice.shopId)
      )
    );

  await validateHistory(
    productShopPrice.productId,
    productShopPrice.shopId,
    productPrice + ""
  );

  doneProcessLog(scrapper, productShopPrice);
}

export const plazaLama = { processByProductShopPrice };
