import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api.ts";

export function useSession() {
  const { id } = useParams();
  return useQuery({
    queryKey: ["session", id],
    queryFn: async () => await api.sessions.getSessionByQuiz({ quizId: id! }),
    refetchOnWindowFocus: false,
  });
}
