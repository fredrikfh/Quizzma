import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuizElement } from "@/pages/QuizPage/QuizElement.tsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api.ts";
import { toast } from "sonner";
import { queryClient } from "@/App.tsx";
import EmptyPlaceholder from "@/pages/QuizPage/EmptyPlaceholder.tsx";
import { PlusCircleIcon } from "lucide-react";

interface QuizCreateVariables {
  name: string;
  description: string;
}

interface QuizResponse {
  id: string;
}

const QuizPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createQuizDialogOpen, setCreateQuizDialogOpen] = useState(false);

  const createNewQuiz = useMutation<QuizResponse, Error, QuizCreateVariables>({
    mutationFn: async ({ name, description }: QuizCreateVariables) => {
      return await api.host.createQuiz({
        quizCreate: { name, description },
      });
    },
    onSuccess: () => {
      toast.success("Quiz created!");
      void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: () => {
      toast.error("Failed to create quiz");
    },
  });

  const getQuizzes = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => await api.host.getAllQuizzes(),
  });

  const createQuiz = (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim() === "") {
      toast.warning("Title cannot be blank");
      return;
    }

    createNewQuiz.mutate(
      { name: title, description },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setCreateQuizDialogOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-2 items-start mt-8">
      <div className="flex flex-row justify-between w-full items-center">
        <h1>Quizzes</h1>
        <Dialog
          open={createQuizDialogOpen}
          onOpenChange={setCreateQuizDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              Create new quiz <PlusCircleIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New quiz</DialogTitle>
              <DialogDescription>
                Create a new quiz. What a way to start the day!
              </DialogDescription>
            </DialogHeader>
            <form
              id="create-quiz-form"
              onSubmit={createQuiz}
              className="grid gap-4 py-4"
            >
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Title
                </Label>
                <Input
                  id="name"
                  placeholder="Name of the quiz"
                  className="col-span-3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  className="col-span-3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </form>
            <DialogFooter>
              <Button type="submit" form="create-quiz-form">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {getQuizzes.isLoading && <div>Loading...</div>}
      {getQuizzes.isError && <div>Error loading quizzes</div>}
      {getQuizzes.isSuccess && (
        <>
          {getQuizzes.data?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 w-full items-stretch">
              {getQuizzes.data.map((quiz) => (
                <QuizElement quiz={quiz} key={quiz.id} />
              ))}
            </div>
          ) : (
            <div className="w-full mt-16 flex justify-center">
              <EmptyPlaceholder
                title="No quizzes found"
                description="Click the 'Create new quiz' button to create one."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuizPage;
