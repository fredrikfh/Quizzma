import SentimentAnalysis from "@/pages/QuizPage/AnalysisElements/components/Sentiment.tsx";
import LLMSummary from "@/pages/QuizPage/AnalysisElements/components/LLM.tsx";
import { Answer, AnswerPublicExtended, SummaryPublic } from "@/apiService";
import { useMemo } from "react";
import { calculateSentimentStats } from "@/pages/QuizPage/AnalysisElements/utils/sentimentUtils.ts";
import { formatSummaryText } from "@/pages/QuizPage/AnalysisElements/utils/summaryUtils.ts";
import { AnswerGrid } from "./components/AnswerGrid";

type OverallAnalysisProps = {
  id: string;
  question?: string;
  rawAnswers?: Answer[];
  summary?: SummaryPublic | null;
  answers?: AnswerPublicExtended[];
  isLoading: boolean;
};

export default function OverallAnalysis({
  id,
  question,
  rawAnswers,
  summary,
  answers,
  isLoading,
}: OverallAnalysisProps) {
  const safeQuestion = question ?? "Unknown question";
  const sentimentStats = useMemo(() => {
    if (!answers || answers?.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }
    return calculateSentimentStats(answers);
  }, [answers]);

  const formattedSummary = useMemo(() => {
    if (!summary?.summaryText) return [];
    return formatSummaryText(summary.summaryText);
  }, [summary?.summaryText]);

  return (
    <div className="container mx-auto py-6">
      {/* Question display */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-sm text-gray-500">Question #{id}</p>
            <h2 className="text-xl font-bold">{safeQuestion}</h2>
          </div>
        </div>
      </div>

      {/* Summary and Sentiment Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <LLMSummary summaryLines={formattedSummary} isLoading={isLoading} />
        <SentimentAnalysis
          isLoading={isLoading}
          positive={sentimentStats.positive}
          negative={sentimentStats.negative}
        />
      </div>

      {/* Answer grid */}
      <div className="flex flex-col space-y-4 h-[calc(50vh-2rem)] w-full">
        <AnswerGrid
          answers={isLoading ? rawAnswers : answers}
          showAsDefault={true}
        />
      </div>
    </div>
  );
}
