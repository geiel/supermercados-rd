const baseMap: Record<string, string[]> = {
  arrugula: ["rucula"],
  ny: ["new york"],
  steak: ["bistec"],
  bacon: ["tocineta", "tocino"],
  chicken: ["pollo"],
  red: ["rojo", "roja"],
  rib: ["costilla", "costillas"],
  short: ["corta", "cortas"],
};

export const synonyms: Record<string, string[]> = {};
for (const [base, syns] of Object.entries(baseMap)) {
  const group = [base, ...syns];
  for (const w of group) {
    synonyms[w] = group.filter((x) => x !== w);
  }
}
