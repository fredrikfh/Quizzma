import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { Answer } from "@/apiService";
import { AnswerWithSentiment } from "@/pages/QuizPage/AnalysisElements/components/AnswerWithSentiment.tsx";

interface AnswerGridProps {
  answers?: Answer[];
  showAsDefault: boolean;
}

export const AnswerGrid = ({ answers, showAsDefault }: AnswerGridProps) => {
  const [showAnswers, setShowResponses] = useState(showAsDefault);

  return (
    <>
      <div className="mb-2 flex justify-between items-center w-full">
        <Badge variant="outline" className="text-lg">
          <p>
            {answers?.length || 0} <span className="text-md">answers</span>
          </p>
        </Badge>
        <div className="flex items-center justify-end space-x-2">
          <Label htmlFor="hide-answers-switch">
            {showAnswers ? <Eye /> : <EyeClosed />}
          </Label>
          <Switch
            id="hide-answers-switch"
            className="ml-4"
            checked={showAnswers}
            onCheckedChange={(e) => setShowResponses(e.valueOf())}
          />
        </div>
      </div>

      {/* Grid */}
      {showAnswers &&
        (answers?.length ? (
          <ScrollArea type="always" className="h-full pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
              {answers.map((answer) => (
                <AnswerWithSentiment answer={answer} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center p-6 border rounded-md bg-gray-50">
            <p className="text-gray-400">No answers to show</p>
          </div>
        ))}
      {!showAnswers && (
        <div className="flex items-center justify-center p-6 border rounded-md bg-gray-50">
          <p className="text-gray-400">Answers hidden</p>
        </div>
      )}
    </>
  );
};
