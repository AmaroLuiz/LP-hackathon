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
      <li class="degrau" style="--tom: ${t.tom}; --tom-escuro: ${t.escuro}; --tinta-degrau: ${t.tinta}">
        <div class="degrau__corpo">
          <h3 class="degrau__nome">${escapar(p.nome)}</h3>
          <p class="degrau__preco">${reais(p.preco)}<small>/mês</small></p>
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
        <div class="pessoa__retrato" style="--tom: ${t.tom}; --tinta-retrato: ${t.tinta}">${retrato}</div>
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
    const fundo = $('[data-hero-fundo]');
    const no = $('.abertura__no');
    if (!fundo || !no) return;
    const copia = no.cloneNode(true);
    copia.setAttribute('class', 'hero__no');
    copia.removeAttribute('stroke-width');
    $$('path', copia).forEach((p) => p.removeAttribute('style'));
    fundo.appendChild(copia);
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

  // Vídeo da etapa "Criar": toca só quando visível e com a etapa aberta.
  function iniciarVideo() {
    const video = $('[data-video]');
    if (!video) return;
    if (calmo.matches) return; // fica o pôster
    let naTela = false;
    const atualizar = () => {
      const aberta = video.closest('.etapa')?.classList.contains('is-aberta');
      if (naTela && aberta) {
        if (video.preload === 'none') video.preload = 'auto';
        const promessa = video.play();
        if (promessa) promessa.catch(() => {});
      } else video.pause();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { naTela = en.isIntersecting && en.intersectionRatio > 0.2; atualizar(); }, { threshold: [0, 0.2, 0.6] }).observe(video);
    }
    document.addEventListener('etapa-mudou', atualizar);
  }

  // Acordeão da jornada. No computador (com movimento), as etapas abrem com a
  // rolagem enquanto a fileira fica fixa; no celular, abrem ao entrar na tela.
  function iniciarJornada() {
    const lista = $('[data-etapas]');
    if (!lista) return;
    const etapas = $$('.etapa', lista);
    const n = etapas.length;
    const desktop = window.matchMedia('(min-width: 56.25em)');
    let fixa = null; // ScrollTrigger com a fileira fixa (pin)

    const abrirSo = (i) => {
      etapas.forEach((etapa, j) => {
        const aberta = i === j;
        etapa.classList.toggle('is-aberta', aberta);
        $('.etapa__botao', etapa).setAttribute('aria-expanded', String(aberta));
      });
      document.dispatchEvent(new Event('etapa-mudou'));
    };
    const alternar = (i) => {
      const etapa = etapas[i];
      const aberta = !etapa.classList.contains('is-aberta');
      etapa.classList.toggle('is-aberta', aberta);
      $('.etapa__botao', etapa).setAttribute('aria-expanded', String(aberta));
      document.dispatchEvent(new Event('etapa-mudou'));
    };

    etapas.forEach((etapa, i) => {
      $('.etapa__botao', etapa).addEventListener('click', () => {
        if (desktop.matches) {
          if (fixa) { // leva a rolagem até o trecho da etapa; a abertura acompanha
            const alvo = fixa.start + (fixa.end - fixa.start) * ((i + 0.5) / n);
            rolarPara(alvo, { duration: 1.1 });
          } else abrirSo(i);
        } else alternar(i);
      });
    });

    let gatilhosCelular = [];

    // Celular: cada etapa abre ao entrar na tela. Sem movimento (ou sem GSAP): tudo aberto.
    const prepararCelular = () => {
      if (!comMovimento()) { etapas.forEach((etapa, i) => { if (!etapa.classList.contains('is-aberta')) alternar(i); }); return; }
      gatilhosCelular = etapas.map((etapa, i) => ScrollTrigger.create({
        trigger: etapa, start: 'top 74%', once: true,
        onEnter: () => { if (!etapa.classList.contains('is-aberta')) alternar(i); }
      }));
    };

    // Computador: a fileira fica fixa enquanto as etapas abrem com a rolagem.
    const prepararDesktop = () => {
      abrirSo(0);
      if (!comMovimento()) return;
      fixa = ScrollTrigger.create({
        trigger: lista,
        start: 'top 12%',
        end: () => `+=${Math.round(window.innerHeight * 2.1)}`,
        pin: true,
        anticipatePin: 1,
        refreshPriority: 1, // calcula antes dos gatilhos que vêm abaixo dela
        onUpdate: (self) => {
          const i = Math.min(n - 1, Math.floor(self.progress * n * 0.9999));
          if (!etapas[i].classList.contains('is-aberta')) abrirSo(i);
        }
      });
    };

    if (desktop.matches) prepararDesktop(); else prepararCelular();

    // Ao girar um tablet ou redimensionar a janela entre os dois arranjos.
    desktop.addEventListener('change', () => {
      if (fixa) { fixa.kill(true); fixa = null; }
      gatilhosCelular.forEach((g) => g.kill());
      gatilhosCelular = [];
      if (desktop.matches) prepararDesktop(); else prepararCelular();
      if (temGsap) ScrollTrigger.refresh();
    });
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
    if (!comMovimento()) { exibir(); return; }
    const [base, expoente] = $$('.cupom__sucesso-simbolo span', sucesso);
    gsap.timeline()
      .to(form, { xPercent: 7, yPercent: 2, rotation: 2.5, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .add(exibir)
      .from($$(':scope > *', sucesso), { y: 18, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 })
      .from(base, { scale: 0.6, duration: 0.6, ease: 'expo.out', transformOrigin: '0% 100%' }, '<')
      .from(expoente, { x: -22, y: 22, scale: 0.4, duration: 0.9, ease: 'expo.out' }, '<0.2');
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

    // O problema: a frase entra palavra a palavra; as miniaturas saltam; o feed passa de lado.
    const declaracao = $('[data-declaracao]');
    if (declaracao) {
      if (typeof window.SplitText !== 'undefined') {
        const palavras = SplitText.create(declaracao, { type: 'words', wordsClass: 'palavra' });
        gsap.from(palavras.words, { opacity: 0, y: 14, duration: 0.7, ease: 'power3.out', stagger: 0.028, scrollTrigger: { trigger: declaracao, start: 'top 80%', once: true } });
      } else revelar(declaracao);
      gsap.from('.miniatura', { scale: 0.6, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.14, delay: 0.45, scrollTrigger: { trigger: declaracao, start: 'top 80%', once: true } });
    }
    const trilho = $('[data-feed-trilho]');
    if (trilho) {
      revelar('.feed__post', '.feed', { y: 48, duration: 1, stagger: 0.09, inicio: 'top 88%' });
      gsap.fromTo(trilho, { x: 60 }, {
        x: () => -(Math.max(0, trilho.scrollWidth - window.innerWidth) + 60),
        ease: 'none',
        scrollTrigger: { trigger: '.feed', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true }
      });
      revelar('.problema__nota', '.problema__nota');
    }

    // A prova: a placa abre como cortina; o texto entra em ordem.
    cortina('.prova__placa .comparador', '.prova');
    revelar('.abas', '.prova', { delay: 0.2 });
    linhas($('.prova__titulo'), '.prova', { atraso: 0.25 });
    revelar(['.prova__meio p', '.prova__acoes .celula'], '.prova', { delay: 0.45 });

    // Como funciona: título em linhas; os painéis sobem um a um.
    linhas($('#jornada-titulo'), '.jornada');
    revelar('.jornada__texto', '.jornada', { delay: 0.15 });
    revelar('.etapa', '.etapas', { y: desktop ? 70 : 30, stagger: 0.07, duration: 1, inicio: 'top 86%' });
  }

  function movimentoDepoisDaJornada() {
    // As trilhas: cabeçalho, depois cada prato com a foto em cortina e o expoente que sobe.
    linhas($('#trilhas-titulo'), '.trilhas');
    revelar('.trilhas__conta', '.trilhas', { delay: 0.2 });
    $$('.prato').forEach((prato) => {
      cortina($('.prato__foto img', prato), prato, { duration: 0.9, inicio: 'top 88%' });
      gsap.from($('.prato__expoente', prato), { x: -10, y: 10, scale: 0.4, opacity: 0, duration: 0.9, ease: 'expo.out', delay: 0.35, scrollTrigger: { trigger: prato, start: 'top 88%', once: true } });
      revelar($$('.prato__texto > *', prato), prato, { y: 18, delay: 0.1, inicio: 'top 88%' });
    });

    // Ferramentas: cada nome sobe da sua máscara; o papel aparece logo depois.
    $$('.cartaz__linha').forEach((linha) => {
      linhas($('.cartaz__nome', linha), linha, { inicio: 'top 90%' });
      const papel = $('.cartaz__papel', linha);
      if (papel) revelar(papel, linha, { delay: 0.25, inicio: 'top 90%' });
    });
    revelar('.ferramentas__nota', '.ferramentas__nota');

    // Sempre atualizada: o painel se abre até as bordas; as palavras do título se acendem com a rolagem.
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
      cortina('.sempre__foto .recorte-expoente', '.sempre__foto', { inicio: 'top 92%' });
      gsap.fromTo('.sempre__foto img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.sempre__foto', start: 'top bottom', end: 'bottom top', scrub: true } });
      revelar('.sempre__blocos > *', '.sempre__blocos', { stagger: 0.1 });
    }

    // Planos: os degraus crescem da linha de base, um depois do outro.
    linhas($('#planos-titulo'), '.planos');
    revelar('.planos__condicao', '.planos', { delay: 0.2 });
    cortina('.degrau', '.degraus', { stagger: 0.14, duration: 1.2 });
    revelar('.planos__nota', '.planos__nota');

    // Equipe: retratos abrem em cortina; nomes entram em seguida.
    linhas($('#equipe-titulo'), '.equipe');
    cortina('.pessoa__retrato', '.equipe__grade', { stagger: 0.07 });
    revelar('.pessoa__nome, .pessoa__funcao', '.equipe__grade', { y: 12, delay: 0.3, stagger: 0.04 });

    // No hackathon: os blocos entram; o bloco dourado (agora) se preenche por último.
    linhas($('#hackathon-titulo'), '.quadro');
    revelar(['.quadro__bloco--titulo', '.quadro__bloco--texto'], '.quadro', { stagger: 0.1 });
    revelar('.quadro__etapa:not(.quadro__etapa--atual)', '.quadro__etapas', { stagger: 0.1, delay: 0.1 });
    gsap.fromTo('.quadro__etapa--atual', { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut', delay: 0.45, clearProps: 'clipPath',
      scrollTrigger: { trigger: '.quadro__etapas', start: 'top 84%', once: true }
    });

    // Lista de espera: o cupom sobe; o expoente do canhoto se eleva.
    revelar('.cupom', '.lista', { y: 50, duration: 1.1 });
    linhas($('#lista-titulo'), '.cupom', { atraso: 0.2 });
    gsap.from('.cupom__expoente', { x: -14, y: 14, scale: 0.4, opacity: 0, duration: 1, ease: 'expo.out', delay: 0.6, scrollTrigger: { trigger: '.cupom', start: 'top 84%', once: true } });
    revelar('.cupom__form > .campo, .cupom__enviar', '.cupom', { y: 16, delay: 0.3, stagger: 0.06 });

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
