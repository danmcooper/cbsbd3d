import { useRoute } from './router';
import Archive from './screens/Archive';
import Play from './screens/Play';

export default function App() {
  const route = useRoute();
  // Keyed by date so switching puzzles starts a fresh game rather than
  // carrying the previous one's state into it.
  return route.kind === 'play' ? <Play key={route.date} date={route.date} /> : <Archive />;
}
