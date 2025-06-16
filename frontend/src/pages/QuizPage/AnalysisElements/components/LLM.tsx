import { Card } from "@/components/ui/card.tsx";
import { getEmojiForLine } from "@/pages/QuizPage/AnalysisElements/utils/emojiUtils.ts";
import { Loader } from "lucide-react";

interface LLMSummaryProps {
  summaryLines: string[];
  title?: string;
  isLoading?: boolean;
}

export default function LLMSummary({
  summaryLines,
  title = "Summary",
  isLoading = false,
}: LLMSummaryProps) {
  return (
    <div className="relative rounded-lg overflow-hidden p-0.5">
      <div className="absolute inset-0 animate-gradient-x bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500"></div>
      <Card className="bg-white dark:bg-gray-950 relative border-0 rounded-md h-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-left">{title}</h3>
          <div className="space-y-3">
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              summaryLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xl">{getEmojiForLine(index)}</span>
                  <p className="text-md text-left">{line}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
