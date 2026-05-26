declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  type Icon = FC<IconProps>;

  export const Home: Icon;
  export const Users: Icon;
  export const FileText: Icon;
  export const Sparkles: Icon;
  export const BookOpen: Icon;
  export const Settings: Icon;
  export const LogOut: Icon;
  export const Plus: Icon;
  export const Search: Icon;
  export const MoreVertical: Icon;
  export const Calendar: Icon;
  export const Clock: Icon;
  export const Upload: Icon;
  export const File: Icon;
  export const X: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Check: Icon;
  export const Minus: Icon;
  export const Download: Icon;
  export const Trash2: Icon;
  export const Edit3: Icon;
  export const Edit2: Icon;
  export const Eye: Icon;
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const Loader2: Icon;
  export const RefreshCw: Icon;
  export const ArrowLeft: Icon;
  export const Info: Icon;
  export const CheckCircle: Icon;
  export const XCircle: Icon;
  export const Save: Icon;
  export const Printer: Icon;
  export const HelpCircle: Icon;
  export const Menu: Icon;
}
