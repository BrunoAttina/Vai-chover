import { mapForecast, sumPrecipitation } from '../../src/weather/weather-mapping';
import type { HourlyWeather } from '../../src/weather/open-meteo-client';

const DATE = '2026-11-21';

function hourly(
  probability: (hour: number) => number | null,
  precipitation: (hour: number) => number | null,
): HourlyWeather {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  return {
    time: hours.map((hour) => `${DATE}T${String(hour).padStart(2, '0')}:00`),
    precipitationProbability: hours.map(probability),
    precipitation: hours.map(precipitation),
  };
}

describe('mapForecast', () => {
  it('uses the maximum hourly probability of each period', () => {
    const data = hourly(
      (hour) => (hour === 14 ? 80 : 10),
      () => 0,
    );
    expect(mapForecast(data, DATE, ['manha', 'tarde'])).toEqual({
      manha: { probability: 10, willRain: false },
      tarde: { probability: 80, willRain: true },
    });
  });

  it('marks rain from 50%', () => {
    const data = hourly(
      (hour) => (hour < 6 ? 49 : 50),
      () => 0,
    );
    expect(mapForecast(data, DATE, ['madrugada', 'noite'])).toEqual({
      madrugada: { probability: 49, willRain: false },
      noite: { probability: 50, willRain: true },
    });
  });

  it('omits periods with missing or null hours', () => {
    const data = hourly(
      (hour) => (hour === 20 ? null : 30),
      () => 0,
    );
    expect(mapForecast(data, DATE, ['noite', 'tarde'])).toEqual({
      tarde: { probability: 30, willRain: false },
    });
    expect(mapForecast(data, '2026-11-22', ['manha'])).toEqual({});
  });
});

describe('sumPrecipitation', () => {
  it('sums the precipitation of the period hours', () => {
    const data = hourly(
      () => 0,
      (hour) => (hour >= 12 && hour < 15 ? 0.1 : 0),
    );
    expect(sumPrecipitation(data, DATE, 'tarde')).toBeCloseTo(0.3);
    expect(sumPrecipitation(data, DATE, 'manha')).toBe(0);
  });

  it('returns null when an hour is missing', () => {
    const data = hourly(
      () => 0,
      (hour) => (hour === 7 ? null : 0),
    );
    expect(sumPrecipitation(data, DATE, 'manha')).toBeNull();
  });
});
