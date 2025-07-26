"use server";

import { db } from "@/db";
import {
  products,
  productsInsert,
  productsShopsPrices,
  productsShopsPricesInsert,
  unitTracker,
  unitTrackerInsert,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { formatUnit } from "./utils";

const raw = JSON.stringify([
  {
    operationName: "GetStoreConfigurations",
    variables: {
      storeConfigurationsInput: {
        storeReference: "PL08-D",
        clientId: "PLAZA_LAMA",
      },
    },
    query:
      "query GetStoreConfigurations($storeConfigurationsInput: StoreConfigurationsInput!) {\n  getStoreConfigurations(storeConfigurationsInput: $storeConfigurationsInput) {\n    allowSubstituteProducts\n    enableDynamicHome\n    enforceCustomerPhoneValidation\n    __typename\n  }\n}",
  },
  {
    operationName: "GetProductsByCategory",
    variables: {
      getProductsByCategoryInput: {
        categoryReference: "11-46-203",
        categoryId: "null",
        clientId: "PLAZA_LAMA",
        storeReference: "PL08-D",
        currentPage: 1,
        pageSize: 202,
        googleAnalyticsSessionId: "",
      },
    },
    query:
      "fragment CategoryFields on CategoryModel {\n  active\n  boost\n  hasChildren\n  categoryNamesPath\n  isAvailableInHome\n  level\n  name\n  path\n  reference\n  slug\n  photoUrl\n  imageUrl\n  shortName\n  isFeatured\n  isAssociatedToCatalog\n  __typename\n}\n\nfragment CatalogProductTagModel on CatalogProductTagModel {\n  description\n  enabled\n  textColor\n  filter\n  tagReference\n  backgroundColor\n  name\n  __typename\n}\n\nfragment CatalogProductFormatModel on CatalogProductFormatModel {\n  format\n  equivalence\n  unitEquivalence\n  clickMultiplier\n  minQty\n  maxQty\n  __typename\n}\n\nfragment Taxes on ProductTaxModel {\n  taxId\n  taxName\n  taxType\n  taxValue\n  taxSubTotal\n  __typename\n}\n\nfragment PromotionCondition on PromotionCondition {\n  quantity\n  price\n  priceBeforeTaxes\n  taxTotal\n  taxes {\n    ...Taxes\n    __typename\n  }\n  __typename\n}\n\nfragment Promotion on Promotion {\n  type\n  isActive\n  conditions {\n    ...PromotionCondition\n    __typename\n  }\n  description\n  endDateTime\n  startDateTime\n  __typename\n}\n\nfragment PromotedModel on PromotedModel {\n  isPromoted\n  onLoadBeacon\n  onClickBeacon\n  onViewBeacon\n  onBasketChangeBeacon\n  onWishlistBeacon\n  __typename\n}\n\nfragment SpecificationModel on SpecificationModel {\n  title\n  values {\n    label\n    value\n    __typename\n  }\n  __typename\n}\n\nfragment NutritionalDetailsInformation on NutritionalDetailsInformation {\n  servingName\n  servingSize\n  servingUnit\n  servingsPerPortion\n  nutritionalTable {\n    nutrientName\n    quantity\n    unit\n    quantityPerPortion\n    dailyValue\n    __typename\n  }\n  bottomInfo\n  __typename\n}\n\nfragment Promotions on PromotionV2 {\n  type\n  description\n  promotionReference\n  startDateTime\n  endDateTime\n  isActive\n  conditions {\n    field\n    operator\n    values\n    value\n    __typename\n  }\n  benefit {\n    type\n    label\n    value\n    values\n    imagesURL\n    __typename\n  }\n  __typename\n}\n\nfragment CatalogProductModel on CatalogProductModel {\n  name\n  price\n  photosUrl\n  unit\n  subUnit\n  subQty\n  description\n  sku\n  ean\n  maxQty\n  minQty\n  clickMultiplier\n  nutritionalDetails\n  isActive\n  slug\n  brand\n  stock\n  securityStock\n  boost\n  isAvailable\n  location\n  priceBeforeTaxes\n  taxTotal\n  promotion {\n    ...Promotion\n    __typename\n  }\n  taxes {\n    ...Taxes\n    __typename\n  }\n  categories {\n    ...CategoryFields\n    __typename\n  }\n  categoriesData {\n    ...CategoryFields\n    __typename\n  }\n  formats {\n    ...CatalogProductFormatModel\n    __typename\n  }\n  tags {\n    ...CatalogProductTagModel\n    __typename\n  }\n  specifications {\n    ...SpecificationModel\n    __typename\n  }\n  promoted {\n    ...PromotedModel\n    __typename\n  }\n  score\n  relatedProducts\n  ingredients\n  stockWarning\n  nutritionalDetailsInformation {\n    ...NutritionalDetailsInformation\n    __typename\n  }\n  productVariants\n  isVariant\n  isDominant\n  promotions {\n    ...Promotions\n    __typename\n  }\n  seals\n  __typename\n}\n\nfragment CategoryWithProductsModel on CategoryWithProductsModel {\n  name\n  reference\n  level\n  path\n  hasChildren\n  active\n  boost\n  isAvailableInHome\n  slug\n  photoUrl\n  categoryNamesPath\n  imageUrl\n  shortName\n  isFeatured\n  products {\n    ...CatalogProductModel\n    __typename\n  }\n  __typename\n}\n\nfragment PaginationTotalModel on PaginationTotalModel {\n  value\n  relation\n  __typename\n}\n\nfragment PaginationModel on PaginationModel {\n  page\n  pages\n  total {\n    ...PaginationTotalModel\n    __typename\n  }\n  __typename\n}\n\nfragment AggregateBucketModel on AggregateBucketModel {\n  min\n  max\n  key\n  docCount\n  __typename\n}\n\nfragment AggregateModel on AggregateModel {\n  name\n  docCount\n  buckets {\n    ...AggregateBucketModel\n    __typename\n  }\n  __typename\n}\n\nfragment BannerModel on BannerModel {\n  id\n  storeId\n  title\n  desktopImage\n  mobileImage\n  targetUrl\n  targetUrlInfo {\n    type\n    url\n    __typename\n  }\n  targetCategory\n  index\n  categoryId\n  __typename\n}\n\nfragment CarouselModel on CarouselModel {\n  id\n  name\n  autoplaySpeed\n  lazyLoading\n  isActive\n  createdAt\n  updatedAt\n  banners {\n    id\n    name\n    webImageUrl\n    tabletImageUrl\n    appImageUrl\n    redirectUrl\n    redirectMode\n    isActive\n    __typename\n  }\n  position\n  __typename\n}\n\nquery GetProductsByCategory($getProductsByCategoryInput: GetProductsByCategoryInput!) {\n  getProductsByCategory(getProductsByCategoryInput: $getProductsByCategoryInput) {\n    category {\n      ...CategoryWithProductsModel\n      __typename\n    }\n    pagination {\n      ...PaginationModel\n      __typename\n    }\n    aggregates {\n      ...AggregateModel\n      __typename\n    }\n    carousels {\n      ...CarouselModel\n      __typename\n    }\n    banners {\n      ...BannerModel\n      __typename\n    }\n    promoted {\n      ...PromotedModel\n      __typename\n    }\n    __typename\n  }\n}",
  },
]);

async function getProductList() {
  const response = await fetch("https://nextgentheadless.instaleap.io/api/v3", {
    method: "POST",
    body: raw,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
    },
  });

  const jsonResponse = await response.json();

  return z
    .object({
      data: z.object({
        getProductsByCategory: z.object({
          category: z.object({
            products: z.array(
              z.object({
                name: z.string(),
                slug: z.string(),
                photosUrl: z.array(z.string()),
                brand: z.string(),
                sku: z.string(),
              })
            ),
          }),
        }),
      }),
    })
    .parse(jsonResponse[1]);
}

