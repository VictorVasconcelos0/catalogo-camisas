import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const origem = resolve("catalogo_organizado");
const destino = resolve("dist/catalogo_organizado");

await mkdir(destino, { recursive: true });
await cp(origem, destino, { recursive: true });
console.log("Imagens do catálogo copiadas para dist/catalogo_organizado");
