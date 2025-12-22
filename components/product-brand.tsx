import { productsBrandsSelect } from "@/db/schema";

const SUPERMARKET_BRAND_IDS = [80, 30, 69, 19];

type ProductType = "product" | "related" | "explore";

export function ProductBrand({ brand, possibleBrand, type }: { brand: productsBrandsSelect; possibleBrand: productsBrandsSelect | null, type: ProductType }) {
    if (!possibleBrand) {
        return <BrandName name={brand.name} type={type} />;
    }

    if (SUPERMARKET_BRAND_IDS.includes(brand.id)) {
        return <BrandName name={possibleBrand.name} type={type} />;
    }

    return <BrandName name={brand.name} type={type} />;
}

function BrandName({ name, type}: { name: string; type: ProductType }) {
    switch (type) {
        case "product":
            return <div className="font-bold text-2xl">{name}</div>;
        case "related":
            return <div className="font-bold">{name}</div>;
        case "explore":
            return <div className="font-bold">{name}</div>;
    }
}