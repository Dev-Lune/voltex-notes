/**
 * Marketplace Themes API
 * 
 * GET /api/marketplace/themes - List all themes
 * GET /api/marketplace/themes?q=search - Search themes
 */

import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_THEMES } from "@/lib/marketplace/data";
import type { MarketplaceAPIResponse, MarketplaceSearchResult, ThemeManifest } from "@/lib/marketplace/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const colorScheme = searchParams.get("colorScheme");
    const sort = searchParams.get("sort") ?? "popular";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    let themes: ThemeManifest[] = SAMPLE_THEMES;

    // Filter by search query
    if (query) {
      const q = query.toLowerCase();
      themes = themes.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Filter by color scheme
    if (colorScheme && (colorScheme === "dark" || colorScheme === "light")) {
      themes = themes.filter((t) => t.colorScheme === colorScheme || t.colorScheme === "both");
    }

    // Sort
    switch (sort) {
      case "popular":
        themes = [...themes].sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case "newest":
        themes = [...themes].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
      case "rating":
        themes = [...themes].sort((a, b) => b.stats.averageRating - a.stats.averageRating);
        break;
    }

    // Paginate
    const total = themes.length;
    const offset = (page - 1) * limit;
    const items = themes.slice(offset, offset + limit);

    const response: MarketplaceAPIResponse<MarketplaceSearchResult<ThemeManifest>> = {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: MarketplaceAPIResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch themes",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
