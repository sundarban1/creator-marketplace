import ExploreCreatorsScreen from '@/app/(business)/explore-creators';

// The Find People tab renders the existing creator/service browser rather than
// duplicating it — same screen, now a primary tab per the spec's Service Taker
// navigation (Home | Find People | My Work | Messages | Profile). The
// standalone /(business)/explore-creators route stays reachable from
// saved-creators and the home tiles, which push it onto a stack.
export default function FindPeopleTab() {
  return <ExploreCreatorsScreen showBack={false} />;
}
