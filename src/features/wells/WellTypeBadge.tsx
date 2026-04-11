import { type Well } from '@/src/db/schema';

interface WellTypeBadgeProps {
  wellType: Well['wellType'];
}

export function WellTypeBadge({ wellType }: WellTypeBadgeProps) {
  const config = {
    rod_pump: {
      label: 'Rod Pump',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    esp: {
      label: 'ESP',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    gas_lift: {
      label: 'Gas Lift',
      className: 'bg-green-100 text-green-700 border-green-200',
    },
    swd: {
      label: 'SWD',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  };

  const { label, className } = config[wellType];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
