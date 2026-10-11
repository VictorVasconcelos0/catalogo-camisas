"""Gera o manifesto usado pela vitrine React."""

import json
import re
import unicodedata
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[1]
ORIGEM = RAIZ / "catalogo_organizado"
DESTINO = RAIZ / "public" / "catalogo-manifest.json"
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp"}
TERMOS_EXCLUIDOS = (
    "shorts",
    "pants",
    "socks",
    "size chart",
    "measurement",
    "price list",
    "factory",
    "banner",
    "packaging",
    "sizes",
    "size",
    "notice",
    "clearance",
    "sale",
    "stock",
    "training",
    "windbreaker",
    "top",
    "promotion",
    "promo",
)
MIN_DIMENSAO_PRODUTO = 300
PROPORCAO_MINIMA = 0.70
PROPORCAO_MAXIMA = 1.15

# A ordem é deliberada: clubes brasileiros, seleções e demais clubes.
CLUBES_BRASILEIROS = (
    "Flamengo", "Corinthians", "Palmeiras", "São Paulo", "Vasco da Gama",
    "Grêmio", "Santos", "Cruzeiro", "Atlético Mineiro", "Internacional",
    "Fluminense", "Botafogo", "Bahia", "Athletico Paranaense", "Sport Recife",
    "Fortaleza", "Ceará Sporting", "Coritiba", "Vitória", "Bragantino",
    "Cuiabá", "Goiás", "Chapecoense", "Náutico", "Santa Cruz", "Remo",
    "Paysandu", "América",
)
SELECOES = (
    "Brasil", "Argentina", "França", "Portugal", "Espanha", "Inglaterra",
    "Alemanha", "Itália", "Holanda", "Uruguai", "Chile", "Colômbia",
    "México", "Japão", "Nigéria", "Estados Unidos",
)
ALIASES_TIMES = {
    "brazil": "Brasil",
    "spain": "Espanha",
}
OUTROS_TIMES_POPULARES = (
    "Real Madrid", "Barcelona", "Manchester City", "PSG", "Bayern Munich",
    "Liverpool", "Manchester United", "Chelsea", "Arsenal", "Juventus",
    "Inter Milan", "AC Milan", "Borussia Dortmund", "Tottenham", "Atlético Madrid",
    "Boca Juniors", "River Plate", "Benfica", "FC Porto", "Ajax",
    "Napoli", "Roma", "Inter Miami CF", "Celtic", "Feyenoord",
    "PSV Eindhoven", "Monterrey", "Chivas de Guadalajara", "Colo Colo",
)


def normalizar_texto(texto: str) -> str:
    sem_acentos = unicodedata.normalize("NFKD", texto)
    return "".join(caractere for caractere in sem_acentos if not unicodedata.combining(caractere)).casefold()


def mapa_de_prioridade(nomes: tuple[str, ...]) -> dict[str, int]:
    return {normalizar_texto(nome): indice for indice, nome in enumerate(nomes)}


PRIORIDADE_BRASILEIROS = mapa_de_prioridade(CLUBES_BRASILEIROS)
PRIORIDADE_SELECOES = mapa_de_prioridade(SELECOES)
PRIORIDADE_OUTROS = mapa_de_prioridade(OUTROS_TIMES_POPULARES)


def chave_de_ordenacao(produto: dict[str, object]) -> tuple[int, int, str, int, str]:
    time = str(produto["time"])
    time_normalizado = normalizar_texto(time)
    if time_normalizado in PRIORIDADE_BRASILEIROS:
        grupo, prioridade = 0, PRIORIDADE_BRASILEIROS[time_normalizado]
    elif time_normalizado in PRIORIDADE_SELECOES:
        grupo, prioridade = 1, PRIORIDADE_SELECOES[time_normalizado]
    else:
        grupo = 2
        prioridade = PRIORIDADE_OUTROS.get(time_normalizado, len(PRIORIDADE_OUTROS))

    publico_prioridade = {"masculino": 0}.get(str(produto["publico"]), 1)
    return grupo, prioridade, time_normalizado, publico_prioridade, normalizar_texto(str(produto["nome"]))


def nome_de_time_preferido(atual: str, candidato: str) -> str:
    """Escolhe a grafia mais legível quando o mesmo time tem pastas variantes."""
    atual_ruim = atual.count("\ufffd") + atual.count("?")
    candidato_ruim = candidato.count("\ufffd") + candidato.count("?")
    if candidato_ruim != atual_ruim:
        return candidato if candidato_ruim < atual_ruim else atual
    return candidato if len(candidato) < len(atual) else atual


def nome_de_time_canonico(nome: str) -> str:
    """Unifica grafias em inglês para o nome exibido no catálogo."""
    return ALIASES_TIMES.get(normalizar_texto(nome), nome)


def rotulo_produto(nome: str) -> str:
    """Converte o nome técnico do arquivo em um título legível."""
    nome = re.sub(r"__foto_\d+\.(?:jpg|jpeg|png|webp)$", "", nome, flags=re.I)
    return nome.replace("_", " ").strip()


