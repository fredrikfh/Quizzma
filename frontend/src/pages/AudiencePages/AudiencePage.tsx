import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Key, X } from "lucide-react";
import { QuestionPublic, SessionPublic, SessionStage } from "@/apiService";
import useAuth from "@/contexts/useAuth.ts";
import { Badge } from "@/components/ui/badge.tsx";

enum ClientSessionMessageType {
  ANSWER = "answer",
}

type AnswerCreate = {
  questionId: string;
  text: string;
};

type ClientSessionMessage = {
  type: ClientSessionMessageType;
  payload?: AnswerCreate;
};

enum ServerSessionMessageType {
  SYNC = "sync",
  ERROR = "error",
}

type SessionErrorPayload = {
  message: string;
  details?: string;
};

type ServerSessionMessage = {
  type: ServerSessionMessageType;
  session: SessionPublic;
  error?: SessionErrorPayload;
};

enum AudienceSessionStage {
  CONNECTING = "connecting",
  WAITING = "waiting",
  QUESTION = "question",
  DISCONNECTED = "disconnected",
}

interface SessionState {
  stage: AudienceSessionStage;
  quizId: string;
  question?: QuestionPublic;
  answer?: AnswerCreate;
  error?: string;
}

export default function AudiencePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser } = useAuth();

  const [sessionId, setSessionId] = useState<string>("----");
  const [state, setState] = useState<SessionState>({
    stage: AudienceSessionStage.CONNECTING,
    quizId: "",
  });
  const prevStage = useRef<AudienceSessionStage>(state.stage);

  /** Get session id from id query parameter and throw error if not set. */
  const getSessionId = useCallback((): string => {
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get("id");
    return sessionId ?? "";
  }, [location]);

  /** Resolve the websocket url. */
  const getSocketUrl = useCallback((): string => {
    const protocol = window.location.protocol === "http:" ? "ws:" : "wss:";
    let hostname: string = import.meta.env.VITE_API_URL || "localhost";
    hostname = hostname.replace("https://", "");
    const port = hostname === "localhost" ? "8000" : window.location.port;

    const sessionId = getSessionId();
    return `${protocol}//${hostname}:${port}/sessions/ws/${encodeURIComponent(sessionId)}`;
  }, [getSessionId]);

  /** Connect websocket to backend */
  const { sendJsonMessage, lastJsonMessage } =
    useWebSocket<ServerSessionMessage>(getSocketUrl, {
      onOpen: () => {
        // Websocket is connected: Start the quiz session.
        const sessionId = getSessionId();
        setSessionId(sessionId);
      },
      onClose: (e) => {
        // Code 1000 means that host killed the session, so we redirect to join page.
        if (e.code === 1000) {
          toast.info("Session ended by host👋");
          navigate(`/join`);
          return;
        }

        // Code 1003 means that there is no session with the given session id.
        if (e.code === 1003) {
          toast.warning("Session does not exist. Try joining again");
          navigate(`/join`);
          return;
        }
      },
      shouldReconnect: (e) => e.code !== 1000,
      reconnectInterval: (attemptNumber) =>
        Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
      reconnectAttempts: 100,
    });

  /** Handle a websocket message */
  useEffect(() => {
    if (!lastJsonMessage) return;

    const { type, session, error } = lastJsonMessage;

    if (type === ServerSessionMessageType.ERROR) {
      console.error(`Error message received: ${error}`);
      toast.warning("Oh! A wild error appeared 😵‍💫 Try refreshing the page");
      return;
    }
    if (type !== ServerSessionMessageType.SYNC) return;

    setState((prev) => {
      const question = session.currentQuestion ?? undefined;
      let stage = prev.stage;
      let answer = prev.answer;

      switch (session.stage) {
        case SessionStage.JoinSession:
          stage = AudienceSessionStage.WAITING;
          answer = undefined;
          break;
        case SessionStage.AskQuestion:
          stage = AudienceSessionStage.WAITING;
          answer = undefined;
          break;
        case SessionStage.AwaitAnswers:
          stage = AudienceSessionStage.QUESTION;
          answer = {
            questionId: question!.id,
            text: "",
          };
          break;
        case SessionStage.ShowAnalyses:
          stage = AudienceSessionStage.WAITING;
          answer = undefined;
          break;
      }

      return {
        ...prev,
        stage: stage,
        quizId: session.quizId,
        question: question,
        answer: answer,
      };
    });
  }, [lastJsonMessage]);

  /** Handle stage transitions */
  useEffect(() => {
    if (prevStage.current === state.stage) return;

    if (
      prevStage.current === AudienceSessionStage.QUESTION &&
      state.stage === AudienceSessionStage.WAITING
    ) {
      toast.info("Moving on 🤸");
    }

    prevStage.current = state.stage;
  }, [state]);

  /** Send the submitted answer to the backend. */
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.answer || state.answer.text.trim() === "") {
      toast.info("You must provide an answer");
      return;
    }

    const message: ClientSessionMessage = {
      type: ClientSessionMessageType.ANSWER,
      payload: state.answer,
    };
    sendJsonMessage(message);

    toast.info("Answer submitted📝");
  };

  const testAnswersAllowedIds = [
    "TqI4VLSqHAhXAxfQDOSMbNfPuBA2",
    "Wjz9leT9SSb8f1gChU76Vy4xYik2",
  ];
  const testAnswers = [
    "I don't get how printing more money causes inflation.",
    "Isn't hyperinflation when prices drop really fast?",
    "Why can't the government just print more money to make everyone richer?",
    "What exactly makes inflation turn into hyperinflation?",
    "Is hyperinflation the same as economic growth?",
    "Why didn’t people just use credit cards during hyperinflation?",
    "Can hyperinflation happen overnight?",
    "Does hyperinflation only happen in poor countries?",
    "How do prices change so fast during hyperinflation?",
    "I thought more money in the economy meant people would be happier.",
    "Why can’t banks just freeze prices to stop inflation?",
    "Do people actually carry cash in wheelbarrows during hyperinflation?",
    "What makes a currency lose trust so quickly?",
    "I don’t understand how a loaf of bread can cost millions.",
    "Why doesn't the government switch to another currency?",
    "Is hyperinflation caused by war?",
    "I thought inflation was always good for the economy?",
    "Can hyperinflation be reversed quickly?",
    "Why do wages not rise along with prices?",
    "I thought only Venezuela had hyperinflation.",
    "Does inflation mean people stop working?",
    "Why do people keep spending money even when prices are skyrocketing?",
    "Can't we just use Bitcoin instead?",
    "Why doesn’t the government just stop printing money?",
    "Is hyperinflation the same as a recession?",
    "Why do people hoard goods during inflation?",
    "I thought hyperinflation only happened in the past.",
    "Does inflation affect everyone equally?",
    "How does inflation affect savings accounts?",
    "Why didn’t they just reset the prices?",
    "What happens to loans during hyperinflation?",
    "Can a country survive hyperinflation?",
    "How does the rest of the world react when one country experiences it?",
    "I thought hyperinflation was caused by high taxes.",
    "What role does trust play in currency value?",
    "Why do people stop using money and start bartering?",
    "What causes hyperinflation to start?",
    "Can hyperinflation be predicted?",
    "Why can't international organizations step in sooner?",
    "Do rich people get richer or poorer during hyperinflation?",
    "How do stores update prices so often?",
    "Why doesn’t the military take over and fix things?",
    "Why don’t countries just use gold instead?",
    "Is it possible to live normally during hyperinflation?",
    "What happens to rent and housing prices?",
    "Does the black market grow during inflation?",
    "How do people buy essentials if money is worthless?",
    "Do other countries try to help?",
    "How long does hyperinflation usually last?",
    "Is hyperinflation contagious between countries?",
    "What happens to foreign investments?",
    "Do people still use banks during hyperinflation?",
    "Is inflation ever a good thing?",
    "Can inflation and unemployment happen together?",
    "Why did people keep accepting worthless money?",
    "What’s the worst case of hyperinflation in history?",
    "I thought prices only go up a little bit each year.",
    "Does inflation mean the country is failing?",
    "Can the economy recover from hyperinflation?",
    "Do all products inflate at the same rate?",
    "Can a new government fix hyperinflation instantly?",
    "Why didn’t people protest more?",
    "Does the value of property change during hyperinflation?",
    "I don't understand what role central banks play.",
    "Why did hyperinflation happen in Zimbabwe?",
    "How does inflation hurt the middle class?",
    "Why is inflation scary for older people?",
    "What happens to retirement savings?",
    "Does inflation affect student loans?",
    "Why doesn’t every country just limit how much money they print?",
    "What causes people to lose faith in currency?",
    "How do you measure inflation accurately?",
    "Can hyperinflation cause a civil war?",
    "Why didn't people leave the country?",
    "Is inflation caused by greed?",
    "Do salaries ever catch up to prices?",
    "I don’t get why prices change every day.",
    "What role does supply and demand play?",
    "Can a new currency solve the issue?",
    "Why didn’t they just use the U.S. dollar?",
    "How do companies survive hyperinflation?",
    "Do people still have jobs?",
    "How are international prices affected?",
    "Why didn’t they use coins instead of bills?",
    "What happens to contracts during inflation?",
    "Can digital money help stop inflation?",
    "Does inflation affect imports and exports?",
    "Is inflation just a numbers problem?",
    "Can AI help prevent future inflation?",
    "Does education about inflation help reduce it?",
    "Is inflation always bad?",
    "Why did people lose everything?",
    "What’s the connection between inflation and debt?",
    "Why do some countries never experience hyperinflation?",
    "Can inflation be a political weapon?",
    "Is there a safe investment during inflation?",
    "Why are groceries always first to inflate?",
    "How do you plan a budget during hyperinflation?",
    "Is bartering legal?",
    "Why did some people become rich from hyperinflation?",
    "What happens to the stock market?",
    "Does hyperinflation affect healthcare access?",
    "Why didn’t people just stop using money?",
    "Can inflation make people leave cities?",
    "Do schools close during economic collapse?",
    "Does crime increase during hyperinflation?",
    "How do people pay taxes if money is worthless?",
    "Is inflation part of capitalism?",
    "Can hyperinflation be planned or staged?",
    "Is inflation related to population growth?",
    "Why did Germany experience it in the 1920s?",
    "What’s the fastest inflation rate recorded?",
    "Why do people keep working during inflation?",
    "Can inflation lead to dictatorship?",
    "Do religious groups get involved?",
    "How are children affected?",
    "Why do some people laugh about inflation?",
    "How do you explain inflation to kids?",
    "What happens to charities?",
    "Do countries fake inflation numbers?",
    "What’s the link between inflation and trust?",
    "Why do prices jump but not fall back?",
    "How are exchange rates involved?",
    "Is it better to spend or save?",
    "How did people survive?",
    "Why did money become cheaper than toilet paper?",
    "Does printing money always cause inflation?",
    "How do governments try to hide inflation?",
    "Can inflation be fixed with laws?",
    "How do you stabilize a currency?",
    "Do inflation rates affect voting?",
    "Why do prices go up so unevenly?",
    "Why did people burn money?",
    "What happens to foreign tourists?",
    "Why do stores raise prices daily?",
    "How did inflation affect farmers?",
    "Why didn’t people invest in other assets?",
    "Can inflation be used as a tool?",
    "Why do inflation numbers differ between sources?",
    "Do people still pay bills?",
    "How did hyperinflation affect schools?",
    "How do you calculate inflation percentages?",
    "Why doesn’t inflation fix itself?",
    "Why did the government deny the inflation?",
    "What is the tipping point for hyperinflation?",
    "Can social media spread panic about inflation?",
    "Why didn’t the media warn people earlier?",
    "Does inflation ever make a comeback?",
    "Can inflation be part of a conspiracy?",
    "Why do prices seem random during inflation?",
    "How do banks survive hyperinflation?",
    "Why is inflation harder on the poor?",
    "What’s the psychological effect of hyperinflation?",
    "How do companies keep track of their profits?",
    "Why did money printing get out of hand?",
    "What are inflation-indexed bonds?",
    "Can inflation be stopped with a speech?",
    "Why are price tags useless during inflation?",
    "Is there any benefit to hyperinflation?",
    "How do people protect their savings?",
    "Why did some people ignore the inflation?",
    "How do countries regain trust after inflation?",
    "Can teachers be paid fairly during inflation?",
    "Do people still go on vacations?",
    "Can you have inflation in a digital-only economy?",
  ];

  const handleSubmitAllTestAnswers = async () => {
    if (!state.question) {
      toast.error("No active question");
      return;
    }

    for (let i = 0; i < testAnswers.length; i++) {
      const message: ClientSessionMessage = {
        type: ClientSessionMessageType.ANSWER,
        payload: {
          questionId: state.question.id,
          text: testAnswers[i],
        },
      };
      sendJsonMessage(message);
      toast(`Sent test answer ${i + 1}`);
      await new Promise((r) => setTimeout(r, 100));
    }

    toast.success("All test answers submitted!");
  };

  return (
    <>
      {/* Header */}
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex flex-col items-center">
            <Badge variant={"secondary"} className="rounded gap-2 truncate">
              <Key className={"w-4"} /> {sessionId}
            </Badge>
          </div>
          <div className={"flex items-center gap-2"}>
            <Button variant="ghost" onClick={() => navigate("/audience/join")}>
              <X />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-lg mx-auto px-4 py-8">
        {/* Stage specific rendering */}
        {state.stage === AudienceSessionStage.CONNECTING && (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Connecting...</h2>
          </div>
        )}

        {state.stage === AudienceSessionStage.DISCONNECTED && (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Disconnected ⛓️‍💥</h2>
            <p className="text-muted-foreground">
              {state.error ??
                "Try refreshing the page or rejoining the session."}
            </p>
            <Button onClick={() => navigate("/join")}>Leave 🏃‍➡️</Button>
          </div>
        )}

        {state.stage === AudienceSessionStage.WAITING && (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">You are all set</h2>
            <p className="text-muted-foreground">
              Wait for your host to ask a new question
            </p>
          </div>
        )}

        {state.stage === AudienceSessionStage.QUESTION && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                {state.question?.text ?? "Host must resubmit the question"}
              </h2>
            </div>
            <form
              onKeyDown={(e) => {
                if (
                  e.target instanceof HTMLElement &&
                  e.target.tagName === "TEXTAREA" &&
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  if (e.currentTarget.reportValidity()) {
                    handleSubmitAnswer(e);
                  }
                }
              }}
              onSubmit={handleSubmitAnswer}
              className="space-y-4"
            >
              <textarea
                required
                className="w-full min-h-[150px] p-3 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                placeholder="Type your answer"
                value={state.answer?.text}
                onChange={(e) => {
                  setState((prev) => {
                    const answer = state.answer
                      ? { ...state.answer, text: e.target.value }
                      : undefined;
                    return { ...prev, answer: answer };
                  });
                }}
              />
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
            {currentUser &&
              testAnswersAllowedIds.includes(currentUser?.uid) && (
                <Button
                  variant="outline"
                  onClick={handleSubmitAllTestAnswers}
                  className="w-full"
                >
                  Submit Many Test Answers 🧪
                </Button>
              )}
          </div>
        )}
      </main>
    </>
  );
}
