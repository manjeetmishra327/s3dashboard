import Link from "next/link";
import {
  Briefcase,
  Users,
  TrendingUp,
  FileText,
  User,
} from "lucide-react";

const ICONS_BY_NAME = {
  briefcase: Briefcase,
  users: Users,
  "trending-up": TrendingUp,
  "file-text": FileText,
  user: User,
};

export function EmptyState({ icon, title, description, action }) {
  const Icon = ICONS_BY_NAME[icon] || FileText;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-4">{description}</p>
      {action ? (
        <Link href={action.href} className="btn-primary">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
