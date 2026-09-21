import { ApiError } from '../utils/apiError';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export interface WeatherQuery {
  latitude: number;
  longitude: number;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
  };
}

const weatherDescription = (code: number): string => {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return descriptions[code] ?? 'Unknown weather condition';
};

export const weatherService = {
  async getForecast({ latitude, longitude }: WeatherQuery) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new ApiError(400, 'latitude must be a number between -90 and 90');
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new ApiError(400, 'longitude must be a number between -180 and 180');
    }

    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code',
      forecast_days: '1',
      timezone: 'auto',
    });

    let response: Response;
    try {
      response = await fetch(`${OPEN_METEO_FORECAST_URL}?${query.toString()}`);
    } catch {
      throw new ApiError(503, 'Weather service is unavailable');
    }

    if (!response.ok) {
      throw new ApiError(502, 'Weather service returned an error');
    }

    const weather = (await response.json()) as OpenMeteoResponse;
    if (!weather.current || !weather.hourly) {
      throw new ApiError(502, 'Weather service returned an incomplete forecast');
    }

    return {
      location: {
        latitude: weather.latitude,
        longitude: weather.longitude,
        timezone: weather.timezone,
      },
      current: {
        observedAt: weather.current.time,
        temperatureCelsius: weather.current.temperature_2m,
        feelsLikeCelsius: weather.current.apparent_temperature,
        humidityPercent: weather.current.relative_humidity_2m,
        precipitationMm: weather.current.precipitation,
        windSpeedKmh: weather.current.wind_speed_10m,
        weatherCode: weather.current.weather_code,
        description: weatherDescription(weather.current.weather_code),
      },
      hourly: weather.hourly.time.map((time, index) => ({
        time,
        temperatureCelsius: weather.hourly!.temperature_2m[index],
        precipitationProbabilityPercent: weather.hourly!.precipitation_probability[index],
        precipitationMm: weather.hourly!.precipitation[index],
        weatherCode: weather.hourly!.weather_code[index],
        description: weatherDescription(weather.hourly!.weather_code[index]),
      })),
    };
  },
};
