interface StepListProps {
  steps: string[];
}

export default function StepList({ steps }: StepListProps) {
  return (
    <ul className="list-none space-y-2.5">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="bg-surfaceHover text-primary w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-text">{step}</span>
        </li>
      ))}
    </ul>
  );
}
