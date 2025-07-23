import { Clock, Database, RefreshCw, AlertCircle } from "lucide-react";

interface CacheStatusIndicatorProps {
  cacheStatus: {
    exists: boolean;
    isExpired: boolean;
    lastFetch?: string;
    postCount?: number;
    age?: number;
  };
  dataSources: {
    historical: boolean;
    realtime: boolean;
    cache: boolean;
  };
  isRefetching: boolean;
  onRefresh?: () => void;
}

export const CacheStatusIndicator = ({
  cacheStatus,
  dataSources,
  isRefetching,
  onRefresh,
}: CacheStatusIndicatorProps) => {
  const getStatusColor = () => {
    if (!cacheStatus.exists) return "text-gray-500";
    if (cacheStatus.isExpired) return "text-yellow-600";
    if (cacheStatus.age && cacheStatus.age < 60 * 60 * 1000)
      return "text-green-600"; // Less than 1 hour
    if (cacheStatus.age && cacheStatus.age < 6 * 60 * 60 * 1000)
      return "text-blue-600"; // Less than 6 hours
    return "text-orange-600";
  };

  const getStatusText = () => {
    if (!cacheStatus.exists) return "No cached data";
    if (cacheStatus.isExpired) return "Cache expired";
    if (cacheStatus.age && cacheStatus.age < 60 * 60 * 1000)
      return "Fresh data";
    if (cacheStatus.age && cacheStatus.age < 6 * 60 * 60 * 1000)
      return "Recent data";
    return "Stale data";
  };

  const getAgeText = () => {
    if (!cacheStatus.age) return "";

    const hours = Math.floor(cacheStatus.age / (60 * 60 * 1000));
    const minutes = Math.floor(
      (cacheStatus.age % (60 * 60 * 1000)) / (60 * 1000)
    );

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  const getDataSourceText = () => {
    const sources = [];
    if (dataSources.cache) sources.push("Cache");
    if (dataSources.historical) sources.push("Historical");
    if (dataSources.realtime) sources.push("Real-time");

    if (sources.length === 0) return "Loading...";
    return sources.join(" + ");
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      {/* Cache Status */}
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        <Database size={14} />
        <span>{getStatusText()}</span>
        {cacheStatus.lastFetch && (
          <span className="text-gray-500">({getAgeText()})</span>
        )}
      </div>

      {/* Data Sources */}
      <div className="flex items-center space-x-1 text-gray-600">
        <Clock size={14} />
        <span>{getDataSourceText()}</span>
      </div>

      {/* Post Count */}
      {cacheStatus.postCount !== undefined && (
        <div className="text-gray-600">{cacheStatus.postCount} posts</div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefetching}
          className={`flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRefetching ? "animate-spin" : ""
          }`}
        >
          <RefreshCw size={14} />
          <span>{isRefetching ? "Refreshing..." : "Refresh"}</span>
        </button>
      )}

      {/* Warning for expired cache */}
      {cacheStatus.isExpired && cacheStatus.exists && (
        <div className="flex items-center space-x-1 text-yellow-600">
          <AlertCircle size={14} />
          <span>Cache expired</span>
        </div>
      )}
    </div>
  );
};
