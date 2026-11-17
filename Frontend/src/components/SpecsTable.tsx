import React from 'react';
import type { ItemSpecs } from '../types';

interface SpecsTableProps {
  specs: ItemSpecs;
}

export const SpecsTable: React.FC<SpecsTableProps> = ({ specs }) => {
  const specFields: { key: keyof ItemSpecs; label: string }[] = [
    { key: 'era', label: 'Era / Period' },
    { key: 'origin', label: 'Origin' },
    { key: 'material', label: 'Material' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'condition', label: 'Condition' },
    { key: 'provenance', label: 'Provenance' },
  ];

  const presentSpecs = specFields.filter((f) => !!specs[f.key]);

  if (presentSpecs.length === 0) return null;

  return (
    <div className="w-full text-left">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary pb-1 hairline-b mb-1">
        Item Specifications
      </h3>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {presentSpecs.map((spec) => (
            <tr key={spec.key} className="hairline-b hover:bg-surface/50">
              <td className="py-1.5 pr-4 text-secondary text-xs font-medium w-1/3 sm:w-1/4">
                {spec.label}
              </td>
              <td className="py-1.5 text-primary text-sm font-normal">
                {specs[spec.key]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
