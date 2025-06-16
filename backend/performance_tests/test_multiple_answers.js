import ws from "k6/ws";
import { sleep } from "k6";
import * as api from "./api.js";

const WS_BASE_URL = __ENV.WS_BASE_URL || "wss://backend-openstack.quizzma.no";

export const options = {
  scenarios: {
    listeners: {
      executor: "per-vu-iterations",
      vus: 150,
      iterations: 1,
      maxDuration: "3m",
      exec: "listeners",
    },
    publisher: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "3m",
      exec: "publisher",
    },
  },
};

export function setup() {
  const apiKey = __ENV.FIREBASE_API_KEY;
  const email = __ENV.TEST_USER_EMAIL;
  const password = __ENV.TEST_USER_PASSWORD;
  const idToken = api.login(apiKey, email, password);

  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  };

  const quizId = api.createQuiz(
      authHeaders,
      "Test Quiz Persistent",
      "Test Description for persistent test",
  );
  const sessionId = api.createSession(authHeaders, quizId);
  console.log(`Setup: Session ID: ${sessionId}`);

  return { sessionId, quizId, authHeaders };
}

export function listeners(data) {
  let lastQuestionId = null; // track the last question we answered
  let numberOfAnswers = 0; // track the number of answers sent
  const { sessionId } = data;
  const wsUrl = `${WS_BASE_URL}/sessions/ws/${sessionId}`;
  console.log(`VU ${__VU}: Connecting to ${wsUrl}`);

  ws.connect(wsUrl, {}, (socket) => {
    socket.on("open", () => {
      console.log(`VU ${__VU}: WebSocket connection open.`);
    });

    socket.on("message", (msg) => {
      console.log(`VU ${__VU}: Received message: ${msg.slice(0, 100)}...`);

      try {
        const parsed = JSON.parse(msg);
        const qid = parsed.session?.currentQuestion?.id;

        // Only answer when it's a sync for a new question ID
        if (parsed.type === "sync" && qid && qid !== lastQuestionId) {
          lastQuestionId = qid;

          // random delay so all listeners finish within 10s
          const delay = Math.random() * 9 + 1;
          sleep(delay);

          const answerPayload = JSON.stringify({
            type: "answer",
            payload: {
              questionId: qid,
              text: "Persistent answer",
            },
          });
          socket.send(answerPayload);
            numberOfAnswers++;
          console.log(
              `VU ${__VU}: Sent answer for question ${qid} after ${delay.toFixed(2)}s delay.`
          );
          console.log(`VU ${__VU}: Total answers sent: ${numberOfAnswers}`);
        }
      } catch (e) {
        console.error(`VU ${__VU}: Error parsing message: ${msg}`);
      }
    });

    socket.on("close", () => {
      console.log(`VU ${__VU}: WebSocket connection closed.`);
    });

    socket.on("error", (e) => {
      console.error(`VU ${__VU}: WebSocket error: ${e}`);
    });

    socket.setTimeout(() => {
      console.log(`VU ${__VU}: Closing WebSocket connection after timeout.`);
      socket.close();
    }, 3 * 60 * 1000);
  });

  sleep(180);
}

export function publisher(data) {
  const { sessionId, quizId, authHeaders } = data;
  // Publish 10 questions with a 15-second interval (10s to answer + 5s gap)
  for (let i = 0; i < 10; i++) {
    const questionText = `What is 2+2? (Question ${i + 1})`;
    api.publishQuestion(authHeaders, sessionId, quizId, questionText);
    console.log(`Publisher: Published question ${i + 1}`);
    sleep(15);
  }
}

export function teardown(data) {
  const { sessionId, authHeaders } = data;
  api.killSession(authHeaders, sessionId);
  console.log("Teardown: Sent kill HTTP request.");
}
