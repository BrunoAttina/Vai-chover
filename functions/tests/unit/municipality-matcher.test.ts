import {
  findMunicipality,
  findByCode,
  listByState,
  normalizeName,
  toUf,
  isInsideBrazil,
  type Municipality,
} from '../../src/regions/municipality-matcher';

const list: Municipality[] = [
  {
    ibgeCode: '3550308',
    name: 'São Paulo',
    state: 'SP',
    lat: -23.5329,
    lon: -46.6395,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '3509502',
    name: 'Campinas',
    state: 'SP',
    lat: -22.9053,
    lon: -47.0659,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '3545803',
    name: "Santa Bárbara d'Oeste",
    state: 'SP',
    lat: -22.7553,
    lon: -47.4143,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '2507507',
    name: 'João Pessoa',
    state: 'PB',
    lat: -7.11509,
    lon: -34.8641,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '4205407',
    name: 'Florianópolis',
    state: 'SC',
    lat: -27.5945,
    lon: -48.5477,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '2933307',
    name: 'Bom Jesus da Lapa',
    state: 'BA',
    lat: -13.2506,
    lon: -43.4108,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '2204303',
    name: 'Bom Jesus',
    state: 'PI',
    lat: -9.07124,
    lon: -44.359,
    timezone: 'America/Sao_Paulo',
  },
  {
    ibgeCode: '4302501',
    name: 'Bom Jesus',
    state: 'RS',
    lat: -28.6697,
    lon: -50.4295,
    timezone: 'America/Sao_Paulo',
  },
];

describe('normalizeName', () => {
  it('ignores accents, case, punctuation and extra spaces', () => {
    expect(normalizeName("  Santa Barbara D'OESTE ")).toBe(normalizeName("Santa Bárbara d'Oeste"));
    expect(normalizeName('Embu-Guaçu')).toBe('embu guacu');
  });
});

describe('toUf', () => {
  it.each([
    ['SP', 'SP'],
    ['sp', 'SP'],
    ['São Paulo', 'SP'],
    ['Rio Grande do Sul', 'RS'],
    ['State of Paraíba', 'PB'],
    ['Narnia', null],
    [undefined, null],
  ])('%p → %p', (input, expected) => {
    expect(toUf(input)).toBe(expected);
  });
});

describe('isInsideBrazil', () => {
  it('checks the bounding box', () => {
    expect(isInsideBrazil(-23.55, -46.63)).toBe(true);
    expect(isInsideBrazil(40.71, -74.0)).toBe(false);
  });
});

describe('findMunicipality', () => {
  it('matches by city name and UF', () => {
    expect(
      findMunicipality(list, {
        latitude: -23.55,
        longitude: -46.63,
        city: 'Sao Paulo',
        state: 'SP',
      })?.ibgeCode,
    ).toBe('3550308');
  });

  it('disambiguates homonyms by UF', () => {
    expect(
      findMunicipality(list, {
        latitude: -28.6,
        longitude: -50.4,
        city: 'Bom Jesus',
        state: 'Rio Grande do Sul',
      })?.ibgeCode,
    ).toBe('4302501');
  });

  it('disambiguates homonyms by distance when UF is unknown', () => {
    expect(
      findMunicipality(list, { latitude: -9.1, longitude: -44.3, city: 'Bom Jesus' })?.ibgeCode,
    ).toBe('2204303');
  });

  it('falls back to the nearest centroid when the name is unknown', () => {
    expect(
      findMunicipality(list, { latitude: -22.91, longitude: -47.07, city: 'Barão Geraldo' })
        ?.ibgeCode,
    ).toBe('3509502');
  });

  it('returns null when nothing is close enough', () => {
    expect(findMunicipality(list, { latitude: -15.79, longitude: -47.88 })).toBeNull();
  });
});

describe('findByCode and listByState', () => {
  it('finds by IBGE code', () => {
    expect(findByCode(list, '2507507')?.name).toBe('João Pessoa');
    expect(findByCode(list, '0000000')).toBeNull();
  });

  it('lists a state sorted by name in pt-BR', () => {
    expect(listByState(list, 'SP').map((m) => m.name)).toEqual([
      'Campinas',
      "Santa Bárbara d'Oeste",
      'São Paulo',
    ]);
  });
});
