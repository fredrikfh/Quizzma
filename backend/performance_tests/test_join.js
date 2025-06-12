import { sleep } from "k6";
import ws from "k6/ws";
import * as api from "./api.js";

const WS_BASE_URL = __ENV.WS_BASE_URL || "wss://backend-openstack.quizzma.no";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 150 },
    { duration: "30s", target: 0 },
  ]
};

function sendAnswer(sessionId, questionId, message) {
  const wsUrl = `${WS_BASE_URL}/sessions/ws/${sessionId}`;
  console.log(`VU ${__VU}: Connecting to ${wsUrl} for sending answer.`);
  ws.connect(wsUrl, {}, (socket) => {
    let errorDetected = false;

    socket.on("open", () => {
      console.log(
          `VU ${__VU}: WebSocket connection OPEN for session ${sessionId}`,
      );
    });

    socket.on("message", (msg) => {
      console.log(`VU ${__VU}: Received message: ${msg}`);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) {
          errorDetected = true;
          console.error(`VU ${__VU}: Error in response: ${parsed.error}`);
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

    // Wait 1 second for any error messages before closing the socket.
    socket.setTimeout(() => {
      if (!errorDetected) {
        console.log(`VU ${__VU}: No error message received, closing socket.`);
      }
      socket.close();
    }, 1000);
  });
}


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

  const quizId = api.createQuiz(authHeaders, "Test Quiz", "Test Description");
  console.log(`Setup: Quiz ID: ${quizId}`);

  const sessionId = api.createSession(authHeaders, quizId);
  console.log(`Setup: Session ID: ${sessionId}`);

  const questionId = api.publishQuestion(authHeaders, sessionId, quizId, "What is 2+2?");
  console.log(`Setup: Question ID: ${questionId}`);

  return { sessionId, questionId, authHeaders };
}

export default function (data) {
  const { sessionId, questionId } = data;
  console.log(`VU ${__VU}: Starting default iteration...`);
  sendAnswer(sessionId, questionId, "ALORS");
  sleep(1);
}

export function teardown(data) {
  const { sessionId, authHeaders } = data;
  api.killSession(authHeaders, sessionId);
  console.log("Teardown: kill HTTP request sent.");
}
