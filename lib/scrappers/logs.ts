import { productsShopsPrices } from "@/db/schema/products";

export function initProcessLog(scrapper: string, product: productsShopsPrices) {
  console.log(
    `INFO Init process ${scrapper} url=${product.url} productId=${product.productId} shopId=${product.shopId}`
  );
}

export function processErrorLog(
  scrapper: string,
  product: productsShopsPrices,
  message?: string
) {
  if (message) {
    console.error(
      `ERROR ${scrapper} url=${product.url} product=${product.productId} shopId=${product.shopId} ${message}`
    );
    return;
  }

  console.error(
    `ERROR ${scrapper} url=${product.url} product=${product.productId} shopId=${product.shopId} error at parsing`
  );
}