export async function getProductListPlazaLama(categoryId: number) {
  const productsPlazaLama = (await getProductList()).data.getProductsByCategory
    .category.products;

  const unitTrackers: unitTrackerInsert[] = [];
  console.log("[Plaza Lama Processor[ Start getting products");
  const dbProducts = productsPlazaLama.map(
    (p): productsInsert & { price: productsShopsPricesInsert } => {
      let unitSlice = -1;

      const words = p.name.trim().split(/\s+/);
      let nameWords = words.slice(0, -1);

      if (
        nameWords.find((word) => word.toLowerCase() === "lb") ||
        nameWords.find((word) => !isNaN(Number(word)))
      ) {
        nameWords = words.slice(0, -2);
        unitSlice = -2;
      }

      const productName = nameWords
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");

      const unit = formatUnit(words.slice(unitSlice).join(" ").toUpperCase());

      return {
        name: productName,
        unit: unit,
        image: p.photosUrl[0],
        categoryId,
        brandId: 69, //Plaza Lama
        price: {
          shopId: 4,
          productId: 0,
          url: `https://plazalama.com.do/p/${p.slug}`,
          api: p.sku,
        },
      };
    }
  );

  console.log(
    "[Plaza Lama Processor] Products obtained length=" + dbProducts.length
  );
  for (const product of dbProducts) {
    console.log(
      `[INFO] start process product=${product.name} ${product.unit} url=${product.price.url}`
    );
    const exist = await db.query.products.findFirst({
      where: and(
        eq(products.name, product.name),
        eq(products.unit, product.unit),
        eq(products.brandId, product.brandId)
      ),
      with: {
        shopCurrentPrices: true,
      },
    });

    if (!exist) {
      const priceExist = await db.query.productsShopsPrices.findFirst({
        where: (prices, { eq }) => eq(prices.url, product.price.url),
      });

      if (priceExist) {
        console.log(`[INFO] product price exist continue with next product`);
        continue;
      }

      unitTrackers.push({
        unit: product.unit,
        productName: product.name,
      });

      try {
        const insertedProduct = await db
        .insert(products)
        .values(product)
        .returning();

        product.price.productId = insertedProduct[0].id;

        await db.insert(productsShopsPrices).values(product.price);
        console.log(`[INFO] product don't exist inserted`);

      } catch (err) {
        console.log("[ERROR] Error when trying insert a new product", err);
      }
      continue;
    }

    product.price.productId = exist.id;
    await db
      .insert(productsShopsPrices)
      .values(product.price)
      .onConflictDoNothing();
    console.log(`[INFO] product 'exist' updated`);
  }

  await db.insert(unitTracker).values(unitTrackers).onConflictDoNothing();
}
