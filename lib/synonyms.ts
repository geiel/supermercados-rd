const baseMap: Record<string, string[]> = {
  arrugula: ["rucula", "arrugulas", "ruculas"],
  mint: ["menta"],
  ny: ["new & york"],
  steak: ["bistec"],
  bacon: ["tocineta", "tocino", "tocinetas", "tocinos"],
  chicken: ["pollo"],
  red: ["rojo", "roja", "rojos", "rojas"],
  rib: ["costilla", "costillas"],
  short: ["corta", "cortas"],
  hamburguer: ["hamburgesa", "hamburgesas", "hamburguesa", "hamburguesas"],
  squash: ["calabaza", "calabazas"],
  gold: ["dorada", "dorado"],
  acorn: ["bellota"],
  bbq: ["barbeque"],
  ajie: ["aji"],
  smoked: ["ahumado", "ahumada"],
  choriso: ["chorizo"],
  soft: ["suave"],
  swiss: ["suizo", "suiso"],
  spicy: ["picante"],
  std: ["standard"],
  ext: ["extra", "xtra"],
  reb: ["rebanado", "rebanada"],
  artisian: ["artesana"],
  cong: ["congelada", "congelado"],
  blue: ["azul"],
  crumbled: ["desmenuzado", "desmenuzada"],
  herb: ["hierba", "herbs", "hierbas"],
  wedge: ["cuña"],
};

export const synonyms: Record<string, string[]> = {};
for (const [base, syns] of Object.entries(baseMap)) {
  const group = [base, ...syns];
  for (const w of group) {
    synonyms[w] = group.filter((x) => x !== w);
  }
}
