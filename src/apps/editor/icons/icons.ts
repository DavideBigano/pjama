/**
 * The editor's icons, named after what they stand for rather than what they depict.
 * Import icons from here, never from `lucide-react` directly, so each concept keeps one icon.
 */
import {
    Box,
    Braces,
    ClipboardCheck,
    Code,
    Cpu,
    FlaskConical,
    ListChecks,
    type LucideIcon,
    PanelsTopLeft,
    Paperclip,
    Plug,
    Route,
    Scale,
    User,
} from 'lucide-react';

export type { LucideIcon as Icon } from 'lucide-react';
export {
    ArrowRightLeft as RelationshipIcon,
    Box as ComponentIcon,
    Braces as TypeIcon,
    ChevronDown as SuggestionsIcon,
    ClipboardCheck as ReviewIcon,
    Code as SnippetIcon,
    Cpu as TechnologyIcon,
    Ellipsis as MenuIcon,
    FlaskConical as TestIcon,
    GitMerge as DerivationIcon,
    ListChecks as RequirementIcon,
    PanelsTopLeft as MockupIcon,
    Paperclip as ResourceIcon,
    Plug as InterfaceIcon,
    Plus as AddIcon,
    Route as UseCaseIcon,
    Scale as DecisionIcon,
    ShieldAlert as UnenforcedIcon,
    ShieldCheck as EnforcedIcon,
    Tag as CategoryIcon,
    Trash2 as DeleteIcon,
    User as ActorIcon,
    X as RemoveIcon,
} from 'lucide-react';

const ITEM_TYPE_ICONS: Record<string, LucideIcon> = {
    '@pjama/component': Box,
    '@pjama/requirement': ListChecks,
    '@pjama/use-case': Route,
    '@pjama/interface': Plug,
    '@pjama/snippet': Code,
    '@pjama/type': Braces,
    '@pjama/mockup': PanelsTopLeft,
    '@pjama/technology': Cpu,
    '@pjama/actor': User,
    '@pjama/resource': Paperclip,
    '@pjama/decision': Scale,
    '@pjama/review': ClipboardCheck,
    '@pjama/test': FlaskConical,
};

/** The icon of a primary item type, if it has one. */
export function findItemIcon(type: string): LucideIcon | undefined {
    return ITEM_TYPE_ICONS[type];
}
