// Open-Meteo client (geocoding + hourly forecast). No API key required, CORS enabled.

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_TIMEOUT_MS = 10000;
const GEOCODING_CANDIDATES = 10;
// The geocoder only matches names in the requested language ("Milano" is found only in Italian)
const GEOCODING_LANGUAGES = ['en', 'it'];

class WeatherError extends Error {}

async function getJson(url, params) {
  let response;
  try {
    response = await fetch(`${url}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
  } catch {
    throw new WeatherError('Cannot reach the weather service. Check your internet connection.');
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body: handled below
  }
  if (!response.ok) throw new WeatherError(`Weather service error: ${data?.reason || response.statusText || response.status}`);
  if (!data) throw new WeatherError('Invalid response from the weather service.');
  return data;
}

async function geocodeCity(city) {
  const responses = await Promise.all(GEOCODING_LANGUAGES.map((language) => getJson(GEOCODING_URL, {
    name: city, count: GEOCODING_CANDIDATES, language, format: 'json',
  })));
  const results = responses.flatMap((data) => data.results || []);
  if (!results.length) throw new WeatherError(`City "${city}" not found`);
  // Ambiguous names (e.g. "Milano" also exists in Texas): prefer the most populated match
  const r = results.reduce((best, item) => ((item.population || 0) > (best.population || 0) ? item : best));
  return {
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

// Hourly 2 m temperatures for one day; times are "YYYY-MM-DDTHH:MM" in the location's local time.
async function fetchHourlyTemperatures(latitude, longitude, isoDate) {
  const data = await getJson(FORECAST_URL, {
    latitude, longitude, hourly: 'temperature_2m', timezone: 'auto', start_date: isoDate, end_date: isoDate,
  });
  const hourly = data.hourly || {};
  return { times: hourly.time || [], temps: hourly.temperature_2m || [] };
}
