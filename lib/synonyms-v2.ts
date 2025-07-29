import { plural } from "pluralize";
import { PERMITED_STOP_WORDS, STOP_WORDS } from "./stopwords";
import { pluralizeEs } from "./pluralize-es";

type SynonymsBase = {
  synonyms: string[];
  query: string[];
};

type WithId = SynonymsBase & {
  id: string;
  complex?: never;
};

type WithComplex = SynonymsBase & {
  complex: string[];
  id?: never;
};

type BaseOnly = SynonymsBase & {
  id?: never;
  complex?: never;
};

type Synonym = WithId | WithComplex | BaseOnly;

const base: Array<Synonym> = [
    { synonyms: ["congelado", "congelada", "frozen", "cong"], query: ["cong:*", "frozen:*"] },
    { synonyms: ["sopa instantanea", "ramen"], query: ["sopa:* & instantanea:*", "ramen:*"] },
    { synonyms: ["sin", "free", "zero", "non", "cero", "0"], query: ["sin", "s", "free:*", "zero", "non", "cero", "0", "libre"], id: "sin" },
    { synonyms: ["lactosa", "lacteo", "dairy"], query: ["lactosa:*", "lacteo:*", "dair:*"], id: "lact"},
    { synonyms: ["deslactosada", "deslactosado"], complex: ["sin", "lact"], query: ["deslactosad:*"]},
    { synonyms: ["rebanado", "rebanada", "slice", "rodaja", "en & mitad", "mitade", "sliced", "partido", "trozo", "reb", "cortado", "cortada"], query: ["reb:*", "slice:*", "rodaj:*", "en & mitad:*", "mitade:*", "partid:*", "troz:*", "cortad:*"]},
    { synonyms: ["rucula", "arrugula"], query: ["rucula:*", "arrugula:*"] },
    { synonyms: ["menta", "mint"], query: ["ment:*", "mint:*"]},
    { synonyms: ["new york", "ny"], query: ["new <-> york", "ny"]},
    { synonyms: ["queso", "cheese"], query: ["ques:*", "chees:*"], id: "queso"},
    { synonyms: ["bebibl", "bebible", "liquido", "liquid"], query: ["bebibl:*", "liquid:*"], id: "liquido"},
    { synonyms: ["steak", "bistec"], query: ["steak:*", "bistec:*"]},
    { synonyms: ["bacon", "tocineta", "tocino"], query: ["baco:*", "tocin:*"]},
    { synonyms: ["chicken", "pollo"], query: ["chick:*", "pollo:*"]},
    { synonyms: ["rojo", "roja", "colorada", "red"], query: ["red:*", "roj:*", "colorad:*"], id: "red"},
    { synonyms: ["rib", "costilla"], query: ["rib:*", "costill:*"]},
    { synonyms: ["short", "corto", "corta"], query: ["shor:*", "cort:*"]},
    { synonyms: ["hamburguer", "hamburgesa", "hamburguesa", "burger", "burguer", "hamburger"], query: ["hamburg:*", "burger:*", "burguer:*"]},
    { synonyms: ["squash", "calabaza"], query: ["squas:*", "calabaz:*"]},
    { synonyms: ["gold", "dorado", "dorada", "golden"], query: ["gold:*", "dorad*"]},
    { synonyms: ["acorn", "bellota"], query: ["acorn", "bellot:*"]},
    { synonyms: ["bbq", "barbeque"], query: ["bbq:*", "barbeq:*"]},
    { synonyms: ["ajie", "aji"], query: ["aji:*"]},
    { synonyms: ["smoked", "ahumado", "ahumada", "ahum", "smoke"], query: ["ahum:*", "smoke:*"]},
    { synonyms: ["choriso", "chorizo"], query: ["chori:*"]},
    { synonyms: ["soft", "suave"], query: ["soft:*", "suav:*"]},
    { synonyms: ["swiss", "suizo", "suiso"], query: ["swis:*", "suiz:*", "suis:*"]},
    { synonyms: ["spicy", "picante"], query: ["spicy:*", "picante:*"]},
    { synonyms: ["std", "standard"], query: ["std:*", "standar:*", "estandar:*"]},
    { synonyms: ["ext", "extra", "xtra", "mas"], query: ["ext:*", "xtra:*", "mas"]},
    { synonyms: ["jugo", "juice", "zumo"], query: ["zumo:*", "jugo:*", "juice:*"]},
    { synonyms: ["blueberry", "arandano"], query: ["blueberr:*", "arandan:*"]},
    { synonyms: ["yaniqueque", "pastelito"], query: ["yaniquequ:*", "pastelit:*"]},
    { synonyms: ["veggie", "vegetariano", "vegetariana", "vegano", "vegana"], query: ["veggi:*", "vegetarian:*", "vegi:*", "vegan:*"]},
    { synonyms: ["flatbread", "pan plano"], query: ["flatbrea:*", "pan & plano"]},
    { synonyms: ["sesamo", "sesame", "ajonjoli"], query: ["sesam:*", "ajonjoli"]},
    { synonyms: ["ezekiel", "ezequiel"], query: ["ezeki:*", "ezequi:*"]},
    { synonyms: ["decaffeinato", "descafeinado", "decaffeinato", "decafeinado"], query: ["decaf:*", "descaf:*"]},
    { synonyms: ["big", "grande"], query: ["big:*", "grande:*"]},
    { synonyms: ["tiny", "peq", "pequeno", "small"], query: ["tiny", "peq:*", "small"]},
    { synonyms: ["tea", "te"], query: ["tea", "te"]},
    { synonyms: ["iced", "frio", "fria"], query: ["iced:*", "fri:*"]},
    { synonyms: ["lemon", "limon", "lima"], query: ["limon", "lima", "lemon"]},
    { synonyms: ["white", "blanco", "blanca"], query: ["white", "blanc:*"], id: "white"},
    { synonyms: ["filter", "filtro"], query: ["filtr:*", "filter"]},
    { synonyms: ["cookie", "galleta", "crisp", "gallet", "cooki"], query: ["cooki:*", "gallet:*", "crisp"], id: "galleta"},
    { synonyms: ["honey", "miel"], query: ["honey", "miel"]},
    { synonyms: ["peanut", "mani"], query: ["peanu:*", "mani:*"]},
    { synonyms: ["corn", "maiz"], query: ["corn", "maiz"]},
    { synonyms: ["oat", "avena"], query: ["oat:*", "avena:*"]},
    { synonyms: ["almond", "almendra", "walmond"], query: ["almond:*", "almendra:*", "walmond:*"]},
    { synonyms: ["zucarita"], query: ["zucarita", "cereal & frosted & kelloggs"]},
    { synonyms: ["cinnamon", "canela"], query: ["cinnamon", "canela:*"]},
    { synonyms: ["frosted", "azucarado", "azucarada"], query: ["frosted", "azucarad:*"]},
    { synonyms: ["spray", "aerosol", "rociador", "espray"], query: ["spray", "aerosol", "rociador", "espray"]},
    { synonyms: ["virgin", "virgen"], query: ["virgin", "virgen"]},
    { synonyms: ["molido", "en polvo", "molida", "fina", "fine", "grinder"], query: ["molid:*", "polvo", "fin:*", "grinder"]},
    { synonyms: ["shredded", "rallado", "rallada", "shred"], query: ["shred:*", "rallad:*"]},
    { synonyms: ["artisian", "artesana"], query: ["artisian", "artesan:*"]},
    { synonyms: ["blue", "azul"], query: ["blue", "azul"]},
    { synonyms: ["crumbled", "desmenuzado", "desmenuzada", "en trozos", "diced"], query: ["crumbled", "desmenuzad:*", "en & trozos", "diced"]},
    { synonyms: ["herb", "hierba", "herbs", "herbal", "yerba"], query: ["herb:*", "hierb:*", "yerb:*"], id: "hierba"},
    { synonyms: ["wedge", "cuna"], query: ["wedge", "cuna"]},
    { synonyms: ["untable", "spreadable", "spread"], query: ["untable", "spread:*"]},
    { synonyms: ["cream", "crema", "creme"], query: ["cream:*", "crem:*"]},
    { synonyms: ["mozzarella", "mozarella"], query: ["mozzarella", "mozarella"]},
    { synonyms: ["parmesan", "parmesano", "parmesana"], query: ["parmesan:*"]},
    { synonyms: ["flounder", "platija"], query: ["flounder", "platija"]},
    { synonyms: ["cod", "bacalao"], query: ["cod", "bacalao"]},
    { synonyms: ["fillet", "filete"], query: ["fillet:*", "filet:*"]},
    { synonyms: ["ribeye", "rib eye"], query: ["ribeye", "rib & eye"]},
    { synonyms: ["stick", "palito", "dedito", "string", "barrita"], query: ["stick:*", "palito", "dedito", "string:*", "barrita"]},
    { synonyms: ["seafood", "marisco"], query: ["seafood", "marisco"]},
    { synonyms: ["spinach", "espinaca"], query: ["spinach:*", "espinac:*"]},
    { synonyms: ["tuna", "atun"], query: ["tuna", "atun"]},
    { synonyms: ["squid", "calamar"], query: ["squid:*", "calamar:*"]},
    { synonyms: ["blackberry", "mora", "black berry"], query: ["blackber:*", "mora", "black & berry"]},
    { synonyms: ["dulce", "sweet", "tierno"], query: ["dulce", "sweet:*", "tierno"]},
    { synonyms: ["guisante", "petit pois", "guisantes dulces", "guisante dulce", "guisante dulces"], query: ["guisante:*", "petit:* & poi:*"]},
    { synonyms: ["oyster", "ostra"], query: ["oyster:*", "ostra"]},
    { synonyms: ["coconut", "coco"], query: ["coconut", "coco"]},
    { synonyms: ["sprout", "brote"], query: ["sprout:*", "brote"]},
    { synonyms: ["seed", "semilla"], query: ["seed", "semilla"]},
    { synonyms: ["with", "con", "al"], query: ["with", "con", "al", "c"], id: "con"},
    { synonyms: ["sal", "salt"], query: ["sal", "salt:*"], id: "sal"},
    { synonyms: ["salted", "salada", "salado"], query: ["salted", "salad:*"], complex: ["con", "sal"]},
    { synonyms: ["hazelnut", "avellana"], query: ["hazelnut:*", "avellana:*"]},
    { synonyms: ["shelled", "pelado", "pelada"], query: ["shelled:*", "pelad:*"]},
    { synonyms: ["mix", "mixed", "mixto", "mixta", "mezcla"], query: ["mix:*", "mezcl:*"]},
    { synonyms: ["ring", "anilla", "anillo"], query: ["ring", "anill:*"]},
    { synonyms: ["mandarina", "clementina"], query: ["mandarina", "clementina"]},
    { synonyms: ["carnation", "evaporada"], query: ["carnation", "evaporad:*"]},
    { synonyms: ["banana", "guineo"], query: ["banana:*", "guineo:*"]},
    { synonyms: ["greek", "griego"], query: ["greek:*", "griego:*"]},
    { synonyms: ["kid", "nino", "nina"], query: ["kid:*", "nino", "nina"]},
    { synonyms: ["activia", "dannon"], query: ["activia", "dannon"]},
    { synonyms: ["org", "organico", "organica", "orgain"], query: ["org:*"]},
    { synonyms: ["margarina", "mantequilla", "butter"], query: ["margarin:*", "mantequilla", "butte:*"], id: "mantequilla"},
    { synonyms: ["vanilla", "vainilla"], query: ["vanilla:*", "vainilla:*"]},
    { synonyms: ["peach", "durazno", "melocoton"], query: ["peach:*", "durazno", "melocoton:*"]},
    { synonyms: ["pastel", "bizcocho", "biscocho"], query: ["pastel", "bizcocho:*", "biscocho:*"]},
    { synonyms: ["green", "verde", "geen"], query: ["green:*", "verde"], id: "verde"},
    { synonyms: ["pea", "guandule"], query: ["pea", "guandule:*"]},
    { synonyms: [""], query: ["buen:*"], id: "buena"},
    { synonyms: ["hierbabuena", "hierba buena"], query: ["hierbabuena", "hierba & buena"], complex: ["hierba", "buena"]},
    { synonyms: ["rosa", "flor"], query: ["rosa:*", "flor:*"]},
    { synonyms: ["strawberry", "fresa"], query: ["strawberr:*", "fresa:*"]},
    { synonyms: ["vegetal", "de soya"], query: ["vegetal", "de & soya"]},
    { synonyms: ["avocado", "aguacate"], query: ["avocado:*", "aguacate:*"]},
    { synonyms: ["oil", "aceite"], query: ["oil:*", "aceite:*"]},
    { synonyms: ["cider", "sidra"], query: ["sider", "sidra"]},
    { synonyms: ["walnut", "nuez", "nues", "nut"], query: ["wanut:*", "nue:*", "nut:*"]},
    { synonyms: ["cherry", "cereza", "ceresa"], query: ["cherry", "cerez:*", "ceres:*"]},
    { synonyms: ["grape", "uva"], query: ["grape:*", "uva:*"]},
    { synonyms: ["apple", "manzana", "mansana"], query: ["apple:*", "manzan:*", "mansan:*"]},
    { synonyms: ["raspberry", "frambuesa", "raspb"], query: ["raspb:*", "frambue:*"]},
    { synonyms: ["pineapple", "pina"], query: ["pineapple:*", "pina:*"]},
    { synonyms: ["funda", "sobre", "bolsa", "paquete", "paq", "pack"], query: ["funda", "sobre", "bolsa", "paquete", "pack:*"]},
    { synonyms: ["imp", "importado", "importada"], query: ["imp:*"]},
    { synonyms: ["leche", "milk", "alimento lacteo", "alim lacteo"], query: ["leche:*", "milk:*", "lacteo:*", "lactea:*"], id: "leche"},
    { synonyms: ["entero", "entera", "full"], query: ["enter:*", "full"], id: "entero"},
    { synonyms: ["leche entera", "leche liquida", "leche entero", "leche liquido"], query: ["leche & entera", "leche & liquida"], complex: ["leche", "liquido"] },
    { synonyms: ["fortigrow", "crecimiento", "fortificada"], query: ["forti:*", "crecimien:*"]},
    { synonyms: ["balsamic", "balsamico", "balsamica"], query: ["balsamic:*"]},
    { synonyms: ["ranchero", "ranchera"], query: ["rancher:*", "baldo:*"]},
    { synonyms: ["sazon", "adobo"], query: ["sazon", "adobo"]},
    { synonyms: ["one", "uno", "1"], query: ["one", "uno", "1"], id: "1"},
    { synonyms: ["two", "dos", "2"], query: ["two", "dos", "2"], id: "2"},
    { synonyms: ["three", "tres", "3"], query: ["three", "tres", "3"], id: "3"},
    { synonyms: ["four", "cuatro", "4"], query: ["four", "cuatro", "4"], id: "4"},
    { synonyms: ["five", "cinco", "5"], query: ["five", "cinco", "5"], id: "5"},
    { synonyms: ["six", "seis", "6"], query: ["six", "seis", "6"], id: "6"},
    { synonyms: ["seven", "siete", "7"], query: ["seven", "siete", "7"], id: "7"},
    { synonyms: ["eight", "ocho", "8"], query: ["eight", "ocho", "8"], id: "8"},
    { synonyms: ["nine", "nueve", "9"], query: ["nine", "nueve", "9"], id: "9"},
    { synonyms: ["duo", "doble"], query: ["duo", "doble"], complex: ["2"]},
    { synonyms: ["powder", "polvo"], query: ["powder", "polvo"]},
    { synonyms: ["de coccion", "para cocinar", "de cocinar", "cocina"], query: ["coccio:*", "cocina:*"]},
    { synonyms: ["nutmeg", "nuez moscada"], query: ["nutmeg:*", "nuez & moscada"]},
    { synonyms: ["pink", "rosado", "rosada"], query: ["pink:*", "rosad:*"], id: "pink"},
    { synonyms: ["himalaya", "sal rosada", "himalayan"], query: ["himalaya:*"], complex: ["sal", "pink"]},
    { synonyms: ["pimienta", "pimiento", "pepper"], query: ["pimient:*", "pepper"], id: "pimienta"},
    { synonyms: ["paprika", "pimenton"], query: ["paprika:*", "pimento:*"]},
    { synonyms: ["pimiento variado", "pimiento tricolor", "pimientos tricolor", "pimientos variado"], query: ["pimient:* & variado:*", "pimient:* & tricolor:*"]},
    { synonyms: ["sea", "marino", "marina", "de mar"], query: ["sea", "marino", "marina", "de & mar"]},
    { synonyms: ["coarse", "gruesa", "grueso"], query: ["coarse", "grues:*"]},
    { synonyms: ["greenland", "lucas perez"], query: ["greenland", "lucas & perez"]},
    { synonyms: ["frosting", "glaseado", "glaseada"], query: ["frosting", "glaseado"]},
    { synonyms: ["chip", "chispa"], query: ["chisp:*", "chip:*"]},
    { synonyms: ["cdc", "cour cereale", "cuor di cereale"], query: ["cdc", "cereal:*"]},
    { synonyms: ["musclemilk", "muscle milk"], query: ["musclemilk:*", "muscle & milk"]},
    { synonyms: ["bioeva", "bio eva"], query: ["bioeva:*", "bio & eva"]},
    { synonyms: ["medie", "mediano", "mediana"], query: ["medie", "median:*"]},
    { synonyms: ["ketchup", "catchup"], query: ["ketchup", "catchup"]},
    { synonyms: ["lasagne", "lasagna", "lasana"], query: ["lasagn:*", "lasana"]},
    { synonyms: ["linguine", "linguini"], query: ["linguin:*"]},
    { synonyms: ["squeeze", "dispenser", "dispensador"], query: ["squeez:*", "dispens:*"]},
    { synonyms: ["spaguetti", "espaguetti", "espagueti", "spaghetti"], query: ["espaguet:*", "spag:*"]},
    { synonyms: ["baking", "hornear"], query: ["baking:*", "hornear:*"]},
    { synonyms: ["edulcorante", "endulzante"], query: ["edulcorante", "endulzante"]},
    { synonyms: ["sugar", "azucar", "sug"], query: ["azucar", "sug:*"], id: "azucar"},
    { synonyms: ["azucar refinada", "azucar refino", "azucar refina", "azucar refinado"], query: ["azucar & refin:*"], complex: ["azucar", "white"]},
    { synonyms: ["diet", "dietetica", "dietetico", "dieta"], query: ["diet:*"], id: "diet"},
    { synonyms: ["stevia"], query: ["stevia"], complex: ["azucar", "diet"]},
    { synonyms: ["salami", "salame"], query: ["salam:*"], id: "salami"},
    { synonyms: ["olive", "aceituna"], query: ["olive:*", "aceitun:*"]},
    { synonyms: ["pickle", "encurtido", "encurtida", "pickled"], query: ["pickle:*", "encurtid:*"]},
    { synonyms: ["baby", "bebe"], query: ["bab:*", "bebe:*"]},
    { synonyms: ["bean", "habichuela"], query: ["bean:*", "habichuela:*"], id: "habichuela"},
    { synonyms: ["vainita", "habichuelas tiernas"], query: ["vainita", "habichuela:* & tiern:*"], complex: ["habichuela", "verde"]},
    { synonyms: ["tomato", "tomate"], query: ["tomat:*"], id: "tomate"},
    { synonyms: ["light", "lightly", "lite", "ligera", "ligero", "menos", "reduced", "reducida", "reducido", "bajo en", "low", "con poco", "con poca"], query: ["light:*", "lite", "liger:*", "menos", "reduc:*", "bajo", "low:*", "con & poca", "con & poco"]},
    { synonyms: ["hongo", "champinon", "mushroom"], query: ["hongo:*", "champinon:*", "mushroom:*"]},
    { synonyms: ["meat", "carne"], query: ["meat:*", "carn:*"]},
    { synonyms: ["french", "france", "francesa"], query: ["french", "france:*"]},
    { synonyms: ["basil", "albahaca", "basilico"], query: ["basil:*", "albahaca"]},
    { synonyms: ["original", "tradicional", "regular"], query: ["original", "tradicional", "regular"]},
    { synonyms: ["fat", "grasa"], query: ["fat", "grasa:*"], id: "grasa"},
    { synonyms: ["libre de grasa"], query: ["libre & de & grasa"], complex: ["sin", "grasa"]},
    { synonyms: ["reddi whip", "reddi wip"], query: ["reddi & whip", "reddi & wip"]},
    { synonyms: ["vegetale", "verdura"], query: ["vegetale:*", "verdura:*"]},
    { synonyms: ["heart", "corazon"], query: ["heart:*", "corazon:*"]},
    { synonyms: ["palmito", "palm"], query: ["palm:*"]},
    { synonyms: ["ajo", "garlic"], query: ["ajo", "garlic"], id: "ajo"},
    { synonyms: ["al ajillo"], query: ["al & ajillo"], complex: ["con", "ajo"]},
    { synonyms: ["hueso", "bone", "espina"], query: ["hueso", "bone", "esp:*"], id: "hueso"},
    { synonyms: ["deshuesada", "deshuesado", "spineless"], query: ["deshuesad:*", "spineless"], complex: ["sin", "hueso"]},
    { synonyms: ["onion", "cebolla"], query: ["onion", "ceboll:*"]},
    { synonyms: ["roasted", "tostado", "asado", "rostizado", "rostizada", "asada", "tostada", "toasted"], query: ["roasted:*", "tostad:*", "toaste:*", "asad:*", "rostizad:*"]},
    { synonyms: ["con sabor", "con sabor a", "sabor a"], query: ["sabor"]},
    { synonyms: ["chestnut", "castana"], query: ["chestnut:*", "castana"]},
    { synonyms: ["inut", "imperial nuts", "implerial nuts"], query: ["inut:*", "imperial:* & nut:*", "implerial:* & nut:*"]},
    { synonyms: ["cacao", "cocoa", "chocolate", "choco"], query: ["cacao", "cocoa", "choco:*"]},
    { synonyms: ["kitkat", "kit kat"], query: ["kit & kat", "kitkat"]},
    { synonyms: ["mym", "m&m", "m m", "mm"], query: ["m&m", "m & m", "mm", "mym"]},
    { synonyms: ["kiss", "beso", "besito", "kisse"], query: ["kiss:*", "beso:*", "besit:*"]},
    { synonyms: ["teddy", "osito", "bear"], query: ["tedd:*", "osit:*", "bear:*", "oso"]},
    { synonyms: ["chicle", "goma de mascar", "goma mascar"], query: ["chicl:*", "goma & mascar"]},
    { synonyms: ["chalaca", "caramelo barrilete"], query: ["caramelo & barrilete", "chalaca"]},
    { synonyms: ["style", "estilo"], query: ["style", "estilo"]},
    { synonyms: ["teeth", "diente"], query: ["teeth", "diente"]},
    { synonyms: ["american", "americano", "americana"], query: ["american:*"]},
    { synonyms: ["italian", "italiano", "italiana"], query: ["italian:*"]},
    { synonyms: ["aleman", "german"], query: ["aleman", "german"]},
    { synonyms: ["mexico", "mexican", "mexicana", "mexicano", "mexi"], query: ["mexi:*"]},
    { synonyms: ["argentino", "argentina", "argentinean"], query: ["argentin:*"]},
    { synonyms: ["chileno", "chilena", "chilean"], query: ["chilean:*", "chilen:*"]},
    { synonyms: ["brasileno", "brasilena", "brazilian", "brasilian"], query: ["brasil:*", "brazil:*"]},
    { synonyms: ["popcorn", "palomita", "pop corn"], query: ["popcorn:*", "palomita:*", "pop & corn"]},
    { synonyms: ["rice", "arroz"], query: ["rice", "arroz"]},
    { synonyms: ["gelatina oli"], query: ["gelatina & oli", "geltaina & baldom"]},
    { synonyms: ["carrot", "zanahoria"], query: ["carrot:*", "zanahori:*"] },
    { synonyms: ["ice cream", "helado"], query: ["ice & cream", "helado"]},
    { synonyms: ["lyptus", "eucalipto"], query: ["lyptu:*", "eucalipt:*"]},
    { synonyms: ["menthol", "mentol"], query: ["mentho:*", "mentol:*"]},
    { synonyms: ["orange", "naranja", "mamey"], query: ["orange:*", "naranja:*", "mamey"]},
    { synonyms: ["marshmallow", "malvavisco", "malvabisco"], query: ["marshmall:*", "malvavisc:*", "malvabisc:*"]},
    { synonyms: ["sirop", "jarabe"], query: ["sirop", "jarabe"]},
    { synonyms: ["potato", "papa"], query: ["potat:*", "papa:*"]},
    { synonyms: ["frie", "frita", "frito"], query: ["frie:*", "frit:*"]},
    { synonyms: ["sour", "agrio", "agria", "amargo", "amarga"], query: ["sour", "agri:*", "amarg:*"]},
    { synonyms: ["black", "negro", "negra", "moreno", "morena"], query: ["black", "negro:*", "negra:*", "morena:*", "moreno:*"]},
    { synonyms: ["blue", "azul"], query: ["blue", "azul:*"]},
    { synonyms: ["arveja", "chicharo", "green pea"], query: ["arveja", "chicharo", "green & pea"]},
    { synonyms: ["lentil", "lenteja"], query: ["lentil", "lenteja"]},
    { synonyms: ["dry", "seco", "seca"], query: ["dry", "seco", "seca"]},
    { synonyms: ["fibra", "integral"], query: ["fibra", "integral"]},
    { synonyms: ["galleta danesa", "galletas danesas", "galletas danesa", "galleta estilo danesa", "galleta de mantequilla"], query: ["galleta:* & danesa:*"], complex: ["galleta", "mantequilla"]},
    { synonyms: ["dietalat", "descremada", "descremado"], query: ["dietalat", "descremad:*"]},
    { synonyms: ["turkey", "pavo"], query: ["turkey", "pavo"]}
];

function pluralizeWord(word: string) {
  if (
    word.includes("&") ||
    word.length === 1 ||
    STOP_WORDS.includes(word) ||
    PERMITED_STOP_WORDS.includes(word)
  ) {
    return [word];
  }
  const variants = new Set<string>();
  variants.add(word);
  const pluralized = plural(word);
  if (pluralized !== word) variants.add(pluralized);
  const pluralizedEs = pluralizeEs(word);
  if (pluralizedEs !== word) variants.add(pluralizedEs);
  return [...variants];
}

const baseV2 = base.map(({ synonyms, query, id, complex }) => {
  const expandedSynonyms = Array.from(
    new Set(
      synonyms.flatMap((syn) => pluralizeWord(syn))
    )
  );
  return { synonyms: expandedSynonyms, query, id, complex };
});

export { baseV2 };
