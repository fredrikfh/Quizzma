import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/api";
import { PreDefinedQuestionBox } from "@/pages/QuizPage/PreDefinedQuestion";
import {
  QuestionPublicExtended,
  QuestionPublicFullAnalysis,
} from "@/apiService";

import {
  useCreateNewSessionMutation,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useUpdateQuestionMutation,
  QuizType,
} from "./utils";
import {
  CloudUpload,
  FileText,
  MoreHorizontal,
  Play,
  PlusCircleIcon,
  X,
  Download,
} from "lucide-react";
import EmptyPlaceholder from "@/pages/QuizPage/EmptyPlaceholder.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import FileUploader from "@/components/FileUpload/FileUploader.tsx";
import { useUploadQuizMutation } from "@/components/FileUpload/useUploadQuizMutation.ts";
import { useDeleteQuizMutation } from "@/hooks/useDeleteQuizMutation.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { queryClient } from "@/App.tsx";

export default function QuizDetailsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [importQuizDialogOpen, setImportQuizDialogOpen] = useState(false);
  const [deleteQuizDialogOpen, setDeleteQuizDialogOpen] = useState(false);
  const [importedFiles, setImportedFiles] = useState<string[]>([]);

  // Fetch quiz details (including its questions)
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery<QuizType>({
    queryKey: ["quiz", id],
    queryFn: async () => {
      if (!id) throw new Error("Quiz id is required");
      return await api.host.getQuiz({ quizId: id });
    },
  });

  // Filter questions by the predefined flag
  const predefinedQuestions = quiz?.questions?.filter(
    (q: QuestionPublicExtended) => q.predefined,
  );
  const notPredefinedQuestions = quiz?.questions?.filter(
    (q: QuestionPublicExtended) => !q.predefined,
  );

  // Use our custom hooks.
  const createNewSession = useCreateNewSessionMutation();
  const createQuestionMutation = useCreateQuestionMutation(id!);
  const deleteQuestionMutation = useDeleteQuestionMutation(id!);
  const updateQuestionMutation = useUpdateQuestionMutation(id!);

  const startQuizSession = (quizId: string): void => {
    createNewSession.mutate(quizId, {
      onSuccess: () => {
        navigate(`/quiz/${quizId}/live`);
      },
    });
  };

  const { mutation: uploadQuizMutation } = useUploadQuizMutation();
  const { mutation: deleteQuizMutation } = useDeleteQuizMutation();

  const handleExportAnswers = async () => {
    const safeValue = (value: string): string => {
      if (!value) return "";
      return `"${value.replace(/^-/g, "'-").replace(/"/g, '""')}"`; // Ensures Excel treats leading dash as text
    };

    try {
      let analyses: QuestionPublicFullAnalysis[] | undefined =
        queryClient.getQueryData(["previousAnalysis", id]);

      if (!analyses) {
        analyses = await api.host.getQuizAnalyses({ quizId: id! });
        queryClient.setQueryData(["previousAnalysis", id], analyses);
      }

      // Define CSV headers
      const headers = [
        "question_text",
        "summary_emoji",
        "summary_text",
        "answer_text",
        "sentiment_verdict",
        "sentiment_positive",
        "sentiment_neutral",
        "sentiment_negative",
        "topic_label",
        "topic_text",
        "topic_summary_text",
      ];

      // Initialize an array to store CSV rows
      const rows: string[] = [headers.join(",")];

      analyses.forEach((item) => {
        const {
          text: questionText,
          predefined,
          summary = null,
          answers = [],
          topics = [],
        } = item;

        // Exclude predefined questions
        if (predefined) return;

        const summaryEmoji = summary?.emoji || "";
        const summaryText = summary?.summaryText || "";

        if (answers.length > 0) {
          answers.forEach((answer) => {
            const { text: answerText, id: answerId, sentiment = null } = answer;
            const {
              verdict = "",
              positive = 0.0,
              neutral = 0.0,
              negative = 0.0,
            } = sentiment || {};

            // Initialize row attributes as an array
            const rowAttributes: string[] = [
              safeValue(questionText),
              safeValue(summaryEmoji),
              safeValue(summaryText),
              safeValue(answerText),
              verdict,
              positive.toString(),
              neutral.toString(),
              negative.toString(),
            ];

            // Find related topic for the answer
            const topic = topics.find((topic) =>
              topic.answers?.some((val) => val.id === answerId),
            );

            if (topic) {
              const {
                label,
                topic: topicText,
                summary: topicSummary = null,
              } = topic;
              rowAttributes.push(
                safeValue(label),
                safeValue(topicText),
                safeValue(topicSummary?.summaryText || ""),
              );
            } else {
              rowAttributes.push("", "", ""); // Preserve CSV format consistency
            }

            // Convert row attributes to CSV format
            rows.push(rowAttributes.join(","));
          });
        } else {
          // Handle case where there are no answers
          const row = [
            safeValue(questionText),
            safeValue(summaryEmoji),
            safeValue(summaryText),
            "n/a", // answer_text
            "", // sentiment_verdict
            "", // sentiment_positive
            "", // sentiment_neutral
            "", // sentiment_negative
            "", // topic_label
            "", // topic_text
            "", // topic_summary_text
          ].join(",");

          rows.push(row);
        }
      });

      const csvContent = rows.join("\n");
      const utf8Bom = "\uFEFF"; // For Excel to recognise UTF-8 encoding
      const blob = new Blob([utf8Bom + csvContent], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quiz-answers-${quiz?.id || "unknown"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting answers", error);
    }
  };

  if (isLoadingQuiz) {
    return <div>Loading...</div>;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-[800px]">
      <Card className="mb-8 flex flex-row justify-between items-center text-left">
        <CardHeader>
          <CardTitle>{quiz.name}</CardTitle>
          <CardDescription>{quiz.description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2 p-0 py-4 pr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                More actions
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/quiz/${id}/answers`)}
                disabled={
                  !notPredefinedQuestions || notPredefinedQuestions.length === 0
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                See answers
              </DropdownMenuItem>

              <Dialog>
                <DialogTrigger
                  asChild
                  onClick={() => setImportQuizDialogOpen(true)}
                >
                  <DropdownMenuItem>
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Import answers
                  </DropdownMenuItem>
                </DialogTrigger>
              </Dialog>

              <DropdownMenuItem
                onClick={handleExportAnswers}
                disabled={
                  !notPredefinedQuestions || notPredefinedQuestions.length === 0
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download answers
              </DropdownMenuItem>

              <Dialog>
                <DialogTrigger
                  asChild
                  onClick={() => setDeleteQuizDialogOpen(true)}
                >
                  <DropdownMenuItem className="text-destructive">
                    <X className="mr-2 h-4 w-4" />
                    Delete quiz
                  </DropdownMenuItem>
                </DialogTrigger>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => startQuizSession(quiz.id)}>
            Start
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>

        {/* Import Quiz Dialog */}
        <Dialog
          open={importQuizDialogOpen}
          onOpenChange={setImportQuizDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Import a previous quiz</DialogTitle>
              <DialogDescription>
                Upload a document with questions and responses and we will
                analyze them!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FileUploader
                hideDefaultActions
                onFilesChange={setImportedFiles}
              />
            </div>
            <DialogFooter>
              {uploadQuizMutation.isPending && (
                <div className="animate-pulse">Uploading...</div>
              )}
              <Button
                type="submit"
                onClick={() => {
                  uploadQuizMutation.mutate({
                    quizId: id!,
                    files: importedFiles,
                  });
                }}
                disabled={uploadQuizMutation.isPending}
              >
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Quiz Dialog */}
        <Dialog
          open={deleteQuizDialogOpen}
          onOpenChange={setDeleteQuizDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete this quiz</DialogTitle>
              <DialogDescription>
                This will permanently delete the quiz!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {deleteQuizMutation.isPending && (
                <div className="animate-pulse">Deleting...</div>
              )}
              <Button
                type="submit"
                variant="destructive"
                onClick={() => {
                  deleteQuizMutation.mutate(id!);
                }}
                disabled={deleteQuizMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      <div className="flex flex-row justify-between items-center mt-16">
        <h2 className="text-2xl font-bold">Pre defined questions</h2>
        <Button
          variant="secondary"
          onClick={() => createQuestionMutation.mutate("")}
        >
          Create new question
          <PlusCircleIcon />
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {predefinedQuestions?.length === 0 && (
          <EmptyPlaceholder
            title="No Predefined Questions"
            description='Click the "Create new question" button above to add your first question.'
          />
        )}
        {predefinedQuestions &&
          predefinedQuestions.map((question: QuestionPublicExtended) => (
            <PreDefinedQuestionBox
              key={question.id}
              question={question}
              onDelete={() => deleteQuestionMutation.mutate(question.id)}
              onChange={(questionId, newText) =>
                updateQuestionMutation.mutate({ questionId, newText })
              }
            />
          ))}
      </div>
    </div>
  );
}
