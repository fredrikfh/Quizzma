import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://backend-openstack.quizzma.no";

export function login(apiKey, email, password) {
    const loginUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const loginPayload = JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true,
    });
    const loginRes = http.post(loginUrl, loginPayload, {
        headers: { "Content-Type": "application/json" },
    });
    check(loginRes, {
        "logged in successfully": (r) =>
            r.status === 200 && r.json("idToken") !== "",
    });
    return loginRes.json("idToken");
}

export function createQuiz(authHeaders, name, description) {
    const quizUrl = `${BASE_URL}/host/quizzes`;
    const quizPayload = JSON.stringify({
        name: name,
        description: description,
    });
    const quizRes = http.post(quizUrl, quizPayload, authHeaders);
    check(quizRes, {
        "quiz created": (r) => r.status === 200 || r.status === 201,
    });
    return quizRes.json().id;
}

export function createSession(authHeaders, quizId) {
    const sessionUrl = `${BASE_URL}/sessions`;
    const sessionPayload = JSON.stringify({ quiz_id: quizId });
    const sessionRes = http.post(sessionUrl, sessionPayload, authHeaders);
    check(sessionRes, {
        "session created": (r) => r.status === 200 || r.status === 201,
    });
    // Some endpoints return `id`, others `sessionId`
    return sessionRes.json().id || sessionRes.json().sessionId;
}

export function publishQuestion(authHeaders, sessionId, quizId, text) {
    const questionUrl = `${BASE_URL}/sessions/${sessionId}/transitions/awaitanswers`;
    const questionPayload = JSON.stringify({
        quiz_id: quizId,
        text: text,
    });
    const questionRes = http.post(questionUrl, questionPayload, authHeaders);
    check(questionRes, {
        "question published": (r) => r.status === 200 || r.status === 201,
    });
    console.log(`Question published: ${JSON.stringify(questionRes.json())}`);
    return questionRes.json().current_question.id;
}

export function killSession(authHeaders, sessionId) {
    const killUrl = `${BASE_URL}/sessions/${sessionId}/kill`;
    const killRes = http.post(
        killUrl,
        JSON.stringify({ session_id: sessionId }),
        authHeaders,
    );
    check(killRes, {
        "kill session sent": (r) => r.status === 200,
    });
    return killRes;
}
