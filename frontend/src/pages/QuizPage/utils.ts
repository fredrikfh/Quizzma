// utils.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api";
import { QuizPublicExtended, QuestionPublicExtended } from "@/apiService";

// Alias for quiz data for convenience.
export type QuizType = QuizPublicExtended;

/** Hook to start a new session */
export function useCreateNewSessionMutation() {
  return useMutation<void, Error, string>({
    mutationFn: async (quizId: string) => {
      await api.sessions.createSession({ sessionCreate: { quizId } });
    },
  });
}

/** Hook to create a new predefined question */
export function useCreateQuestionMutation(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    QuizPublicExtended, // API returns the updated quiz.
    unknown,
    string,
    { previousQuiz: QuizType | undefined; tempId: string }
  >({
    mutationFn: async (questionText: string) => {
      if (!quizId) throw new Error("Quiz id is required");
      return await api.host.addPredefinedQuestion({
        quizId,
        questionCreate: { quizId, text: questionText },
      });
    },
    onMutate: async (questionText: string) => {
      await queryClient.cancelQueries({ queryKey: ["quiz", quizId] });
      const previousQuiz = queryClient.getQueryData<QuizType>(["quiz", quizId]);
      const tempId = "temp-" + Math.random().toString(36).substr(2, 9);
      if (previousQuiz) {
        queryClient.setQueryData<QuizType>(["quiz", quizId], (oldQuiz) => {
          if (!oldQuiz) return oldQuiz;
          return {
            ...oldQuiz,
            questions: [
              ...(oldQuiz.questions || []),
              {
                id: tempId,
                text: questionText,
                predefined: true,
                // Include any other required properties here.
              } as QuestionPublicExtended,
            ],
          };
        });
      }
      return { previousQuiz, tempId };
    },
    onError: (err, questionText, context) => {
      if (context?.previousQuiz) {
        queryClient.setQueryData(["quiz", quizId], context.previousQuiz);
      }
      toast.error("Failed to create question");
    },
    onSuccess: () => {
      toast.success("Question created!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
}

/** Hook to delete a predefined question */
export function useDeleteQuestionMutation(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    unknown,
    string,
    { previousQuiz: QuizType | undefined }
  >({
    mutationFn: async (questionId: string) => {
      if (!quizId) throw new Error("Quiz id is required");
      return await api.host.deletePredefinedQuestion({
        quizId,
        questionId,
      });
    },
    onMutate: async (questionId: string) => {
      await queryClient.cancelQueries({ queryKey: ["quiz", quizId] });
      const previousQuiz = queryClient.getQueryData<QuizType>(["quiz", quizId]);
      if (previousQuiz) {
        queryClient.setQueryData<QuizType>(["quiz", quizId], (oldQuiz) => {
          if (!oldQuiz) return oldQuiz;
          return {
            ...oldQuiz,
            questions: oldQuiz.questions?.filter((q) => q.id !== questionId),
          };
        });
      }
      return { previousQuiz };
    },
    onError: (err, questionId, context) => {
      if (context?.previousQuiz) {
        queryClient.setQueryData(["quiz", quizId], context.previousQuiz);
      }
      toast.error("Failed to delete question");
    },
    onSuccess: () => {
      toast.success("Question deleted!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
}

/** Hook to update a predefined question */
export function useUpdateQuestionMutation(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    QuizPublicExtended, // API returns the updated quiz.
    unknown,
    { questionId: string; newText: string },
    { previousQuiz: QuizType | undefined }
  >({
    mutationFn: async ({ questionId, newText }) => {
      if (!quizId) throw new Error("Quiz id is required");
      return await api.host.updatePredefinedQuestion({
        quizId,
        questionId,
        questionUpdate: { text: newText },
      });
    },
    onMutate: async ({ questionId, newText }) => {
      await queryClient.cancelQueries({ queryKey: ["quiz", quizId] });
      const previousQuiz = queryClient.getQueryData<QuizType>(["quiz", quizId]);
      if (previousQuiz) {
        queryClient.setQueryData<QuizType>(["quiz", quizId], (oldQuiz) => {
          if (!oldQuiz) return oldQuiz;
          return {
            ...oldQuiz,
            questions: oldQuiz.questions?.map((q) =>
              q.id === questionId ? { ...q, text: newText } : q,
            ),
          };
        });
      }
      return { previousQuiz };
    },
    onError: (err, variables, context) => {
      if (context?.previousQuiz) {
        queryClient.setQueryData(["quiz", quizId], context.previousQuiz);
      }
      toast.error("Failed to update question");
    },
    onSuccess: () => {
      toast.success("Question updated!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
  });
}
