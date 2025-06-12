import { Card } from "@/components/ui/card.tsx";
import { Loader } from "lucide-react";

interface SentimentAnalysisProps {
  positive: number;
  negative: number;
  title?: string;
  isLoading?: boolean;
}

export default function SentimentAnalysis({
  positive,
  negative,
  title = "Sentiment analysis",
  isLoading = false,
}: SentimentAnalysisProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-left">{title}</h3>
      {isLoading ? (
        <Loader className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-green-700 font-bold text-xl">
              {positive}%
            </span>
            <span className="text-red-700 font-bold text-xl">{negative}%</span>
          </div>
          <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-green-600 rounded-l-full"
              style={{ width: `${positive}%` }}
            ></div>
            <div
              className="absolute right-0 top-0 h-full bg-red-600 rounded-r-full"
              style={{ width: `${negative}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Positive</span>
            <span className="text-red-700">Negative</span>
          </div>
        </div>
      )}
    </Card>
  );
}
