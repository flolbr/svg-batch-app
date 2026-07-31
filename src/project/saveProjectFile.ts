export type ProjectFileWritable = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
  abort?: () => Promise<void>;
};

export type ProjectFileHandle = {
  createWritable: () => Promise<ProjectFileWritable>;
};

export type ShowSaveProjectFilePicker = (options: {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<ProjectFileHandle>;

type SaveProjectWithFilePickerInput = {
  html: string;
  suggestedName: string;
  existingHandle?: ProjectFileHandle;
  showSaveFilePicker: ShowSaveProjectFilePicker;
};

export async function saveProjectWithFilePicker({
  html,
  suggestedName,
  existingHandle,
  showSaveFilePicker,
}: SaveProjectWithFilePickerInput): Promise<ProjectFileHandle> {
  const handle =
    existingHandle ??
    (await showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: "HTML files",
          accept: { "text/html": [".html"] },
        },
      ],
    }));
  const writable = await handle.createWritable();

  try {
    await writable.write(new Blob([html], { type: "text/html;charset=utf-8" }));
    await writable.close();
  } catch (error) {
    try {
      await writable.abort?.();
    } catch {
      // The original write or close error is the actionable one.
    }

    throw error;
  }

  return handle;
}
