import { Folder, Still } from "remotion";
import { Capa } from "./Capa";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Trilhas">
      <Still
        id="primeiros-passos"
        component={Capa}
        width={1280}
        height={720}
        defaultProps={{
          numero: 0,
          fantasma: "COMEÇO",
          linhas: [
            [{ t: "Todo negócio grande" }],
            [{ t: "começou com um " }, { t: "clique.", estilo: "serifa" }],
          ],
          lado: "direita",
          ferramentas: "Claude · GitHub",
          foto: "fotos/teclado.webp",
          fotoEscala: 1.45,
          fotoX: -12,
          fotoY: 6,
          contraste: 1.9,
          ganho: 1.12,
          luzX: 26,
          luzY: 46,
          luzRaio: 46,
          queda: 0.97,
          fantasmaOpacidade: 0.1,
          fantasmaTamanho: 300,
          fantasmaX: -3,
          fantasmaY: 58,
          fraseTamanho: 54,
          fraseY: 50,
        }}
      />
    </Folder>
  );
};
