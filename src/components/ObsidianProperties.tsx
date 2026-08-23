import type { ObsidianProperty } from '../lib/obsidian';

interface ObsidianPropertiesProps {
  properties: ObsidianProperty[];
}

export default function ObsidianProperties({
  properties,
}: ObsidianPropertiesProps) {
  if (properties.length === 0) return null;
  return (
    <dl className="obsidian-properties" aria-label="Document properties">
      {properties.map((property) => (
        <div key={`${property.key}:${property.value}`}>
          <dt>{property.key}</dt>
          <dd>{property.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
