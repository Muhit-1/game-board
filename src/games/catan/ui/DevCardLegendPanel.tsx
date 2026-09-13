import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { Panel } from '../../../shared/components/Panel';
import { DevCardLegendEditor } from './DevCardLegendEditor';
import { Layers } from '../../../shared/icons';

export function DevCardLegendPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  return (
    <Panel title="Dev Card Legend" icon={<Layers size={14} />} defaultCollapsed width={320}>
      <DevCardLegendEditor rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
    </Panel>
  );
}
