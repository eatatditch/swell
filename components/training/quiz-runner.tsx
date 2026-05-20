"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitQuiz, type QuizSubmitResult } from "@/components/training/actions";
import { cn } from "@/lib/utils";
import type {
  TrainingQuizOption,
  TrainingQuizQuestion,
} from "@/lib/types/database";

interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    retryLimit: number;
  };
  questions: (TrainingQuizQuestion & { options: TrainingQuizOption[] })[];
  attemptsTaken: number;
  bestScore: number | null;
}

export function QuizRunner({
  quiz,
  questions,
  attemptsTaken,
  bestScore,
}: QuizRunnerProps) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const limitReached =
    quiz.retryLimit > 0 && attemptsTaken >= quiz.retryLimit;

  if (!started && !result) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{quiz.title}</p>
            {quiz.description ? (
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {questions.length} questions · pass at {quiz.passingScore}%
            {quiz.retryLimit > 0
              ? ` · ${attemptsTaken}/${quiz.retryLimit} attempts`
              : ""}
            {bestScore != null ? ` · best ${bestScore}%` : ""}
          </p>
        </div>
        {limitReached ? (
          <Alert variant="destructive">
            <AlertDescription>
              You&apos;ve used all your attempts. Ask a manager to reset.
            </AlertDescription>
          </Alert>
        ) : (
          <Button
            onClick={() => {
              setStarted(true);
              setStartedAt(new Date().toISOString());
            }}
            disabled={questions.length === 0}
          >
            {attemptsTaken > 0 ? "Retake quiz" : "Start quiz"}
          </Button>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <ResultView
        result={result}
        questions={questions}
        userAnswers={answers}
        passingScore={quiz.passingScore}
        canRetry={
          !result.passed &&
          (quiz.retryLimit === 0 ||
            (result.attemptsRemaining ?? 0) > 0)
        }
        onRetry={() => {
          setResult(null);
          setAnswers({});
          setIndex(0);
          setStartedAt(new Date().toISOString());
        }}
        onDone={() => {
          router.refresh();
        }}
      />
    );
  }

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz({
        quizId: quiz.id,
        startedAt: startedAt ?? new Date().toISOString(),
        answers,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>{answeredCount} answered</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-semibold leading-snug">
          {current.prompt}
        </h3>

        {current.kind === "multiple_choice" ? (
          <div className="mt-4 space-y-2">
            {current.options.map((opt) => {
              const selected = answers[current.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswer(current.id, opt.id)}
                  className={cn(
                    "block w-full rounded-lg border-2 p-3 text-left text-sm transition-colors",
                    selected
                      ? "border-accent bg-accent/5"
                      : "border-input hover:border-muted-foreground/30",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {current.kind === "true_false" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {current.options.map((opt) => {
              const selected = answers[current.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswer(current.id, opt.id)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors",
                    selected
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-input text-foreground hover:border-muted-foreground/30",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {current.kind === "short_answer" ? (
          <Textarea
            className="mt-4"
            rows={3}
            value={answers[current.id] ?? ""}
            onChange={(e) => setAnswer(current.id, e.target.value)}
            placeholder="Type your answer"
          />
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0 || pending}
        >
          Previous
        </Button>

        <div className="flex gap-1">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              aria-label={`Question ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                i === index
                  ? "bg-accent"
                  : answers[q.id]
                    ? "bg-primary/60"
                    : "bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        {index < questions.length - 1 ? (
          <Button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="gap-1"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={!allAnswered || pending}
          >
            {pending ? "Submitting…" : "Submit quiz"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ResultViewProps {
  result: QuizSubmitResult;
  questions: (TrainingQuizQuestion & { options: TrainingQuizOption[] })[];
  userAnswers: Record<string, string>;
  passingScore: number;
  canRetry: boolean;
  onRetry: () => void;
  onDone: () => void;
}

function ResultView({
  result,
  questions,
  userAnswers,
  passingScore,
  canRetry,
  onRetry,
  onDone,
}: ResultViewProps) {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border bg-card p-6 text-center",
          result.passed
            ? "border-primary/40 bg-primary/5"
            : "border-rose-300 bg-rose-50/60 dark:bg-rose-950/30",
        )}
      >
        {result.passed ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-rose-600" />
        )}
        <h3 className="mt-2 font-display text-xl font-black">
          {result.passed ? "You passed" : "Not quite"}
        </h3>
        <p className="mt-1 text-4xl font-semibold tabular-nums">
          {result.score}%
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.passed
            ? "Nice work."
            : `You need ${passingScore}% to pass.`}
        </p>
      </div>

      <ul className="space-y-2">
        {questions.map((q, i) => {
          const fb = result.feedback[q.id];
          const given = userAnswers[q.id] ?? "";
          const givenLabel =
            q.kind === "short_answer"
              ? given
              : q.options.find((o) => o.id === given)?.label ?? "—";
          return (
            <li
              key={q.id}
              className={cn(
                "rounded-lg border-l-4 bg-card p-3",
                fb?.correct ? "border-l-primary" : "border-l-rose-500",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Q{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.prompt}</p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Your answer: </span>
                    <span className="font-medium">{givenLabel || "—"}</span>
                  </p>
                  {!fb?.correct && fb?.correctText ? (
                    <p className="mt-0.5 text-sm text-primary">
                      Correct: <span className="font-medium">{fb.correctText}</span>
                    </p>
                  ) : null}
                  {fb?.explanation ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      {fb.explanation}
                    </p>
                  ) : null}
                </div>
                {fb?.correct ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        {canRetry ? (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
        ) : null}
        <Button variant="default" onClick={onDone}>
          Back to lesson
        </Button>
      </div>
    </div>
  );
}
