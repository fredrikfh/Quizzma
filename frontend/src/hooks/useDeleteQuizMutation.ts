import { useMutation } from "@tanstack/react-query";
import { api } from "@/api.ts";
import { toast } from "sonner";
import { queryClient } from "@/App.tsx";
import { useNavigate } from "react-router-dom";

export const useDeleteQuizMutation = () => {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (quizId: string) =>
      api.host.deleteQuiz({
        quizId,
      }),
    mutationKey: ["deleteQuiz"],
    onSuccess: (_data, quizId: string) => {
      toast.success("Quiz deleted successfully.");
      queryClient.invalidateQueries({
        queryKey: ["quiz", quizId],
      });
      navigate("/quiz");
    },
    onError: () => {
      toast.error("Failed to delete quiz.");
    },
  });

  return { mutation };
};
