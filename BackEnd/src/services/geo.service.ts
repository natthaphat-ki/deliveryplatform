import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const LONGDO_SEARCH_URL = 'https://search.longdo.com/mapsearch/json/search';
const LONGDO_ADDRESS_URL = 'https://api.longdo.com/map/services/address';

interface LongdoSearchResponse {
  data?: Array<{ name: string; address?: string; lat: number; lon: number }>;
}

interface LongdoAddressResponse {
  road?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postcode?: string;
}

function requireApiKey(): string {
  if (!env.externalApis.longdoMapApiKey) {
    throw new ApiError(503, 'Map service is not configured');
  }
  return env.externalApis.longdoMapApiKey;
}

async function longdoGet<T>(url: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, key: requireApiKey() });
  let response: Response;
  try {
    response = await fetch(`${url}?${query.toString()}`);
  } catch {
    throw new ApiError(503, 'Map service is unavailable');
  }
  if (!response.ok) {
    throw new ApiError(502, 'Map service returned an error');
  }
  return (await response.json()) as T;
}

function assertCoordinates(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiError(400, 'lat must be a number between -90 and 90');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiError(400, 'lng must be a number between -180 and 180');
  }
}

export const geoService = {
  /** Address/place search -> coordinates (Longdo Map). */
  async search(keyword: string) {
    const q = keyword.trim();
    if (q.length < 2) {
      throw new ApiError(400, 'q must be at least 2 characters');
    }
    const result = await longdoGet<LongdoSearchResponse>(LONGDO_SEARCH_URL, { keyword: q, limit: '8' });
    return (result.data ?? []).map((place) => ({
      name: place.name,
      address: place.address ?? '',
      lat: place.lat,
      lng: place.lon,
    }));
  },

  /** Coordinates -> human readable address line (Longdo Map). */
  async reverse(lat: number, lng: number) {
    assertCoordinates(lat, lng);
    const result = await longdoGet<LongdoAddressResponse>(LONGDO_ADDRESS_URL, {
      lat: String(lat),
      lon: String(lng),
      noelevation: '1',
    });
    const address = [result.road, result.subdistrict, result.district, result.province, result.postcode]
      .filter(Boolean)
      .join(' ');
    return { address };
  },
};
