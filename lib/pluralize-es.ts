export function pluralizeEs(str: string) {
  let plural;

  const last_letter = str[str.length - 1], // Last letter of str
    last_2_letters = str.slice(-2), // Last 3 letters of str
    last_3_letters = str.slice(-3);
  if (last_letter === "x") {
    //they don't change
    plural = str;
  }

  if (last_letter === "s") {
    switch (str) {
      case "pies":
        plural = "pieses";
        break;
      case "cafés":
        plural = "cafeses";
        break;
      case "acortamientos":
        plural = "acortamiento";
        break;
      case "abreviaturas":
        plural = "abreviatura";
        break;
      case "siglas":
        plural = "sigla";
        break;
      case "símbolos":
        plural = "símbolo";
        break;
      default:
        //normally though it doesn't change
        plural = str;
    }
  } else if (last_letter === "z") {
    //drop the z and add ces
    const radical = str.substring(0, str.length - 1);
    plural = radical + "ces";
  } else if (last_letter === "c") {
    //drop the z and add ces
    const radical = str.substring(0, str.length - 1);
    plural = radical + "ques";
  } else if (last_letter === "g") {
    //add an extra u
    plural = str + "ues";
  } else if (
    last_letter === "a" ||
    last_letter === "e" ||
    last_letter === "é" ||
    last_letter === "i" ||
    last_letter === "o" ||
    last_letter === "u"
  ) {
    //easy, just add s
    plural = str + "s";
  } else if (last_letter === "á") {
    const radical = str.substring(0, str.length - 1);
    plural = radical + "aes";
  } else if (last_letter === "ó") {
    const radical = str.substring(0, str.length - 1);
    plural = radical + "oes";
  } else if (last_3_letters === "ión") {
    const radical = str.substring(0, str.length - 3);
    plural = radical + "iones";
  } else if (last_2_letters === "ín") {
    const radical = str.substring(0, str.length - 2);
    plural = radical + "ines";
  } else {
    plural = str + "es";
  }
  return plural;
}
