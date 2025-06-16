import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Filter, Loader } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface DetailedAnalysisProps {
  id: string;
  question?: string;
  topics?: TopicExtended[];
  isLoading: boolean;
}

import {
  calculateSentimentStats,
  getDominantSentiment,
} from "@/pages/QuizPage/AnalysisElements/utils/sentimentUtils.ts";
import { formatSummaryText } from "@/pages/QuizPage/AnalysisElements/utils/summaryUtils.ts";
import LLMSummary from "@/pages/QuizPage/AnalysisElements/components/LLM.tsx";
import SentimentAnalysis from "@/pages/QuizPage/AnalysisElements/components/Sentiment.tsx";
import { TopicExtended } from "@/apiService";
import { AnswerWithSentiment } from "@/pages/QuizPage/AnalysisElements/components/AnswerWithSentiment.tsx";

export default function DetailedAnalysis({
  id,
  question,
  topics,
  isLoading,
}: DetailedAnalysisProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    positive: false,
    neutral: false,
    negative: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  const selectedTopic = useMemo(() => {
    if (!topics || !selectedTopicId) return null;
    return topics.find((topic) => topic.id === selectedTopicId);
  }, [topics, selectedTopicId]);

  const sentimentPercentages = useMemo(() => {
    if (!selectedTopic?.answers) {
      return { positive: 0, neutral: 0, negative: 0 };
    }
    return calculateSentimentStats(selectedTopic.answers);
  }, [selectedTopic]);

  const formattedSummary = useMemo(() => {
    if (!selectedTopic?.summary?.summaryText) return [];
    return formatSummaryText(selectedTopic.summary.summaryText);
  }, [selectedTopic?.summary?.summaryText]);

  const filteredResponses = useMemo(() => {
    if (!selectedTopic?.answers) return [];
    if (!filters.positive && !filters.neutral && !filters.negative) {
      return selectedTopic.answers;
    }
    return selectedTopic.answers.filter((answer) => {
      if (!answer.sentiment) return false;
      const verdict = answer.sentiment.verdict;
      return (
        (filters.positive && verdict === "Positive") ||
        (filters.neutral && verdict === "Neutral") ||
        (filters.negative && verdict === "Negative")
      );
    });
  }, [selectedTopic?.answers, filters]);

  if (!topics) {
    return (
      <div className="container mx-auto py-6 flex flex-row gap-2 items-center">
        <Loader className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Question display */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className="text-sm text-gray-500">Question #{id}</p>
            <h2 className="text-xl font-bold">{question}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Topics list */}
        <div className="md:col-span-1">
          <div className="space-y-2">
            {topics.map((topic) => {
              const dominant = getDominantSentiment(topic.answers);
              return (
                <button
                  key={topic.id}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedTopicId === topic.id
                      ? "bg-black text-white"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedTopicId(topic.id)}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium capitalize">{topic.label}</h4>
                    <div className="flex items-center">
                      <Badge
                        className={`${
                          dominant === "Positive"
                            ? "bg-green-100 text-green-800"
                            : dominant === "Negative"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        } ${selectedTopicId === topic.id ? "border border-white" : ""}`}
                      >
                        {dominant}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1 text-sm">
                    {/* You can also compute response counts similarly if needed */}
                    {topic.answers?.length || 0}{" "}
                    {topic.answers?.length === 1 ? "response" : "responses"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analysis and responses */}
        <div className="md:col-span-2">
          {selectedTopic ? (
            <>
              {/* Summary and Sentiment Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <LLMSummary
                  summaryLines={formattedSummary}
                  isLoading={isLoading}
                />
                <SentimentAnalysis
                  isLoading={isLoading}
                  positive={sentimentPercentages.positive}
                  negative={sentimentPercentages.negative}
                />
              </div>

              {/* Responses count and filter */}
              <div className="flex justify-between items-center mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
                  {filteredResponses.length} answers
                </span>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 p-3 border">
                      <div className="space-y-2">
                        {["positive", "neutral", "negative"].map((key) => (
                          <div
                            key={key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={key}
                              checked={filters[key as keyof typeof filters]}
                              onCheckedChange={(checked) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  [key]: !!checked,
                                }))
                              }
                            />
                            <label
                              htmlFor={key}
                              className="text-sm font-medium leading-none"
                            >
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Student responses grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResponses.map((answer) => (
                  <AnswerWithSentiment answer={answer} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] border rounded-lg bg-gray-50">
              <p className="text-gray-500 text-lg">
                &larr; Select a topic to view detailed analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
