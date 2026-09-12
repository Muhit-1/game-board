import type { HarborType, ResourceType } from '../types';

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  forest: 'var(--res-forest)',
  pasture: 'var(--res-pasture)',
  fields: 'var(--res-fields)',
  hills: 'var(--res-hills)',
  mountains: 'var(--res-mountains)',
  desert: 'var(--res-desert)',
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  forest: 'Forest',
  pasture: 'Pasture',
  fields: 'Fields',
  hills: 'Hills',
  mountains: 'Mountains',
  desert: 'Desert',
};

export const HARBOR_LABELS: Record<HarborType, string> = {
  generic: '3:1',
  wood: '2:1 Wood',
  brick: '2:1 Brick',
  ore: '2:1 Ore',
  grain: '2:1 Grain',
  wool: '2:1 Wool',
};

export const HARBOR_RATIO: Record<HarborType, string> = {
  generic: '3:1',
  wood: '2:1',
  brick: '2:1',
  ore: '2:1',
  grain: '2:1',
  wool: '2:1',
};

const HARBOR_RESOURCE_COLOR: Partial<Record<HarborType, string>> = {
  wood: RESOURCE_COLORS.forest,
  brick: RESOURCE_COLORS.hills,
  grain: RESOURCE_COLORS.fields,
  wool: RESOURCE_COLORS.pasture,
  ore: RESOURCE_COLORS.mountains,
};

export function harborColor(type: HarborType): string {
  return HARBOR_RESOURCE_COLOR[type] ?? 'var(--brass-soft)';
}
