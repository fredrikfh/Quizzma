import { AnswerPublicExtended } from "@/apiService";

export function calculateSentimentStats(answers: AnswerPublicExtended[]): {
  positive: number;
  neutral: number;
  negative: number;
} {
  if (!answers.length) return { positive: 0, neutral: 0, negative: 0 };

  let totalPositive = 0,
    totalNeutral = 0,
    totalNegative = 0;
  for (const answer of answers) {
    if (answer.sentiment) {
      totalPositive += answer.sentiment.verdict === "Positive" ? 1 : 0;
      totalNeutral += answer.sentiment.verdict === "Neutral" ? 1 : 0;
      totalNegative += answer.sentiment.verdict === "Negative" ? 1 : 0;
    }
  }

  // Normalize to percentage values
  return {
    positive: Math.round((totalPositive / answers.length) * 100),
    neutral: Math.round((totalNeutral / answers.length) * 100),
    negative: Math.round((totalNegative / answers.length) * 100),
  };
}

// In sentimentUtils.ts
export function getDominantSentiment(
  answers: AnswerPublicExtended[],
): "Positive" | "Neutral" | "Negative" {
  const counts = { Positive: 0, Neutral: 0, Negative: 0 };

  answers.forEach((answer) => {
    if (answer.sentiment) {
      counts[answer.sentiment.verdict as "Positive" | "Neutral" | "Negative"]++;
    }
  });

  const total = counts.Positive + counts.Neutral + counts.Negative;
  if (total === 0) {
    return "Neutral";
  }

  const posPct = (counts.Positive / total) * 100;
  const negPct = (counts.Negative / total) * 100;

  // Return "Neutral" if the difference between positive and negative percentages is less than 10%.
  if (Math.abs(posPct - negPct) < 10) {
    return "Neutral";
  }

  // Return "Positive" if it wins and its percentage is at least 15%.
  if (posPct > negPct && posPct >= 15) {
    return "Positive";
  }

  // Return "Negative" if it wins and its percentage is at least 15%.
  if (negPct > posPct && negPct >= 15) {
    return "Negative";
  }

  // Fallback to Neutral if neither condition is met.
  return "Neutral";
}
