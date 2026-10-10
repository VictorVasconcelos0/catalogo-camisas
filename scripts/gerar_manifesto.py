"""Gera o manifesto usado pela vitrine React."""

import json
import re
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

        for time in sorted(publico.iterdir(), key=lambda item: item.name.casefold()):
            if not time.is_dir():
                continue

            fotos = [
                arquivo
                for arquivo in sorted(time.iterdir(), key=lambda item: item.name.casefold())
                if (
                    arquivo.is_file()
                    and arquivo.suffix.casefold() in EXTENSOES
                    and imagem_eh_produto(arquivo)
                )
            ]

            grupos = {}
            for foto in fotos:
                produto = foto.name.split("__foto_")[0]
                grupos.setdefault(produto, []).append(foto)

            for produto, arquivos in sorted(grupos.items()):
                if not produto_eh_camisa(produto):
                    continue

                produtos.append(
                    {
                        "id": f"{publico.name}/{time.name}/{produto}",
                        "publico": publico.name,
                        "time": time.name,
                        "nome": rotulo_produto(arquivos[0].name),
                        "capa": f"catalogo_organizado/{publico.name}/{time.name}/{arquivos[0].name}",
                        "fotos": [
                            f"catalogo_organizado/{publico.name}/{time.name}/{arquivo.name}"
                            for arquivo in arquivos
                        ],
                    }
                )

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
