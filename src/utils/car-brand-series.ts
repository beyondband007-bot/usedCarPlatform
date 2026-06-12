import brandSeriesData from '@/car-data/brand_series_simple.json'

export interface CarBrandSeries {
  name: string
  childrenName: string[]
}

const brandSeriesList = brandSeriesData as CarBrandSeries[]

export function getCarBrandSeriesList(): CarBrandSeries[] {
  return brandSeriesList
}

export function findCarBrandByName(name: string): CarBrandSeries | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  return brandSeriesList.find((item) => item.name === trimmed)
}

export function searchCarBrands(query: string, limit = 50): CarBrandSeries[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  return brandSeriesList.filter((item) => item.name.includes(trimmed)).slice(0, limit)
}

function stripBrandPrefix(brandName: string, fullName: string): string {
  if (fullName.startsWith(brandName)) {
    return fullName.slice(brandName.length).trim()
  }
  return fullName.trim()
}

export function getCarModelDisplayNames(brand: CarBrandSeries): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const fullName of brand.childrenName) {
    const display = stripBrandPrefix(brand.name, fullName)
    if (!display || seen.has(display)) continue
    seen.add(display)
    result.push(display)
  }

  return result
}

export function searchCarModels(
  brand: CarBrandSeries,
  query: string,
  limit = 80,
): string[] {
  const models = getCarModelDisplayNames(brand)
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return models.slice(0, limit)
  return models.filter((name) => name.toLowerCase().includes(trimmed)).slice(0, limit)
}
