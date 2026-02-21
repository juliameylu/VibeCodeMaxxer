import { RefreshCw, Zap } from "lucide-react";
import { useState } from "react";

export default function DataSourcesFooter() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <footer className="glass-card animate-fade-in p-4">
      <div className="flex items-center justify-center gap-2 text-sm text-soft">
        <Zap size={15} className="text-amberSoft" />
        <span>Powered by Weather • Places • Canvas APIs</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-soft">
        <p>
          Last updated: <span className="font-semibold text-ink">2:30 PM</span>
        </p>
        <button
          onClick={handleRefresh}
          className={`inline-flex items-center gap-1 font-semibold text-amberSoft ${refreshing ? "animate-spin" : ""}`}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    </footer>
  );
}
