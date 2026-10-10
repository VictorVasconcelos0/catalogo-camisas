import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Instagram,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./styles.css";

const PUBLICOS = [
  { id: "todos", label: "Tudo", emoji: "✦" },
  { id: "masculino", label: "Masculino", emoji: "◒" },
  { id: "feminino", label: "Feminino", emoji: "◓" },
  { id: "infantil", label: "Infantil", emoji: "✿" },
  { id: "outros", label: "Outros", emoji: "＋" },
];

const basePath = import.meta.env.BASE_URL;

function asset(path) {
  return `${basePath}${path}`;
}

function App() {
  const [catalogo, setCatalogo] = useState(null);
  const [publico, setPublico] = useState("todos");
  const [time, setTime] = useState("todos");
  const [busca, setBusca] = useState("");
  const [produtoAberto, setProdutoAberto] = useState(null);
  const [favoritos, setFavoritos] = useState(() =>
    JSON.parse(localStorage.getItem("vestiario-favoritos") || "[]"),
  );

  useEffect(() => {
    fetch(asset("catalogo-manifest.json"))
      .then((response) => {
        if (!response.ok) throw new Error("Manifesto não encontrado");
        return response.json();
      })
      .then(setCatalogo)
      .catch((error) => console.error("Falha ao carregar catálogo:", error));
  }, []);

  useEffect(() => {
    localStorage.setItem("vestiario-favoritos", JSON.stringify(favoritos));
  }, [favoritos]);

  const produtos = catalogo?.produtos || [];
  const times = useMemo(() => {
    const nomes = produtos
      .filter((produto) => publico === "todos" || produto.publico === publico)
      .map((produto) => produto.time);
    return ["todos", ...new Set(nomes.sort((a, b) => a.localeCompare(b)))] ;
  }, [produtos, publico]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return produtos.filter((produto) => {
      const atendePublico = publico === "todos" || produto.publico === publico;
      const atendeTime = time === "todos" || produto.time === time;
      const atendeBusca =
        !termo ||
        `${produto.nome} ${produto.time} ${produto.publico}`
          .toLocaleLowerCase("pt-BR")
          .includes(termo);
      return atendePublico && atendeTime && atendeBusca;
    });
  }, [produtos, publico, time, busca]);

  function alternarFavorito(id) {
    setFavoritos((atual) =>
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id],
    );
  }

  function trocarPublico(novoPublico) {
    setPublico(novoPublico);
    setTime("todos");
  }

  if (!catalogo) {
    return (
      <main className="loading-screen">
        <div className="loading-mark"><Sparkles size={28} /></div>
        <p>Preparando o vestiário<span>...</span></p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ir para o início">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>VESTIÁRIO<small>CATÁLOGO ESPORTIVO</small></span>
        </a>
        <div className="topbar-actions">
          <span className="live-dot">CATÁLOGO ONLINE</span>
          <button className="icon-button" onClick={() => document.getElementById("busca").focus()} aria-label="Buscar">
            <Search size={19} />
          </button>
        </div>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span /> COLEÇÃO 2026 / 27</p>
            <h1>Vista sua<br /><em>paixão.</em></h1>
            <p className="hero-text">Encontre sua próxima camisa, organizada por time e estilo. Explore a coleção.</p>
            <a className="hero-cta" href="#catalogo">Explorar catálogo <ChevronRight size={18} /></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-glow" />
            <div className="hero-orb">EST. 2026</div>
            <span className="floating-shape shape-one" />
            <span className="floating-shape shape-two" />
            <span className="hero-number">01</span>
          </div>
        </section>

        <section id="catalogo" className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURADORIA DIGITAL</p>
              <h2>Escolha seu <strong>estilo.</strong></h2>
            </div>
            <p className="result-count">{filtrados.length} produtos encontrados</p>
          </div>

          <div className="filter-bar">
            <div className="category-tabs">
              {PUBLICOS.map((item) => (
                <button
                  className={publico === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => trocarPublico(item.id)}
                >
                  <span>{item.emoji}</span>{item.label}
                </button>
              ))}
            </div>
            <div className="filter-controls">
              <div className="search-box">
                <Search size={17} />
                <input id="busca" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar time ou modelo..." />
                {busca && <button onClick={() => setBusca("")} aria-label="Limpar busca"><X size={15} /></button>}
              </div>
              <div className="select-wrap">
                <SlidersHorizontal size={15} />
                <select value={time} onChange={(event) => setTime(event.target.value)} aria-label="Filtrar por time">
                  {times.map((item) => <option value={item} key={item}>{item === "todos" ? "Todos os times" : item}</option>)}
                </select>
              </div>
            </div>
          </div>

          {filtrados.length ? (
            <div className="product-grid">
              {filtrados.map((produto) => (
                <ProductCard
                  key={produto.id}
                  produto={produto}
                  favorito={favoritos.includes(produto.id)}
                  onOpen={() => setProdutoAberto(produto)}
                  onFavorite={() => alternarFavorito(produto.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state"><Search size={34} /><h3>Nada encontrado</h3><p>Tente outro time, modelo ou categoria.</p></div>
          )}
        </section>
      </main>

      <footer>
        <span className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>VESTIÁRIO</span></span>
        <p>Seu jogo. Seu estilo.</p>
        <a href="#inicio"><ArrowLeft size={15} /> Voltar ao topo</a>
      </footer>

      <a
        className="whatsapp-button"
        href="https://wa.me/5561984385187?text=Ol%C3%A1!%20Vi%20o%20cat%C3%A1logo%20de%20camisas%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
        target="_blank"
        rel="noreferrer"
        aria-label="Falar pelo WhatsApp"
        title="Falar pelo WhatsApp"
      >
        <WhatsAppIcon />
        <span>WhatsApp</span>
      </a>

      {produtoAberto && <Gallery produto={produtoAberto} onClose={() => setProdutoAberto(null)} />}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      className="whatsapp-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.9c0 2.1.55 4.14 1.6 5.95L.1 24l6.3-1.65a11.86 11.86 0 0 0 5.68 1.45h.01c6.55 0 11.88-5.33 11.88-11.9 0-3.18-1.23-6.17-3.45-8.42Zm-8.43 18.3h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.23-.37a9.88 9.88 0 0 1-1.52-5.25C2.2 6.43 6.63 2 12.08 2a9.88 9.88 0 0 1 7.02 2.91 9.9 9.9 0 0 1 2.9 7.04c0 5.45-4.43 9.88-9.91 9.88Zm5.42-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function ProductCard({ produto, favorito, onOpen, onFavorite }) {
  return (
    <article className="product-card" onClick={onOpen}>
      <div className="card-image">
        <img src={asset(produto.capa)} alt={`${produto.time} — ${produto.nome}`} loading="lazy" />
        <span className="photo-count"><ImageIcon size={13} /> {produto.fotos.length}</span>
        <button className={`favorite-button ${favorito ? "is-favorite" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
          <Heart size={17} fill={favorito ? "currentColor" : "none"} />
        </button>
        <span className="view-label">VER GALERIA <ChevronRight size={14} /></span>
      </div>
      <div className="card-info">
        <span className="card-team">{produto.time}</span>
        <h3>{produto.nome}</h3>
        <span className="card-category">{produto.publico}</span>
      </div>
    </article>
  );
}

function Gallery({ produto, onClose }) {
  const [indice, setIndice] = useState(0);
  const fotoAnterior = () => setIndice((atual) => (atual - 1 + produto.fotos.length) % produto.fotos.length);
  const proximaFoto = () => setIndice((atual) => (atual + 1) % produto.fotos.length);

  useEffect(() => {
    const pressionar = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") fotoAnterior();
      if (event.key === "ArrowRight") proximaFoto();
    };
    window.addEventListener("keydown", pressionar);
    return () => window.removeEventListener("keydown", pressionar);
  });

  return (
    <div className="gallery-overlay" onClick={onClose}>
      <div className="gallery-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-gallery" onClick={onClose} aria-label="Fechar galeria"><X /></button>
        <div className="gallery-main">
          <button className="gallery-arrow left" onClick={fotoAnterior} aria-label="Foto anterior"><ChevronLeft /></button>
          <img src={asset(produto.fotos[indice])} alt={`${produto.time} ${indice + 1}`} />
          <button className="gallery-arrow right" onClick={proximaFoto} aria-label="Próxima foto"><ChevronRight /></button>
        </div>
        <div className="gallery-meta"><div><span>{produto.time}</span><h2>{produto.nome}</h2></div><strong>{String(indice + 1).padStart(2, "0")} / {String(produto.fotos.length).padStart(2, "0")}</strong></div>
        <div className="gallery-thumbs">{produto.fotos.map((foto, i) => <button className={i === indice ? "active" : ""} onClick={() => setIndice(i)} key={foto}><img src={asset(foto)} alt="" /></button>)}</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
