import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { Progress } from "@/components/ui/progress.tsx";
import { Key, Pause, Play, User, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api.ts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/App.tsx";
import QrCodeDisplay from "@/utils/qrCodeDisplay.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import OverallAnalysis from "@/pages/QuizPage/AnalysisElements/OverallAnalysis.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DetailedAnalysis from "@/pages/QuizPage/AnalysisElements/DetailedAnalysis.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";
import { AnswerGrid } from "@/pages/QuizPage/AnalysisElements/components/AnswerGrid";

enum Stage {
  JoinSession = "JOIN_SESSION",
  AskQuestion = "ASK_QUESTION",
  AwaitAnswers = "AWAIT_ANSWERS",
  ShowAnalyses = "SHOW_ANALYSES",
  ShowDetailedAnalysis = "SHOW_DETAILED_ANALYSIS",
}

export default function QuizTeacherPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [stage, setStage] = useState<Stage>(Stage.JoinSession);
  const [question, setQuestion] = useState("");
  const [predefinedQuestions, setPredefinedQuestions] = useState<
    { id: string; text: string; asked: boolean }[]
  >([]);
  const [selectedPredefinedQuestion, setSelectedPredefinedQuestion] = useState<
    string | null
  >(null);

  const [timer, setTimer] = useState(0);
  const timerInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentDuration = useRef(120);
  const [selectedDuration, setSelectedDuration] = useState(120);
  const [isPaused, setIsPaused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [endQuizDialogOpen, setEndQuizDialogOpen] = useState(false);

  const { data: quiz, isSuccess: isSuccessQuiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      return await api.host.getQuiz({ quizId: id! });
    },
  });

  const { data: session } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      return await api.sessions.getSessionByQuiz({ quizId: id! });
    },
    refetchInterval:
      stage === Stage.AwaitAnswers || stage === Stage.JoinSession
        ? 1500
        : false,
  });

  const askQuestionMutation = useMutation({
    mutationFn: async () => {
      await api.sessions.askQuestionTransition({
        sessionId: session!.id.toString(),
      });
    },
  });

  const awaitAnswersMutation = useMutation({
    mutationFn: async (question: string) => {
      await api.sessions.awaitAnswersTransition({
        sessionId: session!.id.toString(),
        questionCreate: {
          quizId: id!,
          text: question,
        },
      });
    },
  });

  const showAnalysesMutation = useMutation({
    mutationFn: async () => {
      await api.sessions.showAnalysesTransition({
        sessionId: session!.id.toString(),
      });
    },
  });

  const { data: overallAnalysis, isLoading: isLoadingOverallAnalysis } =
    useQuery({
      queryKey: ["overallAnalysis", id],
      queryFn: async () => {
        return await api.sessions.overallAnalysis({
          sessionId: session!.id.toString(),
        });
      },
      enabled: !!session?.id && stage === Stage.ShowAnalyses,
      refetchOnWindowFocus: false,
    });

  const { data: detailedAnalysis, isLoading: isLoadingDetailedAnalysis } =
    useQuery({
      queryKey: ["detailedAnalysis", id],
      queryFn: async () => {
        return await api.sessions.detailedAnalysis({
          sessionId: session!.id.toString(),
        });
      },
      enabled: !!session?.id && stage === Stage.ShowDetailedAnalysis,
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    // Clear interval on unmount to avoid memory leak
    return () => clearInterval(timerInterval.current);
  }, []);

  useEffect(() => {
    if (stage !== Stage.AwaitAnswers) return;

    if (timerInterval.current === undefined && timer > 0 && !isPaused) {
      timerInterval.current = setInterval(
        () => setTimer((prev) => prev - 1),
        1000,
      );
      return;
    }

    if (timerInterval.current !== undefined && (timer <= 0 || isPaused)) {
      clearInterval(timerInterval.current);
      timerInterval.current = undefined;

      if (timer <= 0) {
        setStage(Stage.ShowAnalyses);
        showAnalysesMutation.mutate();

        void queryClient.removeQueries({
          queryKey: ["detailedAnalysis", id],
        });

        void queryClient.removeQueries({
          queryKey: ["overallAnalysis", id],
        });

        void queryClient.prefetchQuery({
          queryKey: ["detailedAnalysis", id],
          queryFn: async () => {
            return await api.sessions.detailedAnalysis({
              sessionId: session!.id.toString(),
            });
          },
        });
      }
    }
  }, [timer, stage, showAnalysesMutation, id, session, isPaused]);

  useEffect(() => {
    if (!isSuccessQuiz) return;

    setPredefinedQuestions(
      quiz
        .questions!.filter((question) => question.predefined)
        .map((question) => ({
          id: question.id,
          text: question.text,
          asked: false,
        })),
    );
  }, [quiz, isSuccessQuiz]);

  if (session === undefined) return <div>Loading...</div>;
  const sessionCode = session.id;

  const endSession = () => {
    void api.sessions.killSession({ sessionId: sessionCode.toString() });
    navigate("/");
  };

  const handlePublish = () => {
    // If a predefined question was used, mark it as asked.
    if (selectedPredefinedQuestion) {
      setPredefinedQuestions((prev) => {
        const index = prev.findIndex(
          (question) => question.id === selectedPredefinedQuestion,
        );
        prev[index].asked = true;
        return prev;
      });
      setSelectedPredefinedQuestion(null);
    }

    setStage(Stage.AwaitAnswers);
    awaitAnswersMutation.mutate(question);
    currentDuration.current = selectedDuration;
    setTimer(currentDuration.current);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed w-full h-[4.5rem] border-b p-4 z-[1000] bg-background">
        <div className="container mx-auto flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center">
            <div className="flex flex-row items-center gap-2">
              <div className={" rounded-lg h-[4.3rem] w-[4.3rem] my-[-20px]"}>
                <QrCodeDisplay dynamicId={sessionCode.toString()} />
              </div>
              <Badge variant={"secondary"} className="rounded gap-2 truncate">
                <Key className={"w-4"} /> {sessionCode}
              </Badge>
              <Badge variant={"secondary"} className="rounded gap-2 truncate">
                <User className={"w-4"} /> {session.audienceCount}
              </Badge>
            </div>
          </div>

          {/* Middle Section (Progress & Timer) */}
          {timer / currentDuration.current > 0 && (
            <div className="flex items-center gap-2 w-[500px] justify-center">
              <Progress
                value={(timer / currentDuration.current) * 100}
                className=" max-w-xl border"
              ></Progress>
              <Button variant="ghost" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play /> : <Pause />}
                <span className={"inline-block min-w-10 text-center"}>
                  {timer}s
                </span>
              </Button>
            </div>
          )}

          {/* Right Section (Button) */}
          <div className="flex items-center gap-2">
            {stage === Stage.AwaitAnswers && (
              <Button onClick={() => setTimer(0)} disabled={isPaused}>
                Move on &rarr;
              </Button>
            )}
            {(stage === Stage.ShowAnalyses ||
              stage === Stage.ShowDetailedAnalysis) && (
              <>
                <Button
                  variant={"ghost"}
                  onClick={() => {
                    setStage(
                      stage === Stage.ShowAnalyses
                        ? Stage.ShowDetailedAnalysis
                        : Stage.ShowAnalyses,
                    );
                  }}
                >
                  <Switch checked={stage === Stage.ShowDetailedAnalysis} />
                  View as groups
                </Button>
                <Button
                  onClick={() => {
                    setStage(Stage.AskQuestion);
                    setQuestion("");
                    askQuestionMutation.mutate();
                  }}
                >
                  Ask New Question &rarr;
                </Button>
              </>
            )}
            {stage === Stage.JoinSession && (
              <Button
                onClick={() => {
                  setStage(Stage.AskQuestion);
                  askQuestionMutation.mutate();
                }}
              >
                Start session &rarr;
              </Button>
            )}
            <Dialog
              open={endQuizDialogOpen}
              onOpenChange={setEndQuizDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="ghost">
                  <X /> End quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>End quiz</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to end the quiz session?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={endSession}>End quiz</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          "flex flex-col grow container mx-auto items-center p-4 pt-[5.5rem]",
          stage === Stage.AskQuestion && "justify-end",
        )}
      >
        {stage === Stage.JoinSession && (
          <div className="flex flex-col items-center justify-center text-center space-y-20 min-w-[500px] flex-1">
            <div>
              <h3 className="text-5xl">
                Join at <b>quizzma.no/join</b>
              </h3>
              <Badge
                variant={"secondary"}
                className="font-light text-5xl rounded-lg p-3 mt-6 "
              >
                {sessionCode}
              </Badge>
            </div>
            <div className={"w-[300px] justify-center"}>
              <i className={"text-3xl"}>or scan QR-code</i>
              <QrCodeDisplay dynamicId={sessionCode.toString()} />
            </div>
          </div>
        )}

        {stage === Stage.AskQuestion && (
          <div className="flex flex-col space-y-6 max-w-4xl mx-auto w-full grow">
            {/* Predefined questions */}
            <div
              className="w-full max-h-[50vh] space-y-2 overflow-y-auto scroll"
              style={{ scrollbarWidth: "thin" }}
            >
              <TooltipProvider>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full overflow-y-auto overscroll-contain"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {predefinedQuestions
                    .filter((question) => question.text.trim().length > 0)
                    .map((question, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <button
                            className={`rounded-lg hover:bg-accent p-2 ${
                              question.asked
                                ? "bg-neutral-100 line-through italic"
                                : "bg-background"
                            } text-xs border shadow-sm w-full flex items-center justify-start text-left`}
                            onClick={() => {
                              setQuestion(question.text);
                              setSelectedPredefinedQuestion(question.id);
                              inputRef.current?.focus();
                            }}
                          >
                            {question.text}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>
                          <p className="text-xs">Copy to question field</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                </div>
              </TooltipProvider>
            </div>

            <div className="flex flex-col grow gap-4 justify-end pb-20">
              {/* Question Input */}
              <form onSubmit={handlePublish} className="flex gap-3 w-full">
                <Input
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question"
                  className="text-lg py-[22px] rounded shadow-sm"
                />

                {/* Countdown Duration Select */}
                <div className="flex flex-col gap-2">
                  <Select
                    onValueChange={(value) =>
                      setSelectedDuration(Number(value))
                    }
                  >
                    <SelectTrigger className="w-[100px] py-[22px]">
                      <SelectValue
                        placeholder={
                          selectedDuration > 90
                            ? `${Math.round(selectedDuration / 60)} min`
                            : `${selectedDuration}s`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30s</SelectItem>
                      <SelectItem value="60">60s</SelectItem>
                      <SelectItem value="90">90s</SelectItem>
                      <SelectItem value="120">2 min</SelectItem>
                      <SelectItem value="180">3 min</SelectItem>
                      <SelectItem value="240">4 min</SelectItem>
                      <SelectItem value="300">5 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="lg" disabled={!question.trim()}>
                  Publish →
                </Button>
              </form>
            </div>
          </div>
        )}

        {stage === Stage.AwaitAnswers && (
          <div className="flex flex-col w-full h-full">
            {/* Question */}
            <div className="flex items-center justify-center h-[calc(50vh-8rem)] w-full">
              <h1 className="text-5xl font-bold text-start">{question}</h1>
            </div>

            {/* Answers */}
            <div className="flex flex-col space-y-4 h-[calc(50vh-2rem)] w-full">
              <AnswerGrid
                answers={session.currentAnswers}
                showAsDefault={false}
              />
            </div>
          </div>
        )}

        {stage === Stage.ShowAnalyses && (
          <OverallAnalysis
            id={session.id.toString()}
            question={session.currentQuestion?.text}
            rawAnswers={session.currentAnswers}
            summary={overallAnalysis?.summary}
            answers={overallAnalysis?.answers}
            isLoading={isLoadingOverallAnalysis}
          />
        )}
        {stage === Stage.ShowDetailedAnalysis && (
          <DetailedAnalysis
            id={session.id}
            topics={detailedAnalysis?.topics}
            question={session.currentQuestion?.text}
            isLoading={isLoadingDetailedAnalysis}
          />
        )}
      </main>
    </div>
  );
}
