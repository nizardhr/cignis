import { useState, useEffect, useMemo } from "react";
import {
  useLinkedInHistoricalPosts,
  useLinkedInChangelog,
} from "./useLinkedInData";
import { PostPulseCache, ProcessedPost } from "../services/postpulse-cache";
import { PostPulseProcessor } from "../services/postpulse-processor";

export interface UsePostPulseDataOptions {
  timeFilter: "7d" | "30d" | "90d";
  searchTerm: string;
  page: number;
  pageSize?: number;
}

export interface PostPulseDataState {
  posts: ProcessedPost[];
  isLoading: boolean;
  isInitialLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  cacheStatus: {
    exists: boolean;
    isExpired: boolean;
    lastFetch?: string;
    postCount?: number;
    age?: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  dataSources: {
    historical: boolean;
    realtime: boolean;
    cache: boolean;
  };
}

export const usePostPulseData = (
  options: UsePostPulseDataOptions
): PostPulseDataState => {
  const { timeFilter, searchTerm, page, pageSize = 12 } = options;

  const [allPosts, setAllPosts] = useState<ProcessedPost[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dataSources, setDataSources] = useState({
    historical: false,
    realtime: false,
    cache: false,
  });

  // Fetch historical data with infinite query
  const {
    data: historicalData,
    isLoading: historicalLoading,
    isFetching: historicalFetching,
    error: historicalError,
    hasNextPage: hasMoreHistorical,
    fetchNextPage: fetchMoreHistorical,
  } = useLinkedInHistoricalPosts(90);

  // Fetch real-time changelog data
  const {
    data: changelogData,
    isLoading: changelogLoading,
    isFetching: changelogFetching,
    error: changelogError,
  } = useLinkedInChangelog(100);

  // Check cache status
  const cacheStatus = useMemo(() => PostPulseCache.getCacheStatus(), []);

  // Load from cache on initial load
  useEffect(() => {
    if (isInitialLoad) {
      const cached = PostPulseCache.getCache();
      if (cached) {
        setAllPosts(cached.posts);
        setDataSources((prev) => ({ ...prev, cache: true }));
        console.log("Loaded posts from cache:", cached.posts.length);
      }
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  // Process historical data
  useEffect(() => {
    if (historicalData?.pages) {
      const historicalPosts: ProcessedPost[] = [];

      historicalData.pages.forEach((page) => {
        const processed = PostPulseProcessor.processHistoricalData(page);
        historicalPosts.push(...processed);
      });

      // Merge with existing posts
      const merged = PostPulseProcessor.mergeAndDeduplicatePosts(
        historicalPosts,
        allPosts.filter((p) => p.source === "realtime")
      );

      setAllPosts(merged);
      setDataSources((prev) => ({ ...prev, historical: true }));

      // Cache the merged data
      if (merged.length > 0) {
        PostPulseCache.setCache(merged, merged.length, hasMoreHistorical);
      }

      console.log("Processed historical posts:", historicalPosts.length);
    }
  }, [historicalData, hasMoreHistorical]);

  // Process changelog data
  useEffect(() => {
    if (changelogData?.elements) {
      const realtimePosts =
        PostPulseProcessor.processChangelogData(changelogData);

      // Merge with existing posts
      const merged = PostPulseProcessor.mergeAndDeduplicatePosts(
        allPosts.filter((p) => p.source === "historical"),
        realtimePosts
      );

      setAllPosts(merged);
      setDataSources((prev) => ({ ...prev, realtime: true }));

      // Update cache with new data
      if (merged.length > 0) {
        PostPulseCache.setCache(merged, merged.length, hasMoreHistorical);
      }

      console.log("Processed realtime posts:", realtimePosts.length);
    }
  }, [changelogData, hasMoreHistorical]);

  // Filter and paginate posts
  const filteredAndPaginated = useMemo(() => {
    // Filter by date range
    const daysBack = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : 90;
    const dateFiltered = PostPulseProcessor.filterPostsByDateRange(
      allPosts,
      daysBack
    );

    // Filter by search term
    const searchFiltered = searchTerm
      ? dateFiltered.filter((post) =>
          post.text.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : dateFiltered;

    // Paginate
    const paginated = PostPulseProcessor.paginatePosts(
      searchFiltered,
      page,
      pageSize
    );

    return {
      posts: paginated.posts,
      pagination: {
        currentPage: paginated.currentPage,
        totalPages: paginated.totalPages,
        totalPosts: paginated.totalPosts,
        hasNextPage: paginated.hasNextPage,
        hasPrevPage: paginated.hasPrevPage,
      },
    };
  }, [allPosts, timeFilter, searchTerm, page, pageSize]);

  // Determine loading states
  const isLoading = historicalLoading || changelogLoading;
  const isInitialLoading = isInitialLoad && isLoading;
  const isRefetching = historicalFetching || changelogFetching;
  const error = historicalError || changelogError;

  return {
    posts: filteredAndPaginated.posts,
    isLoading,
    isInitialLoading,
    isRefetching,
    error,
    cacheStatus,
    pagination: filteredAndPaginated.pagination,
    dataSources,
  };
};
