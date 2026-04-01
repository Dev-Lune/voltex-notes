/**
 * Marketplace Plugins API
 * 
 * GET /api/marketplace/plugins - List all plugins
 * GET /api/marketplace/plugins?q=search&category=editor - Search/filter plugins
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SAMPLE_PLUGINS,
  searchPlugins,
  getPluginsByCategory,
  getPopularPlugins,
  getNewestPlugins,
} from "@/lib/marketplace/data";
import type { MarketplaceAPIResponse, MarketplaceSearchResult, PluginManifest } from "@/lib/marketplace/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") ?? "popular";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    let plugins: PluginManifest[] = SAMPLE_PLUGINS;

    // Filter by search query
    if (query) {
      plugins = searchPlugins(query);
    }

    // Filter by category
    if (category) {
      plugins = plugins.filter((p) => p.category === category);
    }

    // Sort
    switch (sort) {
      case "popular":
        plugins = [...plugins].sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case "newest":
        plugins = [...plugins].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
      case "rating":
        plugins = [...plugins].sort((a, b) => b.stats.averageRating - a.stats.averageRating);
        break;
      case "downloads":
        plugins = [...plugins].sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
    }

    // Paginate
    const total = plugins.length;
    const offset = (page - 1) * limit;
    const items = plugins.slice(offset, offset + limit);

    const response: MarketplaceAPIResponse<MarketplaceSearchResult<PluginManifest>> = {
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
        message: "Failed to fetch plugins",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
