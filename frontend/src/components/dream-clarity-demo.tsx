import { useState } from 'react';
import DreamClaritySlider from './dream-clarity-slider';
export default function DreamClarityDemo() {
  const [value, setValue] = useState(2);
  const [committed, setCommitted] = useState(2);
  return <div className="dream-clarity-scope grid gap-6 lg:grid-cols-2">
    <div><DreamClaritySlider defaultValue={2} onValueCommit={setCommitted}/><p className="pt-3 text-sm">非受控模式 · 最近确认：{committed}</p></div>
    <div><DreamClaritySlider value={value} onValueChange={setValue}/><p className="pt-3 text-sm">受控模式 · 当前值：{value}</p></div>
  </div>;
}
