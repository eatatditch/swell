"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  addQuizOption,
  createQuestion,
  deleteQuestion,
  deleteQuizOption,
  updateQuestion,
  updateQuizOption,
} from "@/components/training/content-actions";
import {
  TRAINING_QUESTION_KIND_LABELS,
  TRAINING_QUESTION_KINDS,
} from "@/lib/constants/training";
import { cn } from "@/lib/utils";
import type {
  TrainingQuestionKind,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from "@/lib/types/database";

interface QuestionEditorProps {
  quizId: string;
  questions: (TrainingQuizQuestion & { options: TrainingQuizOption[] })[];
}

export function QuestionEditor({ quizId, questions }: QuestionEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function removeQuestion(id: string) {
    if (!confirm("Delete this question and all its options?")) return;
    startTransition(async () => {
      await deleteQuestion(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </p>
        <NewQuestionDialog
          quizId={quizId}
          nextPosition={
            (questions[questions.length - 1]?.position ?? 0) + 10
          }
        />
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add the first question to make this quiz playable.
        </p>
      ) : (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Q{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {TRAINING_QUESTION_KIND_LABELS[q.kind]}
                  </p>
                  <p className="mt-0.5 font-medium leading-snug">
                    {q.prompt}
                  </p>
                  {q.explanation ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      {q.explanation}
                    </p>
                  ) : null}
                  {q.kind === "short_answer" ? (
                    <p className="mt-2 text-xs">
                      <span className="text-muted-foreground">
                        Accepted:{" "}
                      </span>
                      <span className="font-mono">
                        {q.correct_text ?? "—"}
                      </span>
                    </p>
                  ) : (
                    <OptionEditor question={q} options={q.options} />
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <EditQuestionDialog question={q} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(q.id)}
                    disabled={pending}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NewQuestionDialog({
  quizId,
  nextPosition,
}: {
  quizId: string;
  nextPosition: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TrainingQuestionKind>("multiple_choice");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [correctText, setCorrectText] = useState("");
  const [options, setOptions] = useState<
    { label: string; isCorrect: boolean }[]
  >([
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setKind("multiple_choice");
    setPrompt("");
    setExplanation("");
    setCorrectText("");
    setOptions([
      { label: "", isCorrect: true },
      { label: "", isCorrect: false },
    ]);
    setError(null);
  }

  function changeKind(k: TrainingQuestionKind) {
    setKind(k);
    if (k === "true_false") {
      setOptions([
        { label: "True", isCorrect: true },
        { label: "False", isCorrect: false },
      ]);
    } else if (k === "multiple_choice") {
      setOptions([
        { label: "", isCorrect: true },
        { label: "", isCorrect: false },
      ]);
    } else {
      setOptions([]);
    }
  }

  function setOption(i: number, patch: Partial<{ label: string; isCorrect: boolean }>) {
    setOptions((prev) =>
      prev.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    );
  }

  function pickCorrect(i: number) {
    setOptions((prev) => prev.map((o, j) => ({ ...o, isCorrect: j === i })));
  }

  function addOption() {
    setOptions((prev) => [...prev, { label: "", isCorrect: false }]);
  }
  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, j) => j !== i));
  }

  function submit() {
    setError(null);
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }
    if (kind === "short_answer" && !correctText.trim()) {
      setError("Add at least one accepted answer (pipe-separated for multiple)");
      return;
    }
    if (kind !== "short_answer") {
      if (options.some((o) => !o.label.trim())) {
        setError("Every option needs a label");
        return;
      }
      if (!options.some((o) => o.isCorrect)) {
        setError("Mark exactly one option as correct");
        return;
      }
    }

    startTransition(async () => {
      const res = await createQuestion({
        quizId,
        kind,
        prompt,
        explanation: explanation || null,
        position: nextPosition,
        correctText: kind === "short_answer" ? correctText : null,
        options: kind === "short_answer" ? [] : options,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New question</DialogTitle>
          <DialogDescription>
            Pick a type, write the prompt, define the answer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nq-kind">Type</Label>
            <select
              id="nq-kind"
              value={kind}
              onChange={(e) => changeKind(e.target.value as TrainingQuestionKind)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {TRAINING_QUESTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {TRAINING_QUESTION_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nq-prompt">Prompt</Label>
            <Textarea
              id="nq-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          {kind === "short_answer" ? (
            <div className="space-y-2">
              <Label htmlFor="nq-correct">Accepted answers</Label>
              <Input
                id="nq-correct"
                value={correctText}
                onChange={(e) => setCorrectText(e.target.value)}
                placeholder="pipe|separated|like|this"
              />
              <p className="text-xs text-muted-foreground">
                Case-insensitive substring match. Any one is enough.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Options</Label>
              <ul className="space-y-2">
                {options.map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={
                        o.isCorrect ? "Marked correct" : "Mark correct"
                      }
                      onClick={() => pickCorrect(i)}
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                        o.isCorrect
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-muted-foreground/40",
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      value={o.label}
                      onChange={(e) =>
                        setOption(i, { label: e.target.value })
                      }
                      placeholder={`Option ${i + 1}`}
                      readOnly={kind === "true_false"}
                    />
                    {kind === "multiple_choice" && options.length > 2 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(i)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {kind === "multiple_choice" && options.length < 8 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Option
                </Button>
              ) : null}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="nq-explanation">Explanation (optional)</Label>
            <Textarea
              id="nq-explanation"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Shown after grading."
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Create question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditQuestionDialog({
  question,
}: {
  question: TrainingQuizQuestion;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [correctText, setCorrectText] = useState(question.correct_text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateQuestion({
        id: question.id,
        prompt,
        explanation: explanation || null,
        correctText:
          question.kind === "short_answer" ? correctText || null : null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Edit question"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit question</DialogTitle>
          <DialogDescription>
            Type can&apos;t be changed — delete and recreate to switch types.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="eq-prompt">Prompt</Label>
            <Textarea
              id="eq-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          {question.kind === "short_answer" ? (
            <div className="space-y-2">
              <Label htmlFor="eq-correct">Accepted answers</Label>
              <Input
                id="eq-correct"
                value={correctText}
                onChange={(e) => setCorrectText(e.target.value)}
                placeholder="pipe|separated"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="eq-explanation">Explanation</Label>
            <Textarea
              id="eq-explanation"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionEditor({
  question,
  options,
}: {
  question: TrainingQuizQuestion;
  options: TrainingQuizOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function setCorrect(id: string) {
    startTransition(async () => {
      await Promise.all([
        // Clear any existing correct flag on this question.
        ...options
          .filter((o) => o.id !== id && o.is_correct)
          .map((o) => updateQuizOption({ id: o.id, isCorrect: false })),
        updateQuizOption({ id, isCorrect: true }),
      ]);
      router.refresh();
    });
  }
  function rename(id: string, label: string) {
    startTransition(async () => {
      await updateQuizOption({ id, label });
      router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteQuizOption(id);
      router.refresh();
    });
  }
  function add() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      await addQuizOption({
        questionId: question.id,
        label: newLabel,
        isCorrect: false,
        position: (options[options.length - 1]?.position ?? 0) + 10,
      });
      setNewLabel("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {options.map((o) => (
        <li key={o.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCorrect(o.id)}
            disabled={pending}
            aria-label={o.is_correct ? "Correct" : "Mark correct"}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
              o.is_correct
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input",
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
          </button>
          <input
            defaultValue={o.label}
            onBlur={(e) => {
              if (e.target.value !== o.label) rename(o.id, e.target.value);
            }}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          {question.kind === "multiple_choice" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(o.id)}
              disabled={pending}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              aria-label="Remove option"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </li>
      ))}
      {question.kind === "multiple_choice" ? (
        adding ? (
          <li className="flex items-center gap-2">
            <span className="inline-block h-6 w-6 shrink-0" />
            <Input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") {
                  setNewLabel("");
                  setAdding(false);
                }
              }}
              placeholder="New option"
              className="h-7"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={add}
              disabled={pending || !newLabel.trim()}
            >
              Add
            </Button>
          </li>
        ) : (
          <li>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Option
            </Button>
          </li>
        )
      ) : null}
    </ul>
  );
}
