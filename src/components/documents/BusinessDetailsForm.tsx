import type { BusinessProfile } from '../../types';
import { Field } from '../common/Field';

interface BusinessDetailsFormProps {
  value: BusinessProfile;
  onChange: (value: BusinessProfile) => void;
}

export function BusinessDetailsForm({
  value,
  onChange
}: BusinessDetailsFormProps) {
  const set = (key: keyof BusinessProfile) => (next: string) =>
  onChange({ ...value, [key]: next });

  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2.5 text-xs font-semibold text-ink">
        1. Business Details
      </legend>
      <Field label="Business Name" value={value.name} onChange={set('name')} />
      <Field
        label="Business Address"
        value={value.address}
        onChange={set('address')} />
      
      <Field
        label="KRA PIN"
        value={value.kraPin}
        onChange={set('kraPin')}
        hint="Saved locally and reused on your next document." />
      
      <Field label="Phone" value={value.phone} onChange={set('phone')} />
      <Field
        label="Email"
        type="email"
        value={value.email}
        onChange={set('email')} />
      
    </fieldset>);

}