import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useNavigate } from "react-router-dom";
import { QuizPublic } from "@/apiService";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api.ts";

export const QuizElement = ({ quiz }: { quiz: QuizPublic }) => {
  const navigate = useNavigate();

  const { data: quizData } = useQuery({
    queryKey: ["quiz", quiz.id],
    queryFn: async () => {
      return await api.host.getQuiz({ quizId: quiz.id });
    },
  });

  // loop through each question and count the number of answers
  const answersCount =
    quizData?.questions?.reduce(
      (acc, question) => acc + (question.answers?.length ?? 0),
      0,
    ) ?? 0;

  return (
    <Card
      className="flex flex-col items-start p-2 gap-2 min-w-[200px] hover:cursor-pointer hover:bg-neutral-50"
      onClick={() => navigate(`/quiz/${quiz.id}`)}
    >
      <h4 className="font-medium">{quiz.name}</h4>
      <p className={"text-left text-gray-500 text-sm"}>
        {quiz.description || "No description"}
      </p>

      {answersCount > 0 && (
        <Badge variant="secondary" className={"rounded-md"}>
          {answersCount} response{answersCount !== 1 ? "s" : ""}
        </Badge>
      )}
    </Card>
  );
};
