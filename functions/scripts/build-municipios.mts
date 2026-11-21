/**
 * Gera functions/src/data/municipios.json a partir da base pública de municípios brasileiros
 * (códigos IBGE, centróides e fusos). Executar: npm run build:municipios -w functions
 */
import { writeFile } from 'node:fs/promises';

const SOURCE = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json';

interface SourceMunicipio {
  codigo_ibge: number;
  nome: string;
  latitude: number;
  longitude: number;
  codigo_uf: number;
  fuso_horario: string;
}

interface SourceEstado {
  codigo_uf: number;
  uf: string;
}

async function load<T>(file: string): Promise<T> {
  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) {
    throw new Error(`Failed to download ${file}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

const [municipios, estados] = await Promise.all([
  load<SourceMunicipio[]>('municipios.json'),
  load<SourceEstado[]>('estados.json'),
]);
const ufByCode = new Map(estados.map((estado) => [estado.codigo_uf, estado.uf]));

const output = municipios
  .map((municipio) => ({
    c: String(municipio.codigo_ibge),
    n: municipio.nome,
    u: ufByCode.get(municipio.codigo_uf) ?? '',
    la: municipio.latitude,
    lo: municipio.longitude,
    tz: municipio.fuso_horario,
  }))
  .sort((a, b) => a.c.localeCompare(b.c));

if (output.length < 5500 || output.some((m) => !/^\d{7}$/.test(m.c) || m.u.length !== 2 || !m.tz)) {
  throw new Error('Unexpected municipality data');
}

await writeFile(new URL('../src/data/municipios.json', import.meta.url), JSON.stringify(output));
process.stdout.write(`Wrote ${output.length} municipalities\n`);
