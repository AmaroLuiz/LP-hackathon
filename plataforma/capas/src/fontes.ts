import { loadFont } from "@remotion/fonts";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadLibreBaskerville } from "@remotion/google-fonts/LibreBaskerville";
import { staticFile } from "remotion";

// Chillax não está no Google Fonts; os .woff2 vêm do Fontshare (mesma origem do site).
export const CHILLAX = "Chillax";
for (const weight of ["400", "500", "600"]) {
  loadFont({
    family: CHILLAX,
    url: staticFile(`fontes/Chillax-${weight}.woff2`),
    weight,
  });
}

// Serifa itálica só na palavra de destaque.
export const SERIFA = loadInstrumentSerif("italic", {
  weights: ["400"],
  subsets: ["latin", "latin-ext"],
}).fontFamily;

// "POTENCIA" do canto, como na logo.
export const MARCA = loadLibreBaskerville("normal", {
  weights: ["700"],
  subsets: ["latin"],
}).fontFamily;
