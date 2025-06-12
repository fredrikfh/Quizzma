import type React from "react";
import { useState } from "react";
import type { AnswerPublicExtended, Answer } from "@/apiService";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnswerProps {
  answer: AnswerPublicExtended | Answer;
}

function isAnswerPublicExtended(
  answer: AnswerPublicExtended | Answer,
): answer is AnswerPublicExtended {
  return (answer as AnswerPublicExtended).sentiment !== undefined;
}

export const AnswerWithSentiment: React.FC<AnswerProps> = ({ answer }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const indicatorColor = isAnswerPublicExtended(answer)
    ? answer.sentiment?.verdict === "Positive"
      ? "bg-green-500"
      : answer.sentiment?.verdict === "Negative"
        ? "bg-red-500"
        : "bg-gray-300"
    : "bg-gray-300";

  const sentimentPercentage =
    isAnswerPublicExtended(answer) && answer.sentiment?.compound !== 0
      ? Math.round(Math.abs(answer.sentiment?.compound ?? 0) * 100)
      : null;

  const sentimentVerdict = isAnswerPublicExtended(answer)
    ? answer.sentiment?.verdict
    : null;

  const sentimentColor = isAnswerPublicExtended(answer)
    ? answer.sentiment?.verdict === "Positive"
      ? "#10b981"
      : answer.sentiment?.verdict === "Negative"
        ? "#ef4444"
        : "#9ca3af"
    : "#9ca3af";

  return (
    <>
      <Card
        key={answer.id}
        className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="relative h-full">
          {/* Sentiment indicator */}
          <div
            className={`absolute top-0 left-0 w-0.5 h-full ${indicatorColor}`}
          ></div>
          <div className="p-4 pl-5 flex flex-col justify-between h-full">
            <p className="text-sm text-left">{answer.text}</p>
            {isAnswerPublicExtended(answer) && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <div className="flex items-center">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: sentimentColor }}
                  ></span>
                  <span>
                    {sentimentPercentage && `${sentimentPercentage}% `}
                    {sentimentVerdict}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-screen-lg w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Answer</DialogTitle>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          <div className="relative mt-6 p-6 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div
              className={`absolute top-0 left-0 w-2 h-full ${indicatorColor}`}
            ></div>
            <div className="pl-4">
              <p className="text-4xl leading-relaxed">{answer.text}</p>

              {isAnswerPublicExtended(answer) && (
                <div className="mt-6 flex items-center text-base text-gray-700">
                  <div className="flex items-center">
                    <span
                      className="inline-block w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: sentimentColor }}
                    ></span>
                    <span>
                      {sentimentPercentage && `${sentimentPercentage}% `}
                      {sentimentVerdict}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
