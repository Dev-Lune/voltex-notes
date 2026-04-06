import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://voltex.devlune.in'
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}
