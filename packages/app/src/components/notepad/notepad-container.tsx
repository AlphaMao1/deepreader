import { useState } from "react";
import { NotepadContent } from "./notepad-content";

interface NotepadContainerProps {
  bookId: string;
}

export const NotepadContainer = ({ bookId }: NotepadContainerProps) => {
  const [showDigest, setShowDigest] = useState(false);

  return (
    <div className="flex h-full flex-col bg-background">
      <NotepadContent
        bookId={bookId}
        showDigest={showDigest}
        onOpenDigest={() => setShowDigest(true)}
        onCloseDigest={() => setShowDigest(false)}
      />
    </div>
  );
};
