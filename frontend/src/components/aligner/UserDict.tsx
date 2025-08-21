import { AxiosError } from "axios";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Info, ChevronDown, Upload } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

import { Modal } from "../ui/Modal";
import dictVideo from "../../assets/dict.webm";
import { useToast } from "@/contexts/ToastContext";
import { DictUploadModal } from "../modals/DictUploadModal";
import dictReverseVideo from "../../assets/dict-reverse.webm";
import type { Dictionary, User, Task, Language } from "../../types/api";
import { languagesAPI, dictionaryAPI, profileAPI, api } from "../../lib/api";

interface UserDictProps {
  user: User;
}

export default function UserDict({ user }: UserDictProps) {
  const [videoStarted, setVideoStarted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [videoOffset, setVideoOffset] = useState(-15);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    null
  );
  const [selectedDictionary, setSelectedDictionary] =
    useState<Dictionary | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customPronunciations, setCustomPronunciations] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [invalidPhones, setInvalidPhones] = useState(false);
  const [contentKey, setContentKey] = useState(0); // Force re-render key
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dictContentRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Function to preserve cursor position during state updates
  const preserveCursorPosition = useCallback((updateFn: () => void) => {
    if (!dictContentRef.current) {
      updateFn();
      return;
    }

    const selection = window.getSelection();
    let cursorOffset = 0;
    let targetNode: Node | null = null;

    // Save current cursor position
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      targetNode = range.startContainer;
      cursorOffset = range.startOffset;
    }

    // Update the state
    updateFn();

    // Restore cursor position after state update
    setTimeout(() => {
      if (dictContentRef.current && targetNode && selection) {
        try {
          const range = document.createRange();

          // Try to find the same text node or a suitable replacement
          let nodeToUse = targetNode;
          if (!dictContentRef.current.contains(targetNode)) {
            // If the original node is no longer in the DOM, use the first text node
            const walker = document.createTreeWalker(
              dictContentRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            nodeToUse = walker.nextNode() || dictContentRef.current;
          }

          // Ensure cursor offset doesn't exceed text length
          const maxOffset =
            nodeToUse.nodeType === Node.TEXT_NODE
              ? nodeToUse.textContent?.length || 0
              : 0;
          const safeOffset = Math.min(cursorOffset, maxOffset);

          if (nodeToUse.nodeType === Node.TEXT_NODE && maxOffset > 0) {
            range.setStart(nodeToUse, safeOffset);
            range.setEnd(nodeToUse, safeOffset);
          } else {
            // Fallback: place cursor at the end
            range.selectNodeContents(dictContentRef.current);
            range.collapse(false);
          }

          selection.removeAllRanges();
          selection.addRange(range);
        } catch (error) {
          console.warn("Could not restore cursor position:", error);
        }
      }
    }, 0);
  }, []);

  // Helper function to check if user_id cookie exists (for anonymous uploads)
  const hasUserIdCookie = () => {
    return document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("user_id="));
  };

  // Only fetch tasks if user is authenticated OR has user_id cookie (anonymous upload)
  const shouldFetchTasks = user?.uuid !== undefined || hasUserIdCookie();

  // Query to fetch current tasks to check for processing status
  const { data: currentTasks } = useQuery<Task[]>({
    queryKey: ["tasks", user?.uuid],
    staleTime: 2 * 1000, // 2 seconds for real-time feel
    enabled: shouldFetchTasks, // Only fetch when user is authenticated or has user_id cookie
    refetchInterval: 5000, // Check every 5 seconds for processing tasks
    queryFn: async () => {
      const response = await api.get("/tasks");
      return response.data.tasks;
    },
  });

  // Check if any tasks are currently being processed
  const hasProcessingTasks =
    currentTasks?.some(
      (task) =>
        task.task_status === "uploading" ||
        task.task_status === "aligned" ||
        task.task_status === "processing"
    ) || false;

  // Handle clicks when tasks are processing
  const handleBlockedAction = useCallback(() => {
    toast.error(
      "Please wait for your current tasks to finish processing before using the Custom Pronunciations feature.",
      "Feature temporarily unavailable"
    );
  }, [toast]);

  const selectLanguage = useCallback(
    async (language: Language) => {
      // Prevent language selection when tasks are processing
      if (hasProcessingTasks) {
        handleBlockedAction();
        return;
      }
      setSelectedLanguage(language);
      // setSearchTerm(language.display_name);
      setShowDropdown(false);
      setSelectedIndex(-1);
      setShowVideo(false);
      setInvalidPhones(false);

      // Fetch existing dictionary for this language
      setIsLoading(true);
      setIsEditable(false); // Reset to read-only when loading new content
      try {
        const dictData = await dictionaryAPI.getUserDictionaryByLanguage(
          language.code
        );
        setCustomPronunciations(dictData.content || "");
        setSelectedDictionary(dictData);
        setContentKey((prev) => prev + 1); // Force re-render with new content
      } catch (error) {
        console.error("Failed to load dictionary:", error);
        setCustomPronunciations(""); // Start with empty if no dictionary exists
      } finally {
        setIsLoading(false);
      }
    },
    [handleBlockedAction, hasProcessingTasks]
  );

  function checkPhones(text: string) {
    let valid = true;
    const dictcustom_lines = text.split("\n");
    const invalidPhones = [];
    for (let i = 0; i < dictcustom_lines.length; i++) {
      let line = dictcustom_lines[i].trim();
      if (line != "") {
        const line_phones = line.split(/\s+/);
        // const word = line_phones[0];
        const phones = line_phones.slice(1);
        const newPhones = [];
        for (let j = 0; j < phones.length; j++) {
          const phone = phones[j].trim();
          if (phone != "" && !selectedDictionary?.phones.includes(phones[j])) {
            invalidPhones.push(phone);
            valid = false;
            newPhones[j] =
              '<span style="color:red;font-weight:bold;">' +
              phones[j] +
              "</span>";
          } else {
            // Otherwise, just copy the phone as-is
            newPhones[j] = phones[j];
          }
        }
        const newLine = newPhones.join(" ");
        dictcustom_lines[i] = newLine;
        line = newLine;
      }
    }
    // highlight invalid phones
    if (invalidPhones.length > 0) {
      // Create a regular expression to match wrong phones
      const escapedChars = escapeRegexChars(invalidPhones);
      const regex = new RegExp(`${escapedChars}`, "g");

      // Highlight wrong phones by wrapping them in a <span> with a red background
      const highlightedContent = customPronunciations.replace(
        regex,
        (match) => {
          return `<span class="rounded bg-error/40">${match}</span>`;
        }
      );

      // Set the highlighted content back to the textbox
      setCustomPronunciations(highlightedContent);
      setInvalidPhones(true);
    }
    return valid;
  }

  function escapeRegexChars(chars: string[]) {
    return chars
      .map((char) => char.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
      .join("|");
  }

  // Load languages on component mount
  const { data: allLanguagesResponse, error: allLanguagesError } = useQuery({
    queryKey: ["homepage-languages"],
    queryFn: languagesAPI.getDictLanguages,
    staleTime: 10 * 60 * 1000, // 10 minutes - languages don't change frequently
    retry: 2,
  });

  // Handle languages data and errors in useEffect to prevent infinite rerenders
  useEffect(() => {
    if (allLanguagesResponse) {
      setLanguages(allLanguagesResponse.languages);
    }
  }, [allLanguagesResponse]);

  useEffect(() => {
    if (allLanguagesError) {
      toast.error(allLanguagesError.message, "Failed to get languages.");
      console.error("Failed to load languages", allLanguagesError);
    }
  }, [allLanguagesError, toast]);

  // Filter languages based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Show first 6 languages when no search term
      const defaultLanguages = languages.slice(0, 6);
      setFilteredLanguages(defaultLanguages);
      setShowDropdown(showDropdown && defaultLanguages.length > 0);
      return;
    }

    const filtered = languages.filter(
      (lang) =>
        lang.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.language_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ensure we show at least 6 languages, fill with non-matching ones if needed
    const finalFiltered =
      filtered.length >= 6
        ? filtered
        : [
            ...filtered,
            ...languages
              .filter((lang) => !filtered.includes(lang))
              .slice(0, 6 - filtered.length),
          ];

    setFilteredLanguages(finalFiltered);
    setShowDropdown(finalFiltered.length > 0);
    setSelectedIndex(-1);
  }, [searchTerm, languages, showDropdown]);

  // Video looping logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo || !videoStarted) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;

      if (isClosing) {
        // Closing animation - reverse the offset calculation
        // At start (0s): dictionary open and centered (offset = 0px)
        // At end (6s): dictionary closed and centered (offset = -75px)
        const progress = currentTime / 6;
        const offset = 0 + -15 * progress;
        setVideoOffset(offset);

        if (currentTime >= 6) {
          // Reset all states
          setIsClosing(false);
          setVideoStarted(false);
          setAnimationComplete(false);
          setSelectedLanguage(null);
          setSearchTerm("");
          setCustomPronunciations("");
          setShowDropdown(false);
          setSelectedIndex(-1);
          setIsEditable(false); // Reset editable state
          setVideoOffset(-15); // Reset to closed centered position
          video.currentTime = 0;
          video.pause();

          // Reload video with opening animation source
          setTimeout(() => {
            video.load();
          }, 100);
        }
        return;
      }

      // Opening animation - calculate offset to keep dictionary centered
      if (!animationComplete && currentTime < 5) {
        // From 0s to 5s: dictionary moves from closed to open
        // At start (0s): dictionary closed and centered (offset = -75px)
        // At 5s: dictionary open and centered (offset = 0px)
        const progress = Math.min(currentTime / 5, 1);
        const offset = -15 + 15 * progress;
        setVideoOffset(offset);
      }

      if (!animationComplete && currentTime >= 5) {
        // First playthrough - mark animation as complete and start looping
        setAnimationComplete(true);
        setVideoOffset(0); // Keep dictionary open and centered

        // Check if user has default dictionary
        if (user?.dict_default) {
          const defaultLang = languages.find(
            (lang) => lang.code === user.dict_default
          );
          if (defaultLang) {
            // Auto-select default language
            selectLanguage(defaultLang);
          } else {
            // Default not found, show input field
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 100);
          }
        } else {
          // No default dictionary, show input field
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        }
      }

      if (animationComplete && currentTime >= 6) {
        // Loop from 5 to 6 seconds after initial animation
        video.currentTime = 5;
        // Don't call play() here as it causes an extra playthrough
      }
    };

    const handleLoadedData = () => {
      if (videoStarted) {
        video.currentTime = 0;
        video.playbackRate = 5; // Set 5x speed
        // Only auto-play if we're closing or if animation hasn't completed yet
        if (isClosing || videoStarted || !animationComplete) {
          video.play().catch(console.error);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadeddata", handleLoadedData);

    // Start the video if it's loaded and video has been started
    if (video.readyState >= 2 && videoStarted) {
      video.currentTime = 0;
      video.playbackRate = 5; // Set 5x speed
      // Only auto-play if we're closing or if animation hasn't completed yet
      if (isClosing || videoStarted || !animationComplete) {
        video.play().catch(console.error);
      }
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [
    showVideo,
    videoStarted,
    animationComplete,
    isClosing,
    user.dict_default,
    languages,
    selectLanguage,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!showDropdown || filteredLanguages.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredLanguages.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredLanguages.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredLanguages.length) {
            selectLanguage(filteredLanguages[selectedIndex]);
            setSearchTerm("");
          }
          break;
        case "Escape":
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showDropdown, filteredLanguages, selectedIndex, selectLanguage]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent interaction when tasks are processing
    if (hasProcessingTasks) {
      handleBlockedAction();
      return;
    }
    setSearchTerm(e.target.value);
  };

  const handleVideoClick = () => {
    // Prevent interaction when tasks are processing
    if (hasProcessingTasks) {
      handleBlockedAction();
      return;
    }

    if (!videoStarted) {
      setVideoStarted(true);
    } else if (!selectedLanguage && animationComplete) {
      searchInputRef.current?.focus();
    }
  };

  const handleClose = () => {
    // Start closing animation
    setIsClosing(true);
    setShowVideo(true);
    setVideoStarted(true);
    setVideoOffset(0); // Start with dictionary open and centered

    // Wait for video source to change, then start playing
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.load(); // Reload video with new source
        video.currentTime = 0;
        video.playbackRate = 3; // Set 3x speed
        video.play().catch(console.error);
      }
    }, 50);
  };

  const handlePasteWithLimit = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text/plain");
    const currentContent = customPronunciations;
    const newContent = currentContent + pastedText;

    if (newContent.length > 50000) {
      toast.error(
        "Content exceeds the 50,000 character limit (including whitespaces).",
        "Size limit exceeded"
      );
      return;
    }

    setCustomPronunciations(newContent);
    // Update the contentEditable div
    const target = e.target as HTMLDivElement;
    target.textContent = newContent;
  };

  const handleUploadFromModal = async (content: string) => {
    setCustomPronunciations(content);
    setContentKey((prev) => prev + 1); // Force re-render
    setIsEditable(false); // Keep read-only during save
    await handleSave(content); // Pass the new content directly
  };

  const handleSave = async (contentOverride?: string) => {
    const contentToSave = contentOverride || customPronunciations;
    if (!selectedLanguage || !contentToSave.trim()) {
      toast.error("Please enter some pronunciations before saving.");
      return;
    }

    setIsSaving(true);
    try {
      // Format text content to remove line numbers
      let text: string;
      if (contentOverride) {
        // Use the override content directly (already formatted from upload)
        text = contentOverride;
      } else if (dictContentRef.current) {
        // Get text from the contentEditable div
        text = dictContentRef.current.innerText
          .replace(/\u00A0/g, "")
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => line.replace(/^\d+/, "").trim())
          .join("\n");
      } else {
        console.log("Dict ref not established");
        toast.error("Please try again.");
        return;
      }

      // Check valid phones
      const valid = checkPhones(text);
      if (valid) {
        await dictionaryAPI.uploadDictionary(
          selectedLanguage.code,
          text,
          "replace" // Default mode when clicking save is replace
        );

        // Update user's default dictionary to the selected language
        try {
          await profileAPI.updateProfile({
            dict_default: selectedLanguage.code,
          });
          toast.success("Dictionary saved and set as default!");
        } catch (profileError) {
          // Dictionary was saved successfully, but updating default failed
          console.error("Failed to update default dictionary:", profileError);
          toast.success(
            "Dictionary saved successfully! (Note: Could not set as default)"
          );
        }

        await selectLanguage(selectedLanguage);
      } else {
        toast.error(
          "Please review your entries. Consult the user guides if neccessary",
          "Invalid phones detected"
        );
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message, "Failed to save dictionary");
        console.error("Failed to save dictionary: ", error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInfoClick = () => {
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      modalVideoRef.current.currentTime = 0;
    }
    setShowVideoModal(false);
  };

  useEffect(() => {
    if (showVideoModal && modalVideoRef.current) {
      modalVideoRef.current.currentTime = 0;
      modalVideoRef.current.play();
    }
  }, [showVideoModal]);

  return (
    <div
      className={`card shadow-lg space-y-4 bg-base-100 border border-base-200 p-4 transition-all duration-500 ease-in-out col-span-12 ${
        selectedLanguage && !isClosing ? "md:col-span-8" : "md:col-span-4"
      } ${hasProcessingTasks ? "opacity-60 cursor-not-allowed" : ""}`}
      onClick={hasProcessingTasks ? handleBlockedAction : undefined}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center">
          <h3 className="text-lg font-bold mr-4">Your Custom Pronunciations</h3>
          <div
            className="tooltip"
            data-tip="Click to watch instructional video"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Info
                className="w-5 h-5 cursor-pointer hover:text-primary transition-colors"
                onClick={handleInfoClick}
              />
            </motion.div>
          </div>
        </div>

        {/* Processing Tasks Notification */}
        {hasProcessingTasks && (
          <div className="alert text-sm py-2">
            <svg
              className="stroke-current shrink-0 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span>
              Custom Pronunciations feature is temporarily unavailable while
              tasks are being processed.
            </span>
          </div>
        )}

        {/* Video Animation */}
        {showVideo && (
          <div className="tooltip tooltip-right" data-tip="Click me!">
            <motion.div
              className="relative flex flex-col items-center transition-all duration-300 ease-in-out"
              onClick={handleVideoClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                y: !videoStarted ? [0, -8, 0] : 0,
              }}
              transition={{
                y: {
                  duration: 2.5,
                  repeat: !videoStarted ? Infinity : 0,
                  ease: "easeInOut",
                },
                scale: {
                  duration: 0.2,
                },
              }}
            >
              <motion.video
                ref={videoRef}
                className="w-auto h-[25rem] cursor-pointer object-contain max-h-80 transition-all duration-300 ease-in-out"
                muted
                playsInline
                preload="auto"
                whileHover={{
                  filter: "brightness(1.1) saturate(1.1)",
                }}
                transition={{
                  filter: { duration: 0.3 },
                }}
                style={{
                  transform: `translateX(${videoOffset}%)`,
                  transition: videoStarted
                    ? "none"
                    : "transform 0.3s ease-in-out",
                }}
              >
                <source
                  src={isClosing ? dictReverseVideo : dictVideo}
                  type="video/webm"
                />
                Your browser does not support the video tag.
              </motion.video>

              {/* Language Search Input Overlay - only show after animation completes and no default language */}
              {!selectedLanguage && animationComplete && (
                <div
                  className="absolute top-8 left-[100%] transform -translate-x-1/2 w-96 transition-all duration-300 ease-in-out animate-fade-in"
                  ref={dropdownRef}
                >
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onFocus={() => {
                        if (hasProcessingTasks) {
                          handleBlockedAction();
                          return;
                        }
                        setSearchTerm("");
                        setShowDropdown(true);
                      }}
                      onChange={handleSearchChange}
                      placeholder="Search languages..."
                      className={`input input-bordered w-full bg-base-100/90 backdrop-blur-sm ${
                        hasProcessingTasks ? "cursor-not-allowed" : ""
                      }`}
                      autoComplete="off"
                      disabled={hasProcessingTasks}
                    />
                    <ChevronDown className="absolute right-3 top-2/3 transform -translate-y-1/2 w-4 h-4 text-base-content/60" />

                    {/* Language Dropdown */}
                    {showDropdown && filteredLanguages.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                        {filteredLanguages.map((language, index) => (
                          <div
                            key={language.id}
                            className={`px-4 py-2 cursor-pointer flex items-center space-x-3 ${
                              index === selectedIndex
                                ? "bg-primary text-primary-content"
                                : "hover:bg-base-200"
                            }`}
                            onClick={() => selectLanguage(language)}
                          >
                            {/* Language Flag */}
                            <img
                              src={`/langs/${language.code}/${language.code}_flag_50.png`}
                              alt={`${language.display_name} flag`}
                              className="w-6 h-6 object-cover rounded-sm flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {language.display_name}
                              </div>
                              <div className="text-sm opacity-70">
                                {language.language_name}
                              </div>
                            </div>
                            <div className="text-xs opacity-60 font-mono">
                              {language.code}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Language Search Input - Always visible when language is selected */}
        {selectedLanguage && !isClosing && (
          <div
            className="w-full max-w-md transition-all duration-300 ease-in-out animate-fade-in"
            ref={dropdownRef}
          >
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onFocus={() => {
                  if (hasProcessingTasks) {
                    handleBlockedAction();
                    return;
                  }
                  setSearchTerm("");
                  setShowDropdown(true);
                }}
                onChange={handleSearchChange}
                placeholder="Search languages..."
                className={`input input-bordered w-full ${
                  hasProcessingTasks ? "cursor-not-allowed" : ""
                }`}
                autoComplete="off"
                disabled={hasProcessingTasks}
              />
              <ChevronDown className="absolute right-3 top-2/3 transform -translate-y-1/2 w-4 h-4 text-base-content/60" />

              {/* Language Dropdown */}
              {showDropdown && filteredLanguages.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                  {filteredLanguages.map((language, index) => (
                    <div
                      key={language.id}
                      className={`px-4 py-2 cursor-pointer flex items-center space-x-3 ${
                        index === selectedIndex
                          ? "bg-primary text-primary-content"
                          : "hover:bg-base-200"
                      }`}
                      onClick={() => {
                        selectLanguage(language);
                        setSearchTerm("");
                      }}
                    >
                      {/* Language Flag */}
                      <img
                        src={`/langs/${language.code}/${language.code}_flag_50.png`}
                        alt={`${language.display_name} flag`}
                        className="w-6 h-6 object-cover rounded-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {language.display_name}
                        </div>
                        <div className="text-sm opacity-70">
                          {language.language_name}
                        </div>
                      </div>
                      <div className="text-xs opacity-60 font-mono">
                        {language.code}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Pronunciations Editor */}
        {selectedLanguage && !isClosing && (
          <div className="w-full space-y-3 transition-all duration-500 ease-in-out animate-fade-in">
            {/* Selected Language Indicator */}
            <div className="flex items-center space-x-3 p-3 bg-base-200 justify-between rounded">
              <div className="flex items-center">
                <img
                  src={`/langs/${selectedLanguage.code}/${selectedLanguage.code}_flag_50.png`}
                  alt={`${selectedLanguage.display_name} flag`}
                  className="w-8 h-8 object-cover rounded-sm flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="ml-3">
                  <div className="font-medium text-base">
                    {selectedLanguage.display_name}
                  </div>
                  <div className="text-sm text-base-content/70">
                    {selectedLanguage.language_name}
                  </div>
                </div>
              </div>
              <div className="text-xs text-base-content/60 font-mono ml-auto">
                {selectedLanguage.code}
              </div>
            </div>

            <div className="text-sm text-base-content/70">
              <p>
                Enter your custom pronunciations for{" "}
                <strong>{selectedLanguage.display_name}</strong>.
              </p>
              <p className="mt-1">
                Format:{" "}
                <code className="bg-base-200 px-1 rounded text-xs">
                  word pronunciation
                </code>{" "}
                (one per line)
              </p>
              <p className="text-xs mt-1 opacity-60">
                Consult the phoneme key in the language-specific user guide for
                proper formatting.
              </p>
              <button
                onClick={() => {
                  if (hasProcessingTasks) {
                    handleBlockedAction();
                    return;
                  }
                  setShowUploadModal(true);
                }}
                className="btn btn-sm btn-neutral font-thin mt-2 text-xs"
                disabled={isLoading || hasProcessingTasks}
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload file instead
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center min-h-32 bg-base-200 rounded-lg">
                <div className="loading loading-spinner loading-md"></div>
                <span className="ml-2 text-sm my-auto">
                  Loading dictionary...
                </span>
              </div>
            ) : (
              <div
                key={contentKey}
                ref={dictContentRef}
                contentEditable={isEditable}
                dangerouslySetInnerHTML={{ __html: customPronunciations }}
                className={`textarea textarea-bordered w-full min-h-32 max-h-64 font-cascadia whitespace-pre-wrap text-sm overflow-y-auto ${
                  isEditable
                    ? "focus:textarea-primary"
                    : "leading-[0.6rem] bg-base-200 cursor-pointer"
                }`}
                onClick={() => {
                  // Prevent editing when tasks are processing
                  if (hasProcessingTasks) {
                    handleBlockedAction();
                    return;
                  }
                  // Format text content to remove line numbers and error highlight
                  setInvalidPhones(false);
                  if (dictContentRef.current) {
                    // Save cursor position before formatting
                    const selection = window.getSelection();
                    let cursorOffset = 0;

                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      cursorOffset = range.startOffset;

                      // Get text up to cursor position to calculate offset after formatting
                      const beforeCursor =
                        dictContentRef.current.innerText.substring(
                          0,
                          range.startOffset
                        );
                      // Count how many line numbers will be removed from text before cursor
                      const numbersRemoved = (
                        beforeCursor.match(/^\d+/gm) || []
                      ).length;
                      cursorOffset = Math.max(0, cursorOffset - numbersRemoved);
                    }

                    const textContent =
                      dictContentRef.current.innerText.replace(/\u00A0/g, "");
                    const lines = textContent.split("\n");
                    const processedLines = lines
                      .filter((line) => line.length)
                      .map((line) => line.replace(/^\d+/, "").trim());
                    const formattedContent = processedLines.join("\n");

                    // Update state with formatted content first
                    setCustomPronunciations(formattedContent);

                    // Make editable and restore cursor position
                    setIsEditable(true);
                    setTimeout(() => {
                      if (dictContentRef.current) {
                        dictContentRef.current.focus();

                        // Restore cursor position
                        const newSelection = window.getSelection();
                        if (newSelection && dictContentRef.current.firstChild) {
                          const range = document.createRange();
                          const textNode = dictContentRef.current.firstChild;
                          const maxOffset = textNode.textContent?.length || 0;
                          const safeOffset = Math.min(cursorOffset, maxOffset);

                          range.setStart(textNode, safeOffset);
                          range.setEnd(textNode, safeOffset);
                          newSelection.removeAllRanges();
                          newSelection.addRange(range);
                        }
                      }
                    }, 0);
                  }
                }}
                onInput={(e) => {
                  if (!isEditable) return;
                  const content = e.currentTarget.textContent || "";
                  if (content.length > 50000) {
                    toast.error(
                      "Content exceeds the 50,000 character limit (including whitespaces).",
                      "Size limit exceeded"
                    );
                    e.currentTarget.textContent = customPronunciations;
                    return;
                  }

                  // Use cursor preservation function for state updates
                  preserveCursorPosition(() => {
                    setCustomPronunciations(e.currentTarget.innerHTML);
                  });
                }}
                onPaste={handlePasteWithLimit}
                // onBlur={() => {
                //   // Update state when user finishes editing
                //   if (dictContentRef.current) {
                //     setCustomPronunciations(
                //       dictContentRef.current.innerHTML || ""
                //     );
                //   }
                // }}
              />
            )}

            <div className="flex justify-between items-center">
              {invalidPhones && (
                <div className="text-xs text-error/60">
                  Your entries contain invalid phones. Please review and try
                  saving again.
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-base-content/60">
                {
                  customPronunciations.split("\n").filter((line) => line.trim())
                    .length
                }{" "}
                entries
              </div>

              <div className="space-x-2">
                <motion.button
                  onClick={handleClose}
                  className="btn btn-sm btn-ghost font-thin bg-base-200"
                  disabled={isSaving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  Close
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (hasProcessingTasks) {
                      handleBlockedAction();
                      return;
                    }
                    handleSave();
                  }}
                  className="btn btn-sm btn-neutral font-thin"
                  disabled={isSaving || isLoading || hasProcessingTasks}
                  whileHover={
                    !isSaving && !isLoading && !hasProcessingTasks
                      ? { scale: 1.05 }
                      : {}
                  }
                  whileTap={
                    !isSaving && !isLoading && !hasProcessingTasks
                      ? { scale: 0.95 }
                      : {}
                  }
                  transition={{ duration: 0.2 }}
                >
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Upload Modal */}
      <DictUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        selectedLanguage={selectedLanguage}
        onUpload={handleUploadFromModal}
        existingContent={(() => {
          // Convert HTML to plain text for the modal
          if (dictContentRef.current) {
            return dictContentRef.current.innerText || "";
          }
          // Fallback: strip HTML tags if no ref available
          const div = document.createElement("div");
          div.innerHTML = customPronunciations;
          return div.innerText || div.textContent || "";
        })()}
      />

      {/* Video Guide Modal */}
      <Modal
        isOpen={showVideoModal}
        onClose={handleCloseVideoModal}
        title="How to use"
        size="md"
        closeOnBackdropClick
      >
        <div className="flex justify-center">
          <video
            ref={modalVideoRef}
            className="max-w-2xl h-auto"
            controls
            playsInline
            preload="metadata"
          >
            <source src="/videos/dict_guide.mov" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </Modal>
    </div>
  );
}
