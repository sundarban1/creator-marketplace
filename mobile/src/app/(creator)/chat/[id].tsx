// Same chat screen as the Messages tab's nested route, mounted here in the
// outer (creator) stack instead. Activity Timeline pushes here (not the
// tabs route) so chat sits directly on top of it in a single stack — plain
// back() then naturally pops to activity-timeline, then to whatever opened
// it, with no cross-navigator history reconstruction needed.
export { default } from '../(tabs)/messages/[id]';
