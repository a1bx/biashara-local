import React from 'react';
import type { PartyDetails } from '../../types';
import { Field } from '../common/Field';

interface CustomerDetailsFormProps {
  value: PartyDetails;
  onChange: (value: PartyDetails) => void;
  title: string;
}

export function CustomerDetailsForm({
  value,
  onChange,
  title
}: CustomerDetailsFormProps) {
  const set = (key: keyof PartyDetails) => (next: string) =>
  onChange({ ...value, [key]: next });

  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2.5 text-xs font-semibold text-ink">{title}</legend>
      <Field label="Name" value={value.name} onChange={set('name')} />
      <Field label="Address" value={value.address} onChange={set('address')} />
      <Field label="Phone" value={value.phone} onChange={set('phone')} />
      <Field
        label="Email"
        type="email"
        value={value.email}
        onChange={set('email')} />
      
    </fieldset>);

}