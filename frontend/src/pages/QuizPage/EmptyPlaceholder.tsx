import React from "react";

interface EmptyPlaceholderProps {
  title?: string;
  description?: string;
}

const EmptyPlaceholder: React.FC<EmptyPlaceholderProps> = ({
  title = "No Predefined Questions",
  description = 'Click the "Create new question" button above to add your first question.',
}) => {
  return (
    <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center text-gray-500 bg-neutral-50">
      <p className="mb-2 font-semibold">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
};

export default EmptyPlaceholder;
