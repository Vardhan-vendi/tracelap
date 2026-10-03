import React, { useState, useRef } from "react";
import {
  X,
  Star,
  MessageSquare,
  Bug,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "/api";

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [type, setType] = useState<"GENERAL" | "BUG" | "FEATURE">("GENERAL");
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [displayPermission, setDisplayPermission] = useState<boolean>(false);

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Screenshot must be under 5MB.");
      return;
    }

    setErrorMessage(null);
    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotData(null);
    setScreenshotName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setErrorMessage("Please provide a rating (1 to 5 stars).");
      return;
    }

    if (!message.trim()) {
      setErrorMessage("Please enter your feedback message.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalScreenshotUrl: string | undefined = undefined;

      // 1. Upload screenshot if selected
      if (screenshotData) {
        try {
          const uploadRes = await fetch(`${API_BASE_URL}/upload/screenshot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: screenshotData,
              filename: screenshotName || "screenshot.png",
            }),
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            finalScreenshotUrl = uploadJson.url;
          }
        } catch {
          // If screenshot upload fails, we still allow feedback to submit
        }
      }

      // 2. Submit feedback
      const feedbackPayload = {
        rating,
        message: message.trim(),
        type,
        name: name.trim() || undefined,
        role: role.trim() || undefined,
        screenshotUrl: finalScreenshotUrl,
        profileUrl: profileUrl.trim() || undefined,
        displayPermission,
      };

      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackPayload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Submission failed" }));
        throw new Error(errData.detail || "Failed to submit feedback.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        // Reset state
        setIsSuccess(false);
        setIsSubmitting(false);
        setRating(0);
        setMessage("");
        setType("GENERAL");
        setName("");
        setRole("");
        setProfileUrl("");
        setDisplayPermission(false);
        setScreenshotData(null);
        setScreenshotName("");
        onClose();
      }, 1600);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Share your feedback</h2>
              <p className="text-[11px] text-slate-400">Help us improve TraceLap.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content / Form */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isSuccess ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-slate-100">
                Thanks for your feedback! 🚀
              </h3>
              <p className="text-xs text-slate-400">
                Your input helps make CodeLearner better for everyone.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error banner */}
              {errorMessage && (
                <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Rating (Interactive Stars) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Rating <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-md hover:bg-slate-800/80 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          (hoverRating || rating) >= star
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-600 hover:text-slate-500"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    {rating > 0 ? `${rating} / 5` : "Select rating"}
                  </span>
                </div>
              </div>

              {/* 2. Feedback Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Feedback Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("GENERAL")}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      type === "GENERAL"
                        ? "bg-indigo-950/70 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("BUG")}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      type === "BUG"
                        ? "bg-rose-950/70 border-rose-500 text-rose-300 ring-1 ring-rose-500/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>Bug Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("FEATURE")}
                    className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      type === "FEATURE"
                        ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Feature</span>
                  </button>
                </div>
              </div>

              {/* 3. Feedback message */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Feedback <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell me what you liked or what I can improve..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* 4. Name & Role (Optional, 2-column) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Name <span className="text-slate-500 text-[10px] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role <span className="text-slate-500 text-[10px] font-normal">(optional)</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select role (optional)</option>
                    <option value="Student">Student</option>
                    <option value="Developer">Developer</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* 5. LinkedIn / GitHub (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LinkedIn or GitHub <span className="text-slate-500 text-[10px] font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://github.com/your-username"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* 6. Screenshot Upload (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Screenshot <span className="text-slate-500 text-[10px] font-normal">(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                  id="feedback-screenshot-input"
                />

                {screenshotData ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center space-x-2 truncate">
                      <img
                        src={screenshotData}
                        alt="Screenshot preview"
                        className="w-8 h-8 object-cover rounded border border-slate-700"
                      />
                      <span className="text-xs text-slate-300 truncate max-w-[200px]">
                        {screenshotName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="feedback-screenshot-input"
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 hover:border-slate-600 text-slate-400 text-xs transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload a screenshot (PNG, JPG max 5MB)</span>
                  </label>
                )}
              </div>

              {/* 7. Permission Checkbox (Unchecked by default) */}
              <div className="pt-1">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displayPermission}
                    onChange={(e) => setDisplayPermission(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 leading-tight">
                    Allow my feedback to be displayed publicly.
                  </span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