def produto_eh_camisa(nome: str) -> bool:
    """Remove peças e materiais auxiliares que não são camisas."""
    nome_normalizado = re.sub(r"[_\-]+", " ", nome).casefold()
    return not any(
        re.search(rf"\b{re.escape(termo)}\b", nome_normalizado)
        for termo in TERMOS_EXCLUIDOS
    )


def dimensoes_imagem(caminho: Path) -> tuple[int, int] | None:
    """Lê dimensões básicas sem depender de Pillow no build do GitHub."""
    dados = caminho.read_bytes()

    if dados.startswith(b"\x89PNG\r\n\x1a\n") and len(dados) >= 24:
        return int.from_bytes(dados[16:20], "big"), int.from_bytes(dados[20:24], "big")

    if dados.startswith(b"RIFF") and dados[8:12] == b"WEBP":
        if dados[12:16] == b"VP8X" and len(dados) >= 30:
            largura = 1 + int.from_bytes(dados[24:27], "little")
            altura = 1 + int.from_bytes(dados[27:30], "little")
            return largura, altura

    if not dados.startswith(b"\xff\xd8"):
        return None

    indice = 2
    while indice + 9 < len(dados):
        if dados[indice] != 0xFF:
            indice += 1
            continue

        marcador = dados[indice + 1]
        indice += 2

        if marcador in {0xD8, 0xD9}:
            continue

        if indice + 2 > len(dados):
            return None

        tamanho = int.from_bytes(dados[indice:indice + 2], "big")
        if marcador in range(0xC0, 0xC4):
            if indice + 7 > len(dados):
                return None
            altura = int.from_bytes(dados[indice + 3:indice + 5], "big")
            largura = int.from_bytes(dados[indice + 5:indice + 7], "big")
            return largura, altura

        indice += tamanho

    return None


def imagem_eh_produto(caminho: Path) -> bool:
    """Aceita apenas imagens com proporção compatível com foto de produto."""
    try:
        dimensoes = dimensoes_imagem(caminho)
    except OSError:
        return False

    if dimensoes is None:
        return False

    largura, altura = dimensoes
    if min(largura, altura) < MIN_DIMENSAO_PRODUTO:
        return False

    proporcao = largura / altura
    return PROPORCAO_MINIMA <= proporcao <= PROPORCAO_MAXIMA


def gerar() -> None:
    produtos = []

    for publico in sorted(ORIGEM.iterdir(), key=lambda item: item.name.casefold()):
        if not publico.is_dir():
            continue

        # Os álbuns femininos e infantis fazem parte do catálogo geral do time.
        # Mantemos os caminhos físicos originais para não apagar nem mover fotos.
        publico_manifesto = (
            "masculino" if publico.name.casefold() in {"feminino", "infantil"}
            else publico.name
        )

        for time in sorted(publico.iterdir(), key=lambda item: item.name.casefold()):
            if not time.is_dir():
                continue
            time_canonico = nome_de_time_canonico(time.name)

            fotos = [
                arquivo
                for arquivo in sorted(time.iterdir(), key=lambda item: item.name.casefold())
                if (
                    arquivo.is_file()
                    and arquivo.suffix.casefold() in EXTENSOES
                    and imagem_eh_produto(arquivo)
                )
            ]

            arquivos_validos = []
            for foto in fotos:
                produto = foto.name.split("__foto_")[0]
                if produto_eh_camisa(produto):
                    arquivos_validos.append(foto)

            if arquivos_validos:
                caminho_base = f"catalogo_organizado/{publico.name}/{time.name}"
                fotos_manifesto = [
                    f"{caminho_base}/{arquivo.name}" for arquivo in arquivos_validos
                ]
                produtos.append(
                    {
                        "id": f"{publico_manifesto}/{time_canonico}",
                        "publico": publico_manifesto,
                        "time": time_canonico,
                        "nome": time_canonico,
                        "capa": fotos_manifesto[0],
                        "fotos": fotos_manifesto,
                    }
                )

    consolidados = {}
    for produto in produtos:
        chave = (str(produto["publico"]), normalizar_texto(str(produto["time"])))
        existente = consolidados.get(chave)
        if existente is None:
            consolidados[chave] = produto
            continue

        existente["time"] = nome_de_time_preferido(
            str(existente["time"]), str(produto["time"])
        )
        existente["nome"] = existente["time"]
        existente["fotos"].extend(produto["fotos"])
        existente["capa"] = existente["fotos"][0]
        existente["id"] = f"{existente['publico']}/{existente['time']}"

    produtos = list(consolidados.values())
    for produto in produtos:
        produto["fotos"] = sorted(produto["fotos"], key=normalizar_texto)
        produto["capa"] = produto["fotos"][0]
    produtos.sort(key=chave_de_ordenacao)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(
        json.dumps(
            {"geradoEm": "2026-10-09", "produtos": produtos},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Manifesto criado: {DESTINO} ({len(produtos)} produtos)")


if __name__ == "__main__":
    gerar()
