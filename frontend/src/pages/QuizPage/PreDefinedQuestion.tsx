import React, { useState, useMemo, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import debounce from "lodash/debounce";

type QuestionBoxProps = {
  question: { id: string; text: string };
  onDelete: (questionId: string) => void;
  onChange: (questionId: string, newText: string) => void;
};

export function PreDefinedQuestionBox({
  question,
  onDelete,
  onChange,
}: QuestionBoxProps): JSX.Element {
  const [localText, setLocalText] = useState<string>(question.text);

  // If the external question.text prop changes, update local state.
  useEffect(() => {
    setLocalText(question.text);
  }, [question.text]);

  // Create a memoized debounced version of the onChange callback.
  const debouncedOnChange = useMemo(
    () =>
      debounce((value: string) => {
        onChange(question.id, value);
      }, 1000),
    [onChange, question.id],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newText = e.target.value;
    setLocalText(newText);
    debouncedOnChange(newText);
  };

  // Cleanup the debounced function on unmount.
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <div className="relative group border rounded-md p-0 hover:bg-neutral-50">
      <input
        type="text"
        value={localText}
        onChange={handleInputChange}
        placeholder="Enter question text..."
        className="w-full bg-transparent p-4 outline-none"
      />
      <Button
        onClick={() => onDelete(question.id)}
        className="absolute top-2 right-2 text-red-600 hover:bg-neutral-200 bg-neutral-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X />
      </Button>
    </div>
  );
}
