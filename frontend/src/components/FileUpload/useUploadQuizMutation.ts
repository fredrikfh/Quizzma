import { useMutation } from "@tanstack/react-query";
import { api } from "@/api.ts";
import { QuizPublic } from "@/apiService";
import { queryClient } from "@/App.tsx";
import { toast } from "sonner";

interface ImportQuestionsVariables {
  quizId: string;
  files: string[];
}

export const useUploadQuizMutation = () => {
  const mutation = useMutation<QuizPublic, Error, ImportQuestionsVariables>({
    mutationFn: ({ quizId, files }) =>
      api.host.importQuestions({
        quizId,
        requestBody: files,
      }),
    mutationKey: ["uploadQuiz"],
    onSuccess: (data, variables) => {
      toast.success(`Answers uploaded and processed!`);
      void queryClient.invalidateQueries({
        queryKey: ["quiz", variables.quizId],
      });
    },
    onError: () => {
      toast.error("Upload failed.");
    },
  });
  return { mutation };
};
