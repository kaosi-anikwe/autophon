import type React from "react";

import TransChoice from "./TransChoice";
import { useState } from "react";

type TransChoicesProps = {
  onContinue: () => void;
};

type TransChoiceType = {
  title: string;
  video: string;
  isActive: boolean;
  instructions: string;
  fileSystem: React.ReactNode;
};

const TRANSCHOICES: TransChoiceType[] = [
  {
    title: "Experimental Ling A",
    video: "exp-a",
    isActive: false,
    instructions:
      "Transcriptions in a master file absent of time stamps - as separate rows with separate audio files for each transcription.",
    fileSystem: (
      <>
        <p>yourzip.zip</p>
        <p>├ yourtrans.xlsx/tsv/txt</p>
        <p>├ file0001.wav</p>
        <p>├ file0002.wav</p>
        <p>├ file0003.wav</p>
        <p>├ …</p>
        <p>└ file9999.wav</p>
      </>
    ),
  },
  {
    title: "Experimental Ling B",
    video: "exp-b",
    isActive: false,
    instructions:
      "Transcriptions in a master file with start and end time stamps with more than one row per audio file.",
    fileSystem: (
      <>
        <p>yourzip.zip</p>
        <p>├ yourtrans.xlsx/tsv/txt</p>
        <p>├ file01.wav</p>
        <p>├ file02.wav</p>
        <p>├ file03.wav</p>
        <p>├ …</p>
        <p>└ file99.wav</p>
      </>
    ),
  },
  {
    title: "Computational Ling",
    video: "exp-a",
    isActive: true,
    instructions:
      "Transcriptions as separate same-name lab and audio files, absent of time stamps.",
    fileSystem: (
      <>
        <p>yourzip.zip</p>
        <p>├ file0001.lab</p>
        <p>├ file0001.wav</p>
        <p>├ file0002.lab</p>
        <p>├ file0002.wav</p>
        <p>├ file0003.lab</p>
        <p>├ file0003.wav</p>
        <p>├ …</p>
        <p>├ file9999.lab</p>
        <p>└ file9999.wav</p>
      </>
    ),
  },
  {
    title: "Variationist Ling",
    video: "exp-a",
    isActive: false,
    instructions:
      "Longer transcription files in TextGrid, eaf, tsv, txt, or xlsx format with same-name audio files.",
    fileSystem: (
      <>
        <p>yourzip.zip</p>
        <p>├ file01.TextGrid</p>
        <p>├ file01.wav</p>
        <p>├ file02.eaf</p>
        <p>├ file02.wav</p>
        <p>├ file03.tsv</p>
        <p>├ file03.wav</p>
        <p>├ file04.xlsx</p>
        <p>├ file04.wav</p>
        <p>├ …</p>
        <p>├ file99.txt</p>
        <p>└ file99.wav</p>
      </>
    ),
  },
];

export default function TransChoices({ onContinue }: TransChoicesProps) {
  const [transChoices, setTransChoices] =
    useState<TransChoiceType[]>(TRANSCHOICES);

  function handleSelect(title: string) {
    setTransChoices((prevTrans) => {
      return prevTrans.map((trans) => ({
        ...trans,
        isActive: trans.title === title,
      }));
    });
  }

  return (
    <div className="space-y-6">
      {/* Transcription Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Experimental Ling A */}
        {transChoices.map((transChoice) => {
          return (
            <TransChoice
              key={transChoice.title}
              {...transChoice}
              onSelect={() => handleSelect(transChoice.title)}
            >
              {transChoice.fileSystem}
            </TransChoice>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-center space-y-4">
        <p className="text-base-300 text-sm">
          *Audio codecs accepted: WAV, MP3, AVI, M4A, AC-3, AIFF, ALAC, FLAC,
          M4R, OGG, OPUS, WMA
        </p>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <a href="#" className="text-accent hover:underline text-sm">
            download transcription template here
          </a>

          <button 
            className="btn btn-primary font-thin" 
            onClick={onContinue}
            disabled={!transChoices.some(choice => choice.isActive)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
