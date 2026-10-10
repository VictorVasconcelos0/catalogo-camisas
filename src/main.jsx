import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Instagram,
  MessageCircle,
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
        <MessageCircle size={23} />
        <span>WhatsApp</span>
      </a>

      {produtoAberto && <Gallery produto={produtoAberto} onClose={() => setProdutoAberto(null)} />}
    </div>
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
