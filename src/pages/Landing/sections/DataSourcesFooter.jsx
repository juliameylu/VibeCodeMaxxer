import { Zap } from "lucide-react";

export default function DataSourcesFooter() {
  return (
    <div className="animate-fade-in text-center py-8 border-t border-slate-200">
      <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
        <Zap size={16} className="text-accent" />
        <span>
          Data from Weather API • Google Places • Canvas • Local Events
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Last updated: 2:30 PM • Refreshing in 10 min
      </p>
    </div>
  );
}
