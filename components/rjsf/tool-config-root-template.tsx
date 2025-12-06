import { useState, type ReactNode } from 'react';
import { DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { EditIcon, CheckIcon } from "lucide-react";
import { cn } from '@/lib/utils';

type EditableFieldProps = {
  editing: boolean;
  setEditing: (v: boolean) => void;
  display: ReactNode;
  editor: ReactNode;
  className?: string;
};

const EditableField = ({ editing, setEditing, display, editor, className }: EditableFieldProps) => {
  const toggle = (e: React.MouseEvent) => { e.preventDefault(); setEditing(!editing); };
  const Icon = editing ? CheckIcon : EditIcon;

  return (
    <div className={cn('px-6 flex items-center gap-2 group', className, { 'bg-secondary': editing })}>
      {editing ? <div className="flex-1 py-3">{editor}</div> : display}
      <Button
        variant="link"
        size="inline"
        onClick={toggle}
        className={cn(
          `text-muted-foreground hover:text-foreground flex-shrink-0`,
          { 'opacity-0 group-hover:opacity-100 transition-opacity': !editing },
        )}
      >
        <Icon />
      </Button>
    </div>
  );
};

export const ToolConfigRootTemplate = (props: ObjectFieldTemplateProps) => {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const { properties } = props;
  const typeField        = properties.find(p => p.name === 'type');
  const nameField        = properties.find(p => p.name === 'name');
  const descriptionField = properties.find(p => p.name === 'description');
  const settingsField    = properties.find(p => p.name === 'settings');
  const [type, name, description] = [typeField, nameField, descriptionField].map(field => field?.content.props.formData);

  return (
    <div className="text-sm">
      <div className="space-y-2">
        <EditableField
          editing={editingName}
          setEditing={setEditingName}
          display={<span className="font-bold">{name || type}()</span>}
          editor={nameField?.content}
        />
        <EditableField
          editing={editingDescription}
          setEditing={setEditingDescription}
          display={<span>{description}</span>}
          editor={descriptionField?.content}
        />
      </div>

      {settingsField && (
        <div className="">
          {settingsField.content}
        </div>
      )}
    </div>
  );
};

