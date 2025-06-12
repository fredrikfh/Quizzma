import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import { QuestionPublicFullAnalysis } from "@/apiService";
import OverallAnalysis from "@/pages/QuizPage/AnalysisElements/OverallAnalysis.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Button } from "@/components/ui/button.tsx";
import DetailedAnalysis from "@/pages/QuizPage/AnalysisElements/DetailedAnalysis.tsx";

export default function QuizReviewPage() {
  const { id } = useParams();
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionPublicFullAnalysis | null>(null);
  const [detailed, setDetailed] = useState(false);

  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      return await api.host.getQuiz({ quizId: id! });
    },
    enabled: !!id,
    refetchOnMount: "always",
  });

  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["previousAnalysis", id],
    queryFn: async () => {
      return await api.host.getQuizAnalyses({
        quizId: id!,
      });
    },
    enabled: !!id,
  });

  if (isLoadingQuiz) {
    return <div>Loading quiz...</div>;
  }

  if (!quiz || !analysis) {
    return <div>Quiz not found</div>;
  }

  const handleQuestionChange = (value: string) => {
    if (value === "default") {
      setSelectedQuestion(null);
    } else {
      const foundQuestion = analysis.find(
        (q: QuestionPublicFullAnalysis) => q.id === value,
      );
      setSelectedQuestion(foundQuestion || null);
      setDetailed(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Shadcn Select component for choosing a question */}
      <div className="p-4 border-b flex flex-row gap-2">
        <Select
          value={selectedQuestion?.id || "default"}
          onValueChange={handleQuestionChange}
        >
          <SelectTrigger className="w-[250px] truncate">
            <SelectValue placeholder="Select a question" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{"-- Select a question --"}</SelectItem>
            {analysis
              .filter((question) => !question.predefined)
              .map((q: QuestionPublicFullAnalysis) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.text || `Question ${q.id.split("-")[0]}`}
                  {q.answers && q.answers.length > 0 && (
                    <Badge variant={"secondary"} className={"ml-2 rounded"}>
                      {` ${q.answers.length} responses`}
                    </Badge>
                  )}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          variant={"ghost"}
          onClick={() => {
            setDetailed(!detailed);
          }}
          disabled={!selectedQuestion}
        >
          <Switch checked={detailed && !!selectedQuestion} />
          View as groups
        </Button>
      </div>

      {/* Display the overall analysis for the selected question */}
      {selectedQuestion && (
        <div className="flex-grow overflow-auto">
          {detailed ? (
            <DetailedAnalysis
              id={selectedQuestion?.id}
              question={selectedQuestion?.text}
              topics={selectedQuestion?.topics}
              isLoading={isLoadingAnalysis}
            />
          ) : (
            <OverallAnalysis
              id={selectedQuestion?.id}
              question={selectedQuestion?.text}
              summary={selectedQuestion?.summary}
              answers={selectedQuestion?.answers}
              isLoading={isLoadingAnalysis}
            />
          )}
        </div>
      )}
    </div>
  );
}
