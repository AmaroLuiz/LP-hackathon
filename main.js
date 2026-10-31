/* ==========================================================================
   PotencIA · main.js
   1. Montagem: trilhas, planos, equipe, redes e opções do formulário saem
      de dados.js (window.POTENCIA_DADOS).
   2. Interações: menu do celular, cabeçalho, comparador antes/depois, abas,
      acordeão da jornada, vídeo, troca de fotos do símbolo e formulário.
   3. Movimento: Lenis (rolagem suave) + GSAP, ScrollTrigger e SplitText.
      Tudo respeita prefers-reduced-motion; sem as bibliotecas, a página
      continua completa e funcional.
   ========================================================================== */
(() => {
  'use strict';

  const DADOS = window.POTENCIA_DADOS || {};
  const CONFIG = DADOS.config || {};
  const doc = document.documentElement;
  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
  const temGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const comMovimento = () => temGsap && !calmo.matches;

  // Sem as bibliotecas de animação, nada fica escondido à espera delas.
  if (!temGsap || calmo.matches) doc.classList.remove('movimento');

  let lenis = null; // instância da rolagem suave (só com movimento)

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reais = (valor) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2
  }).format(valor);
  const porExtenso = (n) => ({ 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 12: 'doze' }[n] || String(n));
  const fracaoDesconto = (d) => (d === 0.5 ? 'metade do valor' : `${Math.round(d * 100)}% a menos`);
  const prazoTrava = (m) => (m === 12 ? 'um ano' : `${m} meses`);

  // Rola até um alvo (elemento ou posição), com Lenis quando houver.
  function rolarPara(alvo, opcoes = {}) {
    if (lenis) { lenis.scrollTo(alvo, { duration: 1.3, ...opcoes }); return; }
    const top = typeof alvo === 'number' ? alvo : alvo.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: calmo.matches ? 'auto' : 'smooth' });
  }

  /* ========================================================================
     1. MONTAGEM DO CONTEÚDO (dados.js)
     ======================================================================== */
  function preencherHackathon() {
    if (!CONFIG.hackathon) return;
    $$('[data-hackathon]').forEach((el) => { el.textContent = CONFIG.hackathon; });
  }

  function montarTrilhas() {
    const lista = $('[data-render="trilhas"]');
    if (!lista || !Array.isArray(DADOS.trilhas)) return;
    lista.style.setProperty('--linhas', String(Math.ceil(DADOS.trilhas.length / 2)));
    lista.innerHTML = DADOS.trilhas.map((t) => `
      <li class="prato">
        <span class="prato__fio" aria-hidden="true"></span>
        <div class="prato__foto">
          <img src="${escapar(t.foto)}" width="160" height="160" alt="" loading="lazy" decoding="async">
          <span class="prato__expoente" aria-hidden="true">${escapar(t.numero)}</span>
        </div>
        <div class="prato__texto">
          <div class="prato__linha">
            <h3 class="prato__nome"><span class="prato__trilha">Trilha ${escapar(t.numero)}</span>${escapar(t.nome)}</h3>
            <p class="prato__ferramentas">${escapar(t.ferramentas)}</p>
          </div>
          <p class="prato__desc">${escapar(t.aprende)}</p>
          <p class="prato__resultado">Ao final: ${escapar(t.resultado)}</p>
        </div>
      </li>`).join('');
  }

  function montarPlanos() {
    const lista = $('[data-render="planos"]');
    if (!lista || !Array.isArray(DADOS.planos)) return;
    const f = DADOS.fundador || {};
    // Cada degrau tem um tom da paleta e uma faixa-botão num tom mais escuro.
    const tons = [
      { tom: 'var(--pedra)', escuro: '#D9D1BF', tinta: 'var(--texto)' },
      { tom: '#3F5A46', escuro: '#2F4537', tinta: 'var(--papel)' },
      { tom: 'var(--grafite)', escuro: 'var(--preto)', tinta: 'var(--papel)' }
    ];
    lista.innerHTML = DADOS.planos.map((p, i) => {
      const t = tons[i % tons.length];
      const promo = f.desconto ? Math.round(p.preco * (1 - f.desconto) * 100) / 100 : null;
      return `
      <li class="degrau" style="--tom: ${t.tom}; --tom-escuro: ${t.escuro}; --tinta-degrau: ${t.tinta}" data-inclinar data-brilho>
        ${i === 1 ? '<span class="etiqueta degrau__selo">Recomendado</span>' : ''}
        <div class="degrau__corpo">
          <h3 class="degrau__nome">${escapar(p.nome)}</h3>
          <p class="degrau__preco"><span data-contar="${p.preco}">${reais(p.preco)}</span><small>/mês</small></p>
          <ul class="degrau__inclui">${(p.inclui || []).map((item) => `<li>${escapar(item)}</li>`).join('')}</ul>
          ${promo !== null ? `<p class="degrau__fundador">Na lista de espera: ${reais(promo)}/mês nos ${escapar(f.meses)} primeiros meses</p>` : ''}
        </div>
        <a class="degrau__acao" href="#lista" data-plano="${escapar(p.nome)}">Entrar na lista de espera</a>
      </li>`;
    }).join('');
  }

  function montarCondicao() {
    const f = DADOS.fundador;
    if (!f) return;
    const frase = `${fracaoDesconto(f.desconto)} nos ${porExtenso(f.meses)} primeiros meses e o preço de lançamento por ${prazoTrava(f.travaMeses)}`;
    const planos = $('[data-render="condicao"]');
    if (planos) planos.textContent = `Condição de fundador: quem entra na lista de espera paga ${frase}.`;
    const cupom = $('[data-render="condicao-cupom"]');
    if (cupom) cupom.textContent = `Quem entra agora garante a condição de fundador: ${frase}. Entrar na lista é gratuito.`;
  }

  function montarEquipe() {
    const lista = $('[data-render="equipe"]');
    if (!lista || !Array.isArray(DADOS.equipe)) return;
    const tons = [
      { tom: '#C9D3C4', tinta: 'var(--preto)' },
      { tom: 'var(--salvia)', tinta: 'var(--preto)' },
      { tom: '#3F5A46', tinta: 'var(--papel)' },
      { tom: 'var(--carvao)', tinta: 'var(--papel)' }
    ];
    lista.innerHTML = DADOS.equipe.map((p, i) => {
      const t = tons[i % tons.length];
      const partes = String(p.nome).trim().split(/\s+/);
      const iniciais = ((partes[0] || '')[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '');
      const retrato = p.foto
        ? `<img src="${escapar(p.foto)}" alt="Retrato de ${escapar(p.nome)}" loading="lazy" decoding="async">`
        : `<span class="pessoa__iniciais" aria-hidden="true">${escapar(iniciais.toUpperCase())}</span>`;
      return `
      <li class="pessoa">
        <div class="pessoa__retrato" style="--tom: ${t.tom}; --tinta-retrato: ${t.tinta}">${retrato}<svg class="pessoa__no" aria-hidden="true" focusable="false"><use href="#s-simbolo"/></svg></div>
        <p class="pessoa__nome">${escapar(p.nome)}</p>
        <p class="pessoa__funcao">${escapar(p.funcao)}</p>
      </li>`;
    }).join('');
  }

  function montarRodape() {
    const redes = $('[data-render="redes"]');
    if (redes && Array.isArray(CONFIG.redes)) {
      redes.insertAdjacentHTML('beforeend', CONFIG.redes.map((r) => {
        const externo = /^https?:\/\//.test(r.url);
        return `<a class="link" href="${escapar(r.url)}"${externo ? ' target="_blank" rel="noopener"' : ''}>${escapar(r.nome)}</a>`;
      }).join(''));
    }
    const email = $('[data-render="email"]');
    if (email) {
      if (CONFIG.email) email.innerHTML = `<a class="link link--sublinhado" href="mailto:${escapar(CONFIG.email)}">${escapar(CONFIG.email)}</a>`;
      else email.remove();
    }
  }

  function montarSegmentos() {
    const campo = $('[data-render="segmentos"]');
    if (!campo || !Array.isArray(CONFIG.segmentos)) return;
    CONFIG.segmentos.forEach((s) => campo.add(new Option(s, s)));
  }

  /* ========================================================================
     2. INTERAÇÕES
     ======================================================================== */

  // Âncoras internas: rolagem suave e foco no destino (acessibilidade).
  function iniciarAncoras() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const alvo = document.getElementById(id.slice(1));
      if (!alvo) return;
      e.preventDefault();
      if (link.dataset.plano) { const campo = $('[data-plano-interesse]'); if (campo) campo.value = link.dataset.plano; }
      rolarPara(id === '#topo' ? 0 : alvo);
      history.replaceState(null, '', id);
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
    });
  }

  // Menu do celular: folha de tela cheia com foco preso e tecla Esc.
  function iniciarMenu() {
    const menu = $('[data-menu]');
    const abrir = $('[data-menu-abrir]');
    const fechar = $('[data-menu-fechar]');
    if (!menu || !abrir) return;
    let focoAnterior = null;
    const focaveis = () => $$('a[href], button', menu);
    const abrirMenu = () => {
      focoAnterior = document.activeElement;
      menu.hidden = false;
      abrir.setAttribute('aria-expanded', 'true');
      doc.classList.add('menu-aberto');
      if (lenis) lenis.stop();
      focaveis()[0]?.focus();
    };
    const fecharMenu = (devolverFoco = true) => {
      if (menu.hidden) return;
      menu.hidden = true;
      abrir.setAttribute('aria-expanded', 'false');
      doc.classList.remove('menu-aberto');
      if (lenis) lenis.start();
      if (devolverFoco) focoAnterior?.focus();
    };
    abrir.addEventListener('click', abrirMenu);
    fechar?.addEventListener('click', () => fecharMenu());
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { fecharMenu(); return; }
      if (e.key !== 'Tab') return;
      const lista = focaveis();
      const primeiro = lista[0], ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });
    // Ao escolher um destino, o menu fecha antes da rolagem.
    $$('a[href^="#"]', menu).forEach((a) => a.addEventListener('click', () => fecharMenu(false), { capture: true }));
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) fecharMenu(false); });
  }

  // Cabeçalho: some ao descer, volta ao subir; assume o chão da seção embaixo dele.
  function iniciarCabecalho() {
    const cab = $('[data-cabecalho]');
    if (!cab) return;
    let ultimoY = window.scrollY;
    const aoRolar = (y) => {
      const desce = y > ultimoY + 2;
      const sobe = y < ultimoY - 2;
      if (y > 180 && desce && !cab.contains(document.activeElement)) cab.classList.add('is-escondido');
      else if (sobe || y <= 180) cab.classList.remove('is-escondido');
      ultimoY = y;
    };
    if (lenis) lenis.on('scroll', ({ scroll }) => aoRolar(scroll));
    else window.addEventListener('scroll', () => aoRolar(window.scrollY), { passive: true });
    cab.addEventListener('focusin', () => cab.classList.remove('is-escondido'));

    const secoes = $$('main > section[data-chao], footer[data-chao]');
    const aplicar = (secao) => {
      const cs = getComputedStyle(secao);
      doc.style.setProperty('--cab-chao', cs.getPropertyValue('--chao').trim());
      doc.style.setProperty('--cab-tinta', cs.getPropertyValue('--tinta').trim());
    };
    if (temGsap) {
      secoes.forEach((secao) => ScrollTrigger.create({
        trigger: secao, start: 'top top+=34', end: 'bottom top+=34',
        onToggle: (self) => { if (self.isActive) aplicar(secao); }
      }));
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => { if (en.isIntersecting) aplicar(en.target); });
      }, { rootMargin: '0px 0px -94% 0px' });
      secoes.forEach((s) => io.observe(s));
    }
  }

  // Rodapé: os blocos de "PotencIA" se comportam como o Dock do Mac. O bloco sob o ponteiro
  // cresce mais e acende em dourado; os vizinhos crescem menos, numa onda que segue o mouse.
  // Só com mouse; com movimento reduzido, fica apenas o dourado (sem crescer).
  function iniciarMarcaRodape() {
    const marca = $('[data-marca-blocos]');
    if (!marca || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const blocos = $$('.bloco', marca);
    const crescer = temGsap && !calmo.matches;
    const alturas = crescer ? blocos.map((b) => gsap.quickTo(b, '--sobe', { duration: 0.55, ease: 'power3' })) : [];
    const ALCANCE = 2.4;  // quantos blocos de cada lado sentem o ponteiro
    const MAXIMO = 0.24;  // quanto o bloco sob o ponteiro cresce (fração da altura da faixa)

    marca.addEventListener('pointermove', (e) => {
      blocos.forEach((b, i) => {
        const caixa = b.getBoundingClientRect();
        const distancia = Math.abs(e.clientX - (caixa.left + caixa.width / 2)) / caixa.width;
        const t = Math.max(0, 1 - distancia / ALCANCE);
        if (crescer) alturas[i](MAXIMO * t * t * (3 - 2 * t)); // curva suave (smoothstep)
        b.classList.toggle('is-aceso', distancia < 0.5);
      });
    });
    marca.addEventListener('pointerleave', () => {
      blocos.forEach((b, i) => {
        if (crescer) alturas[i](0);
        b.classList.remove('is-aceso');
      });
    });
  }

  // Imagens dentro dos SVGs de exemplo só carregam quando o post se aproxima da tela.
  function carregarImagensSvg(raiz) {
    $$('image[data-href]', raiz).forEach((img) => {
      img.setAttribute('href', img.getAttribute('data-href'));
      img.removeAttribute('data-href');
    });
  }
  function iniciarImagensSvg() {
    const raizes = $$('[data-feed], [data-comparador]');
    if (!('IntersectionObserver' in window)) { raizes.forEach(carregarImagensSvg); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { carregarImagensSvg(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '700px 0px' });
    raizes.forEach((r) => io.observe(r));
  }

  // Hero: o nó da logo vira o fundo, em linhas finas (cópia do nó da abertura).
  function montarFundoHero() {
    clonarNo($('[data-hero-fundo]'), 'hero__no');
  }

  // Hero: o reel da vitrine toca só enquanto aparece (com movimento reduzido fica o pôster).
  function iniciarVideoHero() {
    const video = $('[data-hero-video]');
    if (!video || calmo.matches) return;
    const tocar = () => video.play().catch(() => {});
    if (!('IntersectionObserver' in window)) { tocar(); return; }
    new IntersectionObserver(([en]) => (en.isIntersecting ? tocar() : video.pause())).observe(video);
  }

  // Desenha um nó ao longo do próprio percurso: cada trecho traz sua posição (data-de/data-ate,
  // de 0 a 1) e pathLength="1"; as linhas da fita avançam juntas. Devolve o tween.
  function desenharNo(svg, vars) {
    const trechos = $$('path', svg).map((el) => ({ el, de: +el.dataset.de, ate: +el.dataset.ate }));
    const inicio = Math.min(...trechos.map((t) => t.de));
    const fim = Math.max(...trechos.map((t) => t.ate));
    trechos.forEach((t) => { t.el.style.strokeDasharray = '1 1'; t.el.style.strokeDashoffset = '1'; });
    const desenho = { p: 0 };
    return gsap.to(desenho, {
      p: 1, ...vars,
      onUpdate: () => {
        const pos = inicio + (fim - inicio) * desenho.p;
        trechos.forEach((t) => {
          t.el.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, (pos - t.de) / (t.ate - t.de))));
        });
      }
    });
  }

  // Comparador antes/depois: arrastar, tocar, teclado e os dois botões.
  let pararDicaComparador = () => {};
  function iniciarComparador() {
    const comp = $('[data-comparador]');
    if (!comp) return;
    const faixa = $('[data-comparador-faixa]', comp);
    const estado = { pos: 50 };
    const definir = (valor) => {
      estado.pos = Math.max(0, Math.min(100, valor));
      comp.style.setProperty('--pos', `${estado.pos}%`);
      faixa.value = String(Math.round(estado.pos));
      faixa.setAttribute('aria-valuetext', estado.pos >= 99 ? 'Só o antes' : estado.pos <= 1 ? 'Só o depois' : `${Math.round(estado.pos)}% antes`);
    };
    const posicaoDe = (x) => { const r = comp.getBoundingClientRect(); return ((x - r.left) / r.width) * 100; };
    let animacao = null;
    const animarPara = (valor) => {
      pararDicaComparador();
      if (comMovimento()) {
        animacao?.kill();
        animacao = gsap.to(estado, { pos: valor, duration: 0.9, ease: 'power3.inOut', onUpdate: () => definir(estado.pos) });
      } else definir(valor);
    };

    let pressionado = false, decidido = false, inicioX = 0, inicioY = 0;
    comp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pressionado = true; inicioX = e.clientX; inicioY = e.clientY;
      decidido = e.pointerType === 'mouse';
      if (decidido) {
        comp.setPointerCapture(e.pointerId);
        comp.classList.add('is-arrastando');
        pararDicaComparador(); animacao?.kill();
        definir(posicaoDe(e.clientX));
      }
    });
    comp.addEventListener('pointermove', (e) => {
      if (!pressionado) return;
      if (!decidido) {
        const dx = Math.abs(e.clientX - inicioX), dy = Math.abs(e.clientY - inicioY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { pressionado = false; return; } // gesto vertical: deixa a página rolar
        decidido = true;
        comp.setPointerCapture(e.pointerId);
        comp.classList.add('is-arrastando');
        pararDicaComparador(); animacao?.kill();
      }
      definir(posicaoDe(e.clientX));
    });
    const soltar = (e) => {
      if (pressionado && !decidido && e.type === 'pointerup') animarPara(posicaoDe(e.clientX)); // toque simples
      pressionado = false; decidido = false;
      comp.classList.remove('is-arrastando');
    };
    comp.addEventListener('pointerup', soltar);
    comp.addEventListener('pointercancel', soltar);
    faixa.addEventListener('input', () => { pararDicaComparador(); animacao?.kill(); definir(Number(faixa.value)); });
    $$('[data-ir]').forEach((b) => b.addEventListener('click', () => animarPara(b.dataset.ir === 'antes' ? 100 : 0)));
    definir(50);

    // Dica de interação (uma vez, com movimento): a linha passeia e volta ao meio.
    if (comMovimento()) {
      let dica = null;
      pararDicaComparador = () => { dica?.kill(); dica = null; };
      ScrollTrigger.create({
        trigger: comp, start: 'top 62%', once: true,
        onEnter: () => {
          dica = gsap.timeline({ delay: 0.5, onUpdate: () => definir(estado.pos) })
            .to(estado, { pos: 80, duration: 0.9, ease: 'power2.inOut' })
            .to(estado, { pos: 22, duration: 1.1, ease: 'power2.inOut' })
            .to(estado, { pos: 50, duration: 0.8, ease: 'power2.inOut' });
        }
      });
    }
  }

  // Abas do carrossel (Capa, Conteúdo, Chamada), com setas do teclado.
  function iniciarAbas() {
    const abas = $$('[data-aba]');
    if (!abas.length) return;
    const slides = $$('.comparador .slide');
    const selecionar = (i, focar = false) => {
      abas.forEach((aba, j) => {
        const sel = i === j;
        aba.setAttribute('aria-selected', String(sel));
        aba.tabIndex = sel ? 0 : -1;
      });
      slides.forEach((s) => s.classList.toggle('is-ativo', Number(s.dataset.slide) === i));
      if (focar) abas[i].focus();
    };
    abas.forEach((aba, i) => {
      aba.addEventListener('click', () => selecionar(i));
      aba.addEventListener('keydown', (e) => {
        const n = abas.length;
        const mapa = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (e.key in mapa) { e.preventDefault(); selecionar(mapa[e.key], true); }
      });
    });
  }

  // Como funciona: "o fio da jornada". No computador (com movimento) a seção fica presa e a
  // rolagem vira um percurso horizontal; uma fita sálvia pendurada de estação em estação se
  // desenha até o meio da tela e, quando chega numa estação, ela acende e o artefato ganha
  // vida. No celular, a linha desce na vertical e cada estação acende ao entrar na tela.
  // Sem movimento, tudo fica no estado final (o CSS já mostra assim).
  function iniciarJornada() {
    const secao = $('[data-jornada]');
    if (!secao || !comMovimento()) return;
    const trilho = $('[data-jornada-trilho]', secao);
    const estacoes = $$('[data-estacao]', secao);
    const contador = $('[data-jornada-contador]', secao);
    const barra = $('[data-jornada-barra]', secao);
    const dois = (n) => String(n).padStart(2, '0');
    estacoes.forEach(rebobinarArtefato);

    const ativar = (estacao) => {
      if (estacao.classList.contains('is-ativa')) return;
      estacao.classList.add('is-ativa');
      animarArtefato(estacao);
    };

    const mm = gsap.matchMedia();
    mm.add('(min-width: 56.25em)', () => {
      secao.classList.add('is-horizontal');
      const fio = $('[data-fio]', secao);
      const fundo = $('[data-fio-fundo]', secao);
      let tabela = [];
      let comprimento = 1;

      // Traça a fita: começa no texto de abertura e "pendura" entre as marcas das estações,
      // como um fio preso em pregos; depois da última, sai pela direita.
      const tracar = () => {
        const base = trilho.getBoundingClientRect();
        const pontos = estacoes.map((e) => {
          const r = $('.estacao__marca', e).getBoundingClientRect();
          return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
        });
        if (!pontos.length) return;
        const y = pontos[0].y;
        const queda = Math.min(window.innerHeight * 0.1, 110);
        let d = `M ${Math.round(pontos[0].x - window.innerWidth * 0.32)} ${Math.round(y + queda * 0.6)} C ${Math.round(pontos[0].x - window.innerWidth * 0.16)} ${Math.round(y + queda)}, ${Math.round(pontos[0].x - 80)} ${Math.round(y)}, ${Math.round(pontos[0].x)} ${Math.round(y)}`;
        for (let i = 1; i < pontos.length; i++) {
          const a = pontos[i - 1], b = pontos[i], meio = (b.x - a.x) / 2;
          d += ` C ${Math.round(a.x + meio * 0.6)} ${Math.round(a.y + queda)}, ${Math.round(b.x - meio * 0.6)} ${Math.round(b.y + queda)}, ${Math.round(b.x)} ${Math.round(b.y)}`;
        }
        const ultimo = pontos[pontos.length - 1];
        d += ` C ${Math.round(ultimo.x + 160)} ${Math.round(ultimo.y + queda)}, ${Math.round(ultimo.x + 320)} ${Math.round(ultimo.y + queda * 1.6)}, ${Math.round(base.width)} ${Math.round(ultimo.y + queda * 2.2)}`;
        fio.setAttribute('d', d);
        fundo.setAttribute('d', d);
        comprimento = fio.getTotalLength();
        tabela = [];
        for (let i = 0; i <= 600; i++) {
          const l = (comprimento * i) / 600;
          tabela.push({ l, x: fio.getPointAtLength(l).x });
        }
        fio.style.strokeDasharray = `${comprimento} ${comprimento}`;
      };

      // A ponta do fio acompanha o meio da tela; as estações que ela já passou acendem.
      const atualizar = () => {
        const deslocamento = -gsap.getProperty(trilho, 'x');
        const ponta = deslocamento + window.innerWidth * 0.52;
        const achado = tabela.find((p) => p.x >= ponta);
        const l = achado ? achado.l : comprimento;
        fio.style.strokeDashoffset = String(comprimento - l);
        // só acende estações quando a seção já está assentando na tela (não no carregamento)
        const naTela = secao.getBoundingClientRect().top < window.innerHeight * 0.35;
        let ultima = 0;
        estacoes.forEach((e, i) => {
          if (e.offsetLeft <= ponta && naTela) { ativar(e); ultima = i + 1; }
        });
        if (contador) contador.textContent = `${dois(Math.max(1, ultima))} / ${dois(estacoes.length)}`;
        if (barra) gsap.set(barra, { scaleX: ultima / estacoes.length });
      };

      const distancia = () => Math.max(0, trilho.scrollWidth - window.innerWidth);
      tracar();
      gsap.to(trilho, {
        x: () => -distancia(),
        ease: 'none',
        onUpdate: atualizar,
        scrollTrigger: {
          trigger: secao, start: 'top top', end: () => `+=${distancia()}`,
          pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
          onRefresh: () => { tracar(); atualizar(); }
        }
      });
      atualizar();
      return () => { secao.classList.remove('is-horizontal'); fio.removeAttribute('d'); fundo.removeAttribute('d'); };
    });

    mm.add('(max-width: 56.24em)', () => {
      gsap.fromTo('[data-fio-vertical]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.estacoes', start: 'top 70%', end: 'bottom 70%', scrub: true }
      });
      estacoes.forEach((e) => ScrollTrigger.create({ trigger: e, start: 'top 68%', once: true, onEnter: () => ativar(e) }));
    });
  }

  // Deixa cada artefato no ponto de partida da sua animação (só é chamado com movimento).
  function rebobinarArtefato(estacao) {
    const artefato = $('.artefato', estacao);
    if (!artefato) return;
    gsap.set(artefato, { opacity: 0, y: 50, rotation: -3 });
    gsap.set($('.artefato__etiqueta', estacao), { scale: 0, transformOrigin: '0% 100%' });
    gsap.set($$('[data-anima="msg"], [data-anima="zap"]', estacao), { opacity: 0, y: 14 });
    const digitar = $('[data-digitar]', estacao);
    if (digitar) { digitar.dataset.texto = digitar.textContent; digitar.textContent = ''; }
    $$('[data-anima="check"]', estacao).forEach((li) => li.classList.add('is-pendente'));
    gsap.set($$('.calendario__dias span', estacao), { opacity: 0, scale: 0.7 });
    gsap.set($$('.calendario__dias i', estacao), { scale: 0, transformOrigin: '0% 100%' });
    gsap.set($$('.voz__onda i', estacao), { scaleY: 0.12 });
    gsap.set($('[data-anima="aviso"]', estacao), { opacity: 0, y: -24 });
    gsap.set($$('.grafico__barras i', estacao), { scaleY: 0 });
    gsap.set($('[data-anima="cabeca"]', estacao), { left: '0%' });
  }

  // A estação acendeu: o artefato chega e faz a sua parte.
  function animarArtefato(estacao) {
    const artefato = $('.artefato', estacao);
    if (!artefato) return;
    const tl = gsap.timeline();
    tl.to(artefato, { opacity: 1, y: 0, rotation: 0, duration: 1.1, ease: 'expo.out' })
      .to($('.artefato__etiqueta', estacao), { scale: 1, duration: 0.6, ease: 'back.out(2.4)' }, 0.35);

    if (artefato.classList.contains('artefato--chat')) {
      const digitar = $('[data-digitar]', estacao);
      const texto = digitar ? digitar.dataset.texto || '' : '';
      const n = { c: 0 };
      const checks = $$('[data-anima="check"]', estacao);
      tl.to($$('[data-anima="msg"]', estacao), { opacity: 1, y: 0, duration: 0.5, stagger: 0.45, ease: 'power3.out' }, 0.4)
        .to(n, { c: texto.length, duration: 1.6, ease: 'none', onUpdate: () => { if (digitar) digitar.textContent = texto.slice(0, Math.round(n.c)); } }, 1)
        .add(() => checks[0]?.classList.remove('is-pendente'), 2.3)
        .add(() => checks[1]?.classList.remove('is-pendente'), 2.7)
        .add(() => checks[2]?.classList.remove('is-pendente'), 3.1);
    } else if (artefato.classList.contains('artefato--calendario')) {
      tl.to($$('.calendario__dias span', estacao), { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out', stagger: { each: 0.018, from: 'start' } }, 0.3)
        .to($$('.calendario__dias i', estacao), { scale: 1, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.12 }, 0.9);
    } else if (artefato.classList.contains('artefato--reel')) {
      tl.to($('[data-anima="cabeca"]', estacao), { left: '100%', duration: 9, ease: 'none', repeat: -1 }, 0.4);
    } else if (artefato.classList.contains('artefato--voz')) {
      tl.to($$('.voz__onda i', estacao), {
        scaleY: () => gsap.utils.random(0.25, 1), duration: 0.32, ease: 'sine.inOut',
        stagger: { each: 0.025, repeat: -1, yoyo: true }, repeatRefresh: true
      }, 0.5);
    } else if (artefato.classList.contains('artefato--post')) {
      tl.to($('[data-anima="aviso"]', estacao), { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)' }, 1);
    } else if (artefato.classList.contains('artefato--venda')) {
      tl.to($$('[data-anima="zap"]', estacao), { opacity: 1, y: 0, duration: 0.45, stagger: 0.6, ease: 'power3.out' }, 0.5)
        .to($$('.grafico__barras i', estacao), { scaleY: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.8);
    }
  }

  // O reel da estação "Criar" toca só enquanto aparece (com movimento reduzido fica o pôster).
  function iniciarVideo() {
    const video = $('[data-video]');
    if (!video || calmo.matches || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([en]) => (en.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.35 }).observe(video);
  }

  // Formulário da lista de espera: validação, máscara, envio e sucesso.
  function iniciarFormulario() {
    const form = $('[data-form]');
    if (!form) return;
    const endpoint = String(CONFIG.formEndpoint || '').trim();
    if (endpoint) form.action = endpoint;

    const campos = {
      nome: $('#f-nome', form),
      email: $('#f-email', form),
      whatsapp: $('#f-whatsapp', form),
      segmento: $('#f-segmento', form)
    };
    const regras = {
      nome: (v) => v.trim().length >= 2 || 'Digite seu nome.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Confira o e-mail.',
      whatsapp: (v) => { const d = v.replace(/\D/g, ''); return d.length === 10 || d.length === 11 || 'Confira o número com DDD.'; },
      segmento: (v) => Boolean(v) || 'Escolha o segmento do seu negócio.'
    };
    const validar = (nome) => {
      const campo = campos[nome];
      const resultado = regras[nome](campo.value);
      const ok = resultado === true;
      const caixa = campo.closest('.campo');
      caixa.classList.toggle('is-invalido', !ok);
      campo.setAttribute('aria-invalid', String(!ok));
      $('.campo__erro', caixa).textContent = ok ? '' : resultado;
      return ok;
    };

    // Máscara do WhatsApp: (11) 98765-4321
    campos.whatsapp.addEventListener('input', () => {
      const d = campos.whatsapp.value.replace(/\D/g, '').slice(0, 11);
      let texto = d;
      if (d.length > 2) texto = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 6) texto = d.length === 11
        ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
        : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      campos.whatsapp.value = texto;
    });
    Object.keys(campos).forEach((nome) => {
      const campo = campos[nome];
      campo.addEventListener('blur', () => { if (campo.value) validar(nome); });
      campo.addEventListener('input', () => { if (campo.closest('.campo').classList.contains('is-invalido')) validar(nome); });
    });
    campos.segmento.addEventListener('change', () => validar('segmento'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const validos = Object.keys(campos).map(validar);
      if (!validos.every(Boolean)) {
        Object.values(campos).find((c) => c.getAttribute('aria-invalid') === 'true')?.focus();
        return;
      }
      if (form.elements._gotcha && form.elements._gotcha.value) return; // armadilha para robôs

      const botao = $('[data-enviar]', form);
      const falha = $('[data-falha]', form);
      const rotulo = botao.textContent;
      falha.textContent = '';
      botao.disabled = true;
      botao.textContent = 'Enviando…';
      try {
        if (endpoint) {
          const resposta = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
        } else {
          // Modo demonstração: sem endpoint, nada é enviado. Configure em dados.js.
          console.info('[PotencIA] Formulário em modo demonstração: configure config.formEndpoint em dados.js para receber os cadastros.');
          await new Promise((r) => setTimeout(r, 700));
        }
        mostrarSucesso(campos.nome.value);
      } catch (erro) {
        falha.textContent = 'Não deu para enviar agora. Confira sua conexão e tente de novo.';
        botao.disabled = false;
        botao.textContent = rotulo;
      }
    });
  }

  // Sucesso: o formulário se destaca no picote e o cupom confirma o lugar.
  function mostrarSucesso(nome) {
    const form = $('[data-form]');
    const sucesso = $('[data-sucesso]');
    const primeiro = String(nome).trim().split(/\s+/)[0];
    $('[data-sucesso-titulo]').textContent = primeiro ? `Pronto, ${primeiro}. Você está na lista.` : 'Pronto. Você está na lista.';
    const exibir = () => {
      form.hidden = true;
      sucesso.hidden = false;
      sucesso.focus({ preventScroll: true });
    };
    const simbolo = $('[data-no-sucesso]', sucesso);
    if (simbolo && !$('svg', simbolo)) clonarNo(simbolo, 'cupom__sucesso-no');
    if (!comMovimento()) { exibir(); return; }
    const tl = gsap.timeline()
      .to(form, { xPercent: 7, yPercent: 2, rotation: 2.5, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .add(exibir)
      .from($$(':scope > *', sucesso), { y: 18, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
    if (simbolo && $('svg', simbolo)) tl.add(desenharNo($('svg', simbolo), { duration: 1.4, ease: 'power2.inOut' }), '<');
  }

  /* ========================================================================
     3. MOVIMENTO
     ======================================================================== */

  // Entrada com máscara: cada linha sobe de trás da sua linha de base.
  function linhas(el, gatilho, opcoes = {}) {
    if (!el) return;
    if (typeof window.SplitText === 'undefined') { revelar(el, gatilho); return; }
    const corte = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'linha-cortada' });
    gsap.from(corte.lines, {
      yPercent: 112, duration: 1.05, ease: 'power4.out', stagger: 0.1, delay: opcoes.atraso || 0,
      scrollTrigger: { trigger: gatilho || el, start: opcoes.inicio || 'top 84%', once: true },
      onComplete: () => corte.revert()
    });
  }

  // Entrada simples: sobe e aparece, com escalonamento.
  function revelar(alvos, gatilho, extra = {}) {
    const els = gsap.utils.toArray(alvos);
    if (!els.length) return;
    const { inicio = 'top 84%', ...resto } = extra;
    gsap.from(els, {
      y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, ...resto,
      scrollTrigger: { trigger: gatilho || els[0], start: inicio, once: true }
    });
  }

  // Cortina: a peça abre de baixo para cima (fotos, blocos, degraus).
  function cortina(alvos, gatilho, extra = {}) {
    const els = gsap.utils.toArray(alvos);
    if (!els.length) return;
    const { inicio = 'top 84%', ...resto } = extra;
    gsap.fromTo(els, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'expo.inOut', stagger: 0.09, ...resto,
      scrollTrigger: { trigger: gatilho || els[0], start: inicio, once: true },
      clearProps: 'clipPath'
    });
  }

  // Copia o nó da abertura (trechos com a posição no percurso) para outro lugar da página.
  function clonarNo(destino, classe) {
    const no = $('.abertura__no');
    if (!destino || !no) return null;
    const copia = no.cloneNode(true);
    copia.setAttribute('class', classe);
    copia.removeAttribute('stroke-width');
    $$('path', copia).forEach((p) => p.removeAttribute('style'));
    destino.appendChild(copia);
    return copia;
  }

  // O nó em fio ao fundo de algumas seções: ele se desenha conforme a seção passa
  // e gira devagar com a rolagem. Sem movimento, fica desenhado e parado.
  function montarFundosNo() {
    $$('[data-fundo-no]').forEach((fundo) => {
      const svg = clonarNo(fundo, 'fundo-no__svg');
      if (!svg || !comMovimento()) return;
      const secao = fundo.closest('section') || fundo.parentElement;
      desenharNo(svg, { ease: 'none', scrollTrigger: { trigger: secao, start: 'top 85%', end: 'center 35%', scrub: 1 } });
      gsap.fromTo(fundo, { rotation: -20 }, { rotation: 20, ease: 'none', scrollTrigger: { trigger: secao, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  // Inclinação 3D que segue o mouse (cartões, peças, cupom). Para enquanto há foco dentro,
  // para não atrapalhar quem está digitando.
  function inclinar(el, maximo = 6) {
    if (!el || !comMovimento() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      if (el.matches(':focus-within')) { rx(0); ry(0); return; }
      const caixa = el.getBoundingClientRect();
      ry(((e.clientX - caixa.left) / caixa.width - 0.5) * maximo * 2);
      rx(-((e.clientY - caixa.top) / caixa.height - 0.5) * maximo * 2);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  // Brilho que segue o mouse: só informa a posição (--mx, --my); o CSS desenha.
  function brilhoCursor(el) {
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    el.addEventListener('pointermove', (e) => {
      const caixa = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${Math.round(e.clientX - caixa.left)}px`);
      el.style.setProperty('--my', `${Math.round(e.clientY - caixa.top)}px`);
    });
  }

  // Número que conta até o valor quando aparece (preços dos planos).
  function contar(el, gatilho) {
    const valor = Number(el.dataset.contar);
    if (!Number.isFinite(valor)) return;
    const n = { v: 0 };
    el.textContent = reais(0);
    gsap.to(n, {
      v: valor, duration: 1.6, ease: 'power3.out',
      scrollTrigger: { trigger: gatilho || el, start: 'top 82%', once: true },
      onUpdate: () => { el.textContent = reais(Math.round(n.v)); },
      onComplete: () => { el.textContent = reais(valor); }
    });
  }

  // Trilhas: com mouse, a foto da trilha flutua junto ao cursor, maior, com a etiqueta
  // do número, e gira um pouco conforme a velocidade do ponteiro.
  // Quem decide se ela aparece é uma verificação só (conferir): o que está de fato sob o
  // ponteiro agora. Não depende de pointerenter/pointerleave, que o navegador pode disparar
  // atrasado (ou não disparar) quando a página rola com o mouse parado.
  function previaTrilhas() {
    const cardapio = $('[data-render="trilhas"]');
    if (!cardapio || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const grandes = { 'mini/paneleiras.webp': 'paneleiras-take-poster.webp', 'mini/tipos.webp': 'mini/tipos.webp' };
    const fotoGrande = (src) => {
      const nome = src.split('assets/')[1] || '';
      return 'assets/' + (grandes[nome] || nome.replace('mini/', ''));
    };
    const previa = document.createElement('div');
    previa.className = 'trilhas__previa';
    previa.setAttribute('aria-hidden', 'true');
    previa.innerHTML = '<img alt="" decoding="async"><span class="etiqueta"></span>';
    document.body.appendChild(previa);
    const img = $('img', previa);
    const etiqueta = $('.etiqueta', previa);
    gsap.set(previa, { xPercent: -50, yPercent: -50, scale: 0.85, autoAlpha: 0 });
    const px = gsap.quickTo(previa, 'x', { duration: 0.6, ease: 'power3' });
    const py = gsap.quickTo(previa, 'y', { duration: 0.6, ease: 'power3' });
    const giro = gsap.quickTo(previa, 'rotation', { duration: 0.9, ease: 'power3' });

    let ponteiro = null;  // última posição do mouse dentro da janela
    let atual = null;     // trilha cuja foto está na tela
    let rolando = false;
    let ultimoX = 0;
    let fimDaRolagem = 0;
    let vigia = 0;        // enquanto a foto está visível, confere de tempos em tempos

    const mostrar = (prato) => {
      if (prato === atual) return;
      atual = prato;
      const foto = $('.prato__foto img', prato);
      img.onerror = () => { img.onerror = null; img.src = foto.src; };
      img.src = fotoGrande(foto.getAttribute('src') || '');
      etiqueta.textContent = $('.prato__trilha', prato)?.textContent || '';
      gsap.to(previa, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      // o conteúdo pode se mover sem rolagem (imagens carregando, layout recalculado)
      if (!vigia) vigia = window.setInterval(() => conferir(), 250);
    };
    const esconder = () => {
      if (!atual) return;
      atual = null;
      window.clearInterval(vigia);
      vigia = 0;
      gsap.to(previa, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
    };
    const conferir = () => {
      const sob = ponteiro && !rolando ? document.elementFromPoint(ponteiro.x, ponteiro.y) : null;
      const prato = sob ? sob.closest('.prato') : null;
      if (prato && cardapio.contains(prato)) mostrar(prato);
      else esconder();
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      ponteiro = { x: e.clientX, y: e.clientY };
      const lado = e.clientX > window.innerWidth * 0.62 ? -1 : 1; // perto da borda direita, vai para a esquerda
      px(e.clientX + lado * (previa.offsetWidth / 2 + 56));
      py(e.clientY);
      giro(gsap.utils.clamp(-9, 9, (e.clientX - ultimoX) * 0.5));
      ultimoX = e.clientX;
      conferir();
    }, { passive: true });

    // Mouse saiu da janela ou a janela perdeu o foco: some.
    document.documentElement.addEventListener('pointerleave', () => { ponteiro = null; esconder(); });
    window.addEventListener('blur', () => { ponteiro = null; esconder(); });

    // Durante a rolagem a foto fica escondida; quando a rolagem para, confere de novo.
    const aoRolar = () => {
      rolando = true;
      esconder();
      window.clearTimeout(fimDaRolagem);
      fimDaRolagem = window.setTimeout(() => { rolando = false; conferir(); }, 180);
    };
    if (lenis) lenis.on('scroll', aoRolar);
    else window.addEventListener('scroll', aoRolar, { passive: true });
    ScrollTrigger.addEventListener('refresh', conferir);
  }

  // Abertura da logo (cerca de 3 s): o nó é desenhado ao longo do próprio percurso, com as
  // quatro linhas da fita juntas, enquanto gira um oitavo de volta e assenta; o nome sobe letra
  // a letra e o traço dourado se abre. Depois o nome se recolhe e o nó cresce até virar o nó
  // gigante do fundo da hero (mesma posição, linhas afinando até o fio de 1 px), enquanto a
  // tela escura se dissolve e a hero entra. Clique ou tecla acelera.
  // `depois` (a entrada do hero) recebe { noPronto: true } quando o nó já chega desenhado.
  function aberturaLogo(depois) {
    const tela = $('[data-abertura]');
    if (!tela) { depois(); return; }
    if (lenis) lenis.stop();
    tela.style.animation = 'none'; // o JavaScript assumiu: a rede de segurança do CSS sai

    const giro = $('.abertura__giro', tela);
    const noAbertura = $('.abertura__no', tela);
    const noHero = $('.hero__no');
    // Só dá para encaixar no nó da hero se ela estiver na tela (página no topo).
    const transformar = Boolean(noHero) && window.scrollY < 10;
    // Medidas tomadas antes de qualquer giro: de onde o nó sai e onde ele precisa chegar.
    let chegada = null;
    if (transformar) {
      const a = giro.getBoundingClientRect();
      const b = noHero.getBoundingClientRect();
      chegada = {
        x: b.left + b.width / 2 - (a.left + a.width / 2),
        y: b.top + b.height / 2 - (a.top + a.height / 2),
        escala: b.width / a.width,
        // traço final em unidades do desenho, para dar 1 px na tela (como o fio da hero)
        traco: noAbertura.viewBox.baseVal.width / b.width,
        opacidade: parseFloat(getComputedStyle(noHero).opacity) || 0.4
      };
      gsap.set(noHero, { visibility: 'hidden' });
    }

    const tl = gsap.timeline({
      onComplete: () => {
        doc.classList.add('abertura-feita');
        if (lenis) lenis.start();
        removerPulo();
      }
    });
    tl.add(desenharNo(noAbertura, { duration: 1.7, ease: 'power1.inOut' }), 0.1)
      .fromTo(giro, { rotation: -45, scale: 0.88 }, { rotation: 0, scale: 1, duration: 1.9, ease: 'power3.out' }, 0.05)
      .to('.abertura__nome span', { y: 0, duration: 0.6, stagger: 0.045, ease: 'power3.out' }, 1.3)
      .to('.abertura__traco', { scaleX: 1, duration: 0.45, ease: 'power2.out' }, 1.7)
      .addLabel('saida', 2.15);

    if (transformar) {
      tl.set(tela, { pointerEvents: 'none' }, 'saida')
        .to(['.abertura__nome', '.abertura__traco'], { opacity: 0, y: 14, duration: 0.35, ease: 'power2.in' }, 'saida')
        .to(giro, { x: chegada.x, y: chegada.y, scale: chegada.escala, duration: 1.05, ease: 'expo.inOut' }, 'saida+=0.05')
        .to(noAbertura, { attr: { 'stroke-width': chegada.traco }, opacity: chegada.opacidade, duration: 1.05, ease: 'expo.inOut' }, 'saida+=0.05')
        .to(tela, { backgroundColor: 'rgba(23, 30, 25, 0)', duration: 0.7, ease: 'power2.inOut' }, 'saida+=0.3')
        .add(() => depois({ noPronto: true }), 'saida+=0.6')
        // o nó da abertura chegou: o da hero assume no mesmo lugar
        .add(() => { gsap.set(noHero, { visibility: 'visible' }); gsap.set(tela, { autoAlpha: 0 }); }, 'saida+=1.1');
    } else {
      gsap.set(tela, { clipPath: 'inset(0% 0% 0% 0%)' });
      tl.to(tela, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.65, ease: 'expo.inOut' }, 'saida')
        .to('.abertura__logo', { y: '-8vh', opacity: 0.3, duration: 0.65, ease: 'expo.inOut' }, 'saida')
        .add(() => depois(), 'saida+=0.15');
    }

    // Clique ou tecla: acelera até o fim (a página aparece em menos de um segundo).
    const pular = () => { tl.timeScale(4); removerPulo(); };
    function removerPulo() {
      tela.removeEventListener('click', pular);
      window.removeEventListener('keydown', pular);
    }
    tela.addEventListener('click', pular);
    window.addEventListener('keydown', pular);
  }

  // Entrada do hero: o nó do fundo se desenha (a menos que já chegue pronto, vindo da
  // abertura), as linhas do título sobem, as peças da vitrine chegam girando de baixo e
  // assentam, e o texto de apoio aparece. Depois a hero fica viva.
  function entradaHero(opcoes = {}) {
    const giro = (el) => parseFloat(el.closest('.peca').style.getPropertyValue('--giro')) || 0;
    const no = $('.hero__no');
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.to('.cabecalho', { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
      .to('.hero .linha__in', { y: 0, duration: 1.15, stagger: 0.12 }, 0.12)
      .fromTo('.hero .peca__corpo',
        { opacity: 0, y: 160, scale: 0.82, rotation: (i, el) => giro(el) - 18 },
        { opacity: 1, y: 0, scale: 1, rotation: (i, el) => giro(el), duration: 1.5, stagger: 0.09, ease: 'expo.out' }, 0.3)
      .to('.hero [data-entrada]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out' }, 0.75)
      .add(() => { doc.classList.add('intro-feita'); trocarPalavras(); heroViva(); }, 1.3);
    if (no && !opcoes.noPronto) tl.add(desenharNo(no, { duration: 2.6, ease: 'power2.inOut' }), 0);
    // Marca do cabeçalho: o nó dá um quarto de volta e assenta, uma vez.
    gsap.from('.cabecalho .marca__simbolo', { rotation: -90, scale: 0.7, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.5 });
  }

  // Hero viva: as peças flutuam devagar, cada uma no seu ritmo; com mouse, elas e o nó
  // seguem o ponteiro em profundidades diferentes (as de data-profundidade maior andam mais).
  function heroViva() {
    $$('.hero .peca__flutua').forEach((el, i) => {
      gsap.to(el, { y: i % 2 ? 10 : -10, rotation: i % 2 ? 1.2 : -1.2, duration: 3.1 + i * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const hero = $('.hero');
    const seguir = (el, duracao) => ({ x: gsap.quickTo(el, 'x', { duration: duracao, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: duracao, ease: 'power3' }) });
    const alvos = $$('.hero .peca').map((el) => ({ prof: +el.dataset.profundidade || 1, ...seguir(el, 1) }));
    const no = $('.hero__no');
    const fundo = no ? seguir(no, 1.6) : null;
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      alvos.forEach((a) => { a.x(nx * 46 * a.prof); a.y(ny * 30 * a.prof); });
      if (fundo) { fundo.x(-nx * 18); fundo.y(-ny * 12); }
    });
    hero.addEventListener('pointerleave', () => {
      alvos.forEach((a) => { a.x(0); a.y(0); });
      if (fundo) { fundo.x(0); fundo.y(0); }
    });
  }

  // Palavras que se transformam: Conteúdo → Vídeo → Carrossel → Post → Conteúdo.
  // Um único span troca de texto em sequência (sai pela máscara, troca, entra), sem sobrepor palavras.
  function trocarPalavras() {
    const troca = $('[data-troca]');
    if (!troca) return;
    const palavra = $('.troca__palavra', troca);
    const original = palavra.textContent;
    const ordem = [...troca.dataset.troca.split(',').map((p) => p.trim()), original];
    // Leitores de tela ouvem sempre o título original enquanto a palavra visível muda.
    const titulo = troca.closest('h1');
    if (titulo && !titulo.hasAttribute('aria-label')) titulo.setAttribute('aria-label', titulo.textContent.replace(/\s+/g, ' ').trim());

    // Largura que a palavra vai ocupar, medida numa cópia invisível.
    const medir = (texto) => {
      const copia = palavra.cloneNode();
      copia.textContent = texto;
      copia.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;clip-path:none;transform:none;opacity:1';
      troca.appendChild(copia);
      const largura = copia.getBoundingClientRect().width;
      copia.remove();
      return largura;
    };
    // A palavra sai, a caixa assume a largura da próxima e só então a próxima entra:
    // nada invade o "de" ao lado.
    const passo = (texto) => {
      gsap.set(troca, { width: palavra.getBoundingClientRect().width });
      gsap.timeline()
        .to(palavra, { yPercent: -40, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', duration: 0.42, ease: 'power3.in' }, 0)
        .to(troca, { width: medir(texto), duration: 0.5, ease: 'expo.inOut' }, 0.2)
        .add(() => { palavra.textContent = texto; }, 0.42)
        .fromTo(palavra, { yPercent: 40, opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
          { yPercent: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: 'expo.out', immediateRender: false }, 0.6);
    };
    const limpar = () => {
      palavra.textContent = original;
      gsap.set(troca, { clearProps: 'width' });
      gsap.set(palavra, { clearProps: 'all' });
    };

    gsap.set(palavra, { clipPath: 'inset(0% 0% 0% 0%)' });
    const intervalo = 1.85; // tempo de cada palavra na tela, com a troca
    const mestre = gsap.timeline({ delay: 2.3 }); // o título original fica na tela antes da primeira troca
    ordem.forEach((texto, i) => mestre.add(() => passo(texto), i * intervalo));
    mestre.add(limpar, (ordem.length - 1) * intervalo + 1.3);
  }

  // Transição suave entre chãos claros e escuros: a seção que entra parte da
  // cor da anterior e assume a sua. Acontece uma vez, antes do texto aparecer.
  function chaoDasSecoes() {
    const secoes = $$('main > section[data-chao], footer[data-chao]');
    let anterior = null;
    secoes.forEach((secao) => {
      const final = getComputedStyle(secao).backgroundColor;
      if (anterior && anterior !== final && secao.getBoundingClientRect().top > window.innerHeight) {
        gsap.set(secao, { backgroundColor: anterior });
        ScrollTrigger.create({
          trigger: secao, start: 'top 98%', once: true,
          onEnter: () => gsap.to(secao, { backgroundColor: final, duration: 0.9, ease: 'power2.out', clearProps: 'backgroundColor' })
        });
      }
      anterior = final;
    });
  }

  function movimentoDasSecoes() {
    const desktop = window.matchMedia('(min-width: 56.25em)').matches;

    // Hero: ao rolar, as peças sobem e se afastam do centro em velocidades diferentes,
    // o nó do fundo gira devagar e o título sobe um pouco.
    const rolagemHero = () => ({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true });
    $$('.hero .peca').forEach((el) => {
      const prof = +el.dataset.profundidade || 1;
      const caixa = el.getBoundingClientRect();
      const lado = caixa.left + caixa.width / 2 < window.innerWidth / 2 ? -1 : 1;
      gsap.to(el, { yPercent: (desktop ? -45 : -12) * prof, xPercent: desktop ? lado * 18 * prof : 0, ease: 'none', scrollTrigger: rolagemHero() });
    });
    gsap.to('.hero__no', { rotation: 30, scale: 1.08, ease: 'none', scrollTrigger: rolagemHero() });
    gsap.to('.hero__miolo', { yPercent: -10, ease: 'none', scrollTrigger: rolagemHero() });

    // O problema: a frase se acende palavra a palavra conforme a rolagem (do apagado à tinta),
    // as miniaturas saltam como figurinhas e o feed passa de lado, inclinando com a velocidade
    // da rolagem; cada post brega chega com a etiqueta do seu erro.
    const declaracao = $('[data-declaracao]');
    if (declaracao) {
      if (typeof window.SplitText !== 'undefined') {
        const palavras = SplitText.create(declaracao, { type: 'words', wordsClass: 'palavra' });
        gsap.fromTo(palavras.words, { opacity: 0.14 }, {
          opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: declaracao, start: 'top 85%', end: 'bottom 50%', scrub: true }
        });
      } else revelar(declaracao);
      gsap.from('.miniatura', {
        scale: 0, rotation: -14, duration: 0.9, ease: 'back.out(2.4)', stagger: 0.16,
        scrollTrigger: { trigger: declaracao, start: 'top 62%', once: true }
      });
    }
    const trilho = $('[data-feed-trilho]');
    if (trilho) {
      revelar('.feed__post', '.feed', { y: 60, rotation: 2, duration: 1.1, stagger: 0.09, ease: 'expo.out', inicio: 'top 88%' });
      gsap.from('.feed__erro', {
        scale: 0, rotation: -10, transformOrigin: '0% 100%', duration: 0.7, ease: 'back.out(2.2)', stagger: 0.12, delay: 0.5,
        scrollTrigger: { trigger: '.feed', start: 'top 78%', once: true }
      });
      const inclina = gsap.quickTo(trilho, 'skewX', { duration: 0.6, ease: 'power3' });
      gsap.fromTo(trilho, { x: 60 }, {
        x: () => -(Math.max(0, trilho.scrollWidth - window.innerWidth) + 60),
        ease: 'none',
        scrollTrigger: {
          trigger: '.feed', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true,
          onUpdate: (self) => inclina(gsap.utils.clamp(-6, 6, self.getVelocity() / -300))
        }
      });
      ScrollTrigger.addEventListener('scrollEnd', () => inclina(0));
      revelar('.problema__nota', '.problema__nota');
    }

    // A prova: a placa abre como cortina; o texto entra em ordem.
    cortina('.prova__placa .comparador', '.prova');
    revelar('.abas', '.prova', { delay: 0.2 });
    linhas($('.prova__titulo'), '.prova', { atraso: 0.25 });
    revelar(['.prova__meio p', '.prova__acoes .celula'], '.prova', { delay: 0.45 });

    // Como funciona: o título sobe em linhas e o texto aparece (o fio e as estações ficam em
    // iniciarJornada).
    linhas($('#jornada-titulo'), '.jornada');
    revelar(['.jornada__texto', '.jornada__dica'], '.jornada', { delay: 0.15 });
  }

  function movimentoDepoisDaJornada() {
    const desktop = window.matchMedia('(min-width: 56.25em)').matches;

    // As trilhas: cabeçalho em linhas; em cada trilha, o fio de cima se desenha, a foto abre em
    // cortina, o número dourado salta e o texto sobe. Com mouse, a foto flutua junto ao cursor.
    linhas($('#trilhas-titulo'), '.trilhas');
    revelar('.trilhas__conta', '.trilhas', { delay: 0.2 });
    $$('.prato').forEach((prato) => {
      const quando = { trigger: prato, start: 'top 90%', once: true };
      gsap.from($('.prato__fio', prato), { scaleX: 0, duration: 1.3, ease: 'expo.inOut', scrollTrigger: quando });
      cortina($('.prato__foto img', prato), prato, { duration: 0.9, inicio: 'top 90%' });
      gsap.from($('.prato__expoente', prato), { scale: 0, rotation: -20, duration: 0.8, ease: 'back.out(2.4)', delay: 0.35, scrollTrigger: quando });
      revelar($$('.prato__texto > *', prato), prato, { y: 18, delay: 0.12, inicio: 'top 90%' });
    });
    previaTrilhas();

    // Ferramentas: os nomes gigantes chegam deslizando de lados alternados, presos à rolagem;
    // o papel de cada ferramenta aparece logo depois (o hover enche o nome de sálvia, no CSS).
    $$('.cartaz__linha').forEach((linha, i) => {
      const nome = $('.cartaz__nome', linha);
      if (linha.classList.contains('cartaz__linha--titulo')) { linhas(nome, linha, { inicio: 'top 90%' }); return; }
      gsap.fromTo(nome, { xPercent: i % 2 ? 14 : -14, opacity: 0.2 }, {
        xPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: linha, start: 'top bottom', end: 'top 55%', scrub: 0.6 }
      });
      const papel = $('.cartaz__papel', linha);
      if (papel) revelar(papel, linha, { delay: 0.2, inicio: 'top 80%' });
    });
    revelar('.ferramentas__nota', '.ferramentas__nota');

    // Sempre atualizada: o painel se abre até as bordas; as palavras do título se acendem com a
    // rolagem; a foto chega como peça da vitrine, inclina com o mouse e a etiqueta conta as
    // versões (1.0, 1.1, 1.2...) conforme o painel passa: a trilha se atualiza enquanto você lê.
    const painel = $('.sempre__painel');
    if (painel) {
      gsap.fromTo(painel, { clipPath: 'inset(7% 5% 7% 5%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: painel, start: 'top bottom', end: 'top 30%', scrub: 0.5 }
      });
      const titulo = $('[data-acender]');
      if (titulo && typeof window.SplitText !== 'undefined') {
        const palavras = SplitText.create(titulo, { type: 'words', wordsClass: 'palavra' });
        gsap.fromTo(palavras.words, { color: '#5C675F' }, {
          color: '#F6F1E7', ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: painel, start: 'top 72%', end: 'top 12%', scrub: true }
        });
      }
      const peca = $('.sempre__peca');
      if (peca) {
        gsap.from(peca, { y: 140, rotation: -14, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.sempre__foto', start: 'top 92%', once: true } });
        gsap.from('.sempre__etiqueta', { scale: 0, transformOrigin: '0% 100%', duration: 0.7, ease: 'back.out(2.2)', delay: 0.7, scrollTrigger: { trigger: '.sempre__foto', start: 'top 92%', once: true } });
        gsap.fromTo('.sempre__peca img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.sempre__foto', start: 'top bottom', end: 'bottom top', scrub: true } });
        inclinar(peca, 7);
      }
      const versao = $('[data-versao]');
      if (versao) {
        const versoes = ['1.0', '1.1', '1.2', '1.3', '2.0', '2.1'];
        let atual = 0;
        ScrollTrigger.create({
          trigger: painel, start: 'top 60%', end: 'bottom 40%',
          onUpdate: (self) => {
            const i = Math.min(versoes.length - 1, Math.floor(self.progress * versoes.length));
            if (i === atual) return;
            atual = i;
            gsap.timeline()
              .to(versao, { yPercent: -60, opacity: 0, duration: 0.15, ease: 'power2.in' })
              .add(() => { versao.textContent = versoes[i]; })
              .fromTo(versao, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: 'power3.out' });
          }
        });
      }
      revelar('.sempre__blocos > *', '.sempre__blocos', { stagger: 0.1 });
    }

    // Planos: os degraus sobem da linha de base com mola, um depois do outro; o preço conta até
    // o valor; o selo do recomendado salta; com mouse, cada degrau inclina e acende um brilho.
    linhas($('#planos-titulo'), '.planos');
    revelar('.planos__condicao', '.planos', { delay: 0.2 });
    gsap.from('.degrau', {
      y: 120, opacity: 0, rotationX: desktop ? 18 : 0, transformPerspective: 1000, transformOrigin: '50% 100%',
      duration: 1.3, ease: 'expo.out', stagger: 0.14,
      scrollTrigger: { trigger: '.degraus', start: 'top 82%', once: true }
    });
    gsap.from('.degrau__selo', { scale: 0, rotation: -12, transformOrigin: '0% 100%', duration: 0.7, ease: 'back.out(2.4)', delay: 0.9, scrollTrigger: { trigger: '.degraus', start: 'top 82%', once: true } });
    $$('[data-contar]').forEach((el) => contar(el, '.degraus'));
    $$('.degrau').forEach((degrau) => { inclinar(degrau, 4); brilhoCursor(degrau); });
    revelar('.planos__nota', '.planos__nota');

    // Equipe: os retratos sobem com leve giro, as iniciais rolam para dentro do bloco e os nomes
    // entram em seguida (o hover levanta o retrato e mostra o nó girando, no CSS).
    linhas($('#equipe-titulo'), '.equipe');
    gsap.fromTo('.pessoa', { y: 80, rotation: (i) => (i % 2 ? 3 : -3), opacity: 0 }, {
      y: 0, rotation: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.equipe__grade', start: 'top 85%', once: true }
    });
    gsap.from('.pessoa__iniciais', {
      yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.35,
      scrollTrigger: { trigger: '.equipe__grade', start: 'top 85%', once: true }
    });
    revelar('.pessoa__nome, .pessoa__funcao', '.equipe__grade', { y: 12, delay: 0.5, stagger: 0.04 });

    // No hackathon: os blocos entram; a linha do tempo se desenha até a etapa atual e o ponto
    // dourado viaja até ela e fica pulsando; o bloco "agora" se preenche de dourado.
    linhas($('#hackathon-titulo'), '.quadro');
    revelar(['.quadro__bloco--titulo', '.quadro__bloco--texto'], '.quadro', { stagger: 0.1 });
    revelar('.quadro__etapa:not(.quadro__etapa--atual)', '.quadro__etapas', { y: 40, stagger: 0.1, delay: 0.1, ease: 'expo.out' });
    gsap.fromTo('.quadro__etapas', { '--linha': 0, '--ponto': 0 }, {
      '--linha': 0.375, '--ponto': 0.375, duration: 1.6, ease: 'expo.inOut', delay: 0.3,
      scrollTrigger: { trigger: '.quadro__etapas', start: 'top 84%', once: true }
    });
    gsap.fromTo('.quadro__etapa--atual', { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', delay: 0.9, clearProps: 'clipPath',
      scrollTrigger: { trigger: '.quadro__etapas', start: 'top 84%', once: true }
    });

    // Lista de espera: o cupom chega virando em 3D, como um ingresso sendo entregue, e depois
    // inclina com o mouse (menos enquanto alguém digita); o título sobe em linhas e os campos
    // aparecem em ordem.
    gsap.from('.cupom', {
      y: 140, rotationX: 32, opacity: 0, transformPerspective: 1400, transformOrigin: '50% 100%',
      duration: 1.5, ease: 'expo.out',
      scrollTrigger: { trigger: '.lista', start: 'top 72%', once: true }
    });
    linhas($('#lista-titulo'), '.cupom', { atraso: 0.35 });
    gsap.from('.cupom__expoente', { scale: 0, rotation: -20, duration: 0.8, ease: 'back.out(2.4)', delay: 0.9, scrollTrigger: { trigger: '.cupom', start: 'top 84%', once: true } });
    revelar('.cupom__form > .campo, .cupom__enviar', '.cupom', { y: 16, delay: 0.5, stagger: 0.06 });
    inclinar($('.cupom'), 3);

    // Rodapé: a frase entra em linhas; a marca cresce em blocos e o expoente sobe por último.
    linhas($('.rodape__frase'), '.rodape__fecho');
    revelar('.rodape__fecho .botao', '.rodape__fecho', { delay: 0.3 });
    cortina('.bloco', '.rodape__marca', { stagger: 0.07, duration: 1.1, inicio: 'top 92%' });
    gsap.from('.bloco__expoente', { x: -18, y: 18, scale: 0.3, opacity: 0, duration: 1.1, ease: 'expo.out', delay: 0.9, scrollTrigger: { trigger: '.rodape__marca', start: 'top 92%', once: true } });
  }

  function iniciarLenis() {
    if (typeof window.Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    // Rolagens que não vêm do Lenis (barra lateral, foco por Tab, busca na página, automação):
    // o Lenis passa a partir da nova posição em vez de puxar a página de volta.
    window.addEventListener('scroll', () => {
      if (lenis && Math.abs(window.scrollY - lenis.animatedScroll) > 3) lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    }, { passive: true });
    gsap.ticker.add((tempo) => { if (lenis) lenis.raf(tempo * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ========================================================================
     Início
     ======================================================================== */
  function iniciar() {
    // 1. Conteúdo
    preencherHackathon();
    montarTrilhas();
    montarPlanos();
    montarCondicao();
    montarEquipe();
    montarRodape();
    montarSegmentos();

    // 2. Bibliotecas
    if (temGsap) {
      const plugins = [ScrollTrigger];
      if (typeof window.SplitText !== 'undefined') plugins.push(SplitText);
      gsap.registerPlugin(...plugins);
      gsap.config({ nullTargetWarn: false });
      ScrollTrigger.config({ ignoreMobileResize: true });
      if (comMovimento()) iniciarLenis();
    }

    // 3. Interações (na ordem da página, para os gatilhos de rolagem saírem certos)
    iniciarAncoras();
    iniciarMenu();
    iniciarImagensSvg();
    montarFundoHero();
    montarFundosNo();
    iniciarVideoHero();
    if (comMovimento()) {
      aberturaLogo(entradaHero);
      chaoDasSecoes();
      movimentoDasSecoes();
    }
    iniciarComparador();
    iniciarAbas();
    iniciarJornada();
    if (comMovimento()) movimentoDepoisDaJornada();
    iniciarVideo();
    iniciarFormulario();
    iniciarCabecalho();
    iniciarMarcaRodape();

    // Recalcula os gatilhos quando fontes e imagens terminam de carregar.
    if (temGsap) {
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
