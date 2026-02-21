import { Zap, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function DataSourcesFooter() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="animate-fade-in py-8 border-t border-slate-200">
      <div className="flex items-center justify-center gap-2 text-slate-600 text-sm mb-3">
        <Zap size={16} className="text-accent" />
        <span>Powered by Weather • Places • Canvas APIs</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <p className="text-xs text-slate-500">
          Last updated: <span className="font-medium text-slate-700">2:30 PM</span>
        </p>
        <button
          onClick={handleRefresh}
          className={`text-xs text-accent hover:text-accent/80 transition flex items-center gap-1 ${
            refreshing ? "animate-spin" : ""
          }`}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
}
