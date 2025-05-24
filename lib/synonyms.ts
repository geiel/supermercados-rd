const baseMap: Record<string, string[]> = {
  arrugula: ["rucula", "arrugulas", "ruculas"],
  ny: ["new & york"],
  steak: ["bistec"],
  bacon: ["tocineta", "tocino", "tocinetas", "tocinos"],
  chicken: ["pollo"],
  red: ["rojo", "roja", "rojos", "rojas"],
  rib: ["costilla", "costillas"],
  short: ["corta", "cortas"],
  hamburguer: ["hamburgesa", "hamburgesas"],
};

export const synonyms: Record<string, string[]> = {};
for (const [base, syns] of Object.entries(baseMap)) {
  const group = [base, ...syns];
  for (const w of group) {
    synonyms[w] = group.filter((x) => x !== w);
  }
}
