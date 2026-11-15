import {
  BookOpen,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  House,
  Info,
  LayoutGrid,
  Newspaper,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

// Iconos usados en la lista del menú móvil (ocultos en tablet/desktop).
const iconByLabel: Record<string, LucideIcon> = {
  Inicio: House,
  Noticias: Newspaper,
  'Mis materias': BookOpen,
  'Mis exámenes': ClipboardList,
  'Mis exámenes como estudiante': ClipboardList,
  'Mis datos': UserRound,
  'Estudiantes de mis materias': Users,
  Información: Info,
  Servicios: LayoutGrid,
  Contenidos: FolderOpen,
  Usuarios: Users,
  Académico: GraduationCap,
  Auditoría: ShieldCheck,
  Colaborador: Handshake,
}

export function getHeaderNavigationIcon(label: string): LucideIcon {
  return iconByLabel[label] ?? FileText
}
