"use client";

import { CharacterSlot } from "./CharacterSlot";
import { DialogueBox } from "./DialogueBox";
import { CHARACTERS } from "./characters";
import type { IntroBeat } from "./script";

interface DialogueSceneProps {
  beat: IntroBeat;
  onAdvance: () => void;
  reducedMotion: boolean;
}

export function DialogueScene({ beat, onAdvance, reducedMotion }: DialogueSceneProps) {
  const speaker = CHARACTERS[beat.speaker];
  const position = beat.position ?? "center";
  const manager = CHARACTERS.manager;
  const lead = CHARACTERS.lead;

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6 sm:gap-10">
      {/* Character row — both mentor + lead are visible; active is highlighted. */}
      <div className="flex w-full items-end justify-between gap-6 px-2 sm:gap-12 sm:px-8">
        <CharacterSlot
          character={manager}
          active={beat.speaker === "manager"}
          side="left"
          reducedMotion={reducedMotion}
        />
        <CharacterSlot
          character={lead}
          active={beat.speaker === "lead"}
          side="right"
          reducedMotion={reducedMotion}
        />
      </div>

      <DialogueBox
        speaker={speaker}
        text={beat.text}
        choice={beat.choice}
        onAdvance={onAdvance}
        reducedMotion={reducedMotion}
      />

      {/* Position is decorative: kept in IntroBeat for future placement variants. */}
      <span className="sr-only">position: {position}</span>
    </div>
  );
}
