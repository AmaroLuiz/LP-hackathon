// Prompts de imagem das 7 trilhas. Nunca levam texto: a tipografia é composta no Remotion.

const estilo = (lado) => `Style: high-end editorial advertising photograph, dark studio, black and white with a subtle
deep green-charcoal tint (#171E19), hard directional side light from the left, deep crushed
shadows, shallow depth of field, dramatic low camera angle, frozen high-speed action,
fine film grain, matte finish. The only color in the whole image is a small warm golden-yellow
(#F2B705) accent where indicated. Keep a large calm dark empty area on the ${lado} third of the
frame for typography. Aspect ratio 16:9.
Negative: no text, no letters, no numbers, no logos, no watermark, no readable screens,
no banknotes, no red tones, no colorful background, no gradient wash, no glossy 3D render look,
no cartoon, no stock-photo smiles, no recognizable faces.`;

// Vai junto quando o gerador recebe ref-1, ref-2 e ref-3.
export const usoDasReferencias = `The attached images are STYLE REFERENCES ONLY: match their lighting, contrast,
drama, depth of field, frozen-motion energy and paper/film texture. Do not copy their chess pieces,
their red tones, their composition or any of their text. Create a completely new photograph of the
subject described below.`;

export const TRILHAS = {
  "primeiros-passos": {
    lado: "right",
    cena: `Extreme close-up of a single blank black mechanical keyboard key, pressed down
by an index finger, the key cap cracking the surface below it with small dark fragments flying
outward, a thin line of warm golden light bursting from under the key, the rest of the
keyboard receding into blur and darkness.`,
  },
  "estrategia-de-conteudo": {
    lado: "left",
    cena: `A dark chess king standing firm on a chessboard whose squares are made of torn paper sheets
from a planning notebook, a cream-colored king knocked over and falling against it in frozen
motion, its crown edge catching a golden rim light, camera at board level, other pieces
blurred in the background.`,
  },
  "videos-em-motion": {
    lado: "left",
    cena: `A slice of Brazilian chocolate cake exploding upward in mid-air, crumbs and chocolate
sprinkles suspended around it in a spiral, a printed still photo frame shattering into
shards next to it, frozen high-speed photography with slight motion trails, one golden
spark of light on the frosting, dark bakery counter blurred below.`,
  },
  "edicao-de-takes-reais": {
    lado: "right",
    cena: `Close-up of a Brazilian artisan's hands shaping a dark clay pot on a wooden wheel, wet clay
texture, clay droplets flying, a razor-thin vertical golden light line slicing the whole
scene in two, the two halves slightly offset like a film edit cut, face not visible.`,
  },
  "voz-e-narracao": {
    lado: "left",
    cena: `A vintage chrome desk microphone in a dark room, a burst of fine dust particles exploding
from the grille and forming concentric sound wave rings in the air, an old foam studio
panel crumbling to pieces behind it, one warm golden rim light on the metal.`,
  },
  "artes-e-carrosseis": {
    lado: "right",
    cena: `Rows of Brazilian pão francês bread rolls on a dark bakery tray, all in grayscale and soft
focus, except one single roll lifted in mid-air in sharp focus and warm golden color,
flour dust and crust crumbs suspended around it, low angle.`,
  },
  "da-postagem-a-venda": {
    lado: "right",
    // Refeita a pedido: segue a composição da ref-4 (pessoa de frente segurando o dinheiro para a câmera).
    cena: `Waist-up portrait of an anonymous Brazilian small business owner in his 40s, not a celebrity and not
resembling any real person, standing in the left-center of the frame, facing the camera straight on,
direct confident gaze and a slight closed-mouth half smile, wearing a plain dark shirt with a dark
canvas work apron. With both hands at chest height he holds a fanned stack of Brazilian real banknotes
toward the camera, notes slightly angled so no printing is readable, their edges catching a warm golden
rim light. Small shards of shattered smartphone screen glass float frozen in the air around him.
Background: his own small shop at night, shelves and counter heavily blurred into darkness.
Symmetrical, centered framing like a magazine cover portrait, hard light from the left sculpting
the face, deep shadow on the right side of the face.`,
  },
};

export const montarPrompt = (slug, comReferencias) => {
  const t = TRILHAS[slug];
  if (!t) throw new Error(`Trilha desconhecida: ${slug}`);
  return [comReferencias ? usoDasReferencias : "", t.cena, estilo(t.lado)].filter(Boolean).join("\n\n");
};
