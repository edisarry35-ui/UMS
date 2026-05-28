import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "../utils/helpers";
import { API_BASE_URL } from "../api/axios";

export default function AnnouncementCard({ announcement, reaction, currentUserId, currentUserRole, currentUsername, onToggleLike, onAddComment, onAddReply, onEditComment, onDeleteComment, onEditReply, onDeleteReply, onEditAnnouncement, onDeleteAnnouncement, onPublishAnnouncement }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyOpenByComment, setReplyOpenByComment] = useState({});
  const [replyTextByComment, setReplyTextByComment] = useState({});
  const [replyErrorByComment, setReplyErrorByComment] = useState({});
  const [isSubmittingReplyByComment, setIsSubmittingReplyByComment] = useState({});
  const [commentActionOpen, setCommentActionOpen] = useState({});
  const [replyActionOpen, setReplyActionOpen] = useState({});
  const [editingCommentById, setEditingCommentById] = useState({});
  const [editingCommentTextById, setEditingCommentTextById] = useState({});
  const [editingReplyById, setEditingReplyById] = useState({});
  const [editingReplyTextById, setEditingReplyTextById] = useState({});
  const [editErrorById, setEditErrorById] = useState({});
  const [announcementActionOpen, setAnnouncementActionOpen] = useState(false);
  const announcementBtnRef = useRef(null);
  const [announcementMenuPos, setAnnouncementMenuPos] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [editAnnouncementError, setEditAnnouncementError] = useState(null);
  const [showFullContent, setShowFullContent] = useState(false);
  const [imageError, setImageError] = useState(false);

  const canEdit = currentUserRole === 'admin' || announcement.author === currentUsername;

  const safeReaction = reaction || { likes: [], comments: [] };
  const likeCount = safeReaction.likes.length;
  const commentCount = safeReaction.comments.length;
  const isLiked = useMemo(() => {
    return safeReaction.likes.some((like) => String(like.userId) === String(currentUserId));
  }, [safeReaction, currentUserId]);
  const isApproved = announcement.status === "approved";
  const isDraft = announcement.status === "draft";

  const getRelativeTime = (dateValue) => {
    const then = new Date(dateValue);
    const now = new Date();
    const diff = now - then;
    if (!dateValue || Number.isNaN(diff) || diff < 0) return "";
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    if (months < 12) return `${months}mo`;
    return `${years}y`;
  };

  const relativeTime = getRelativeTime(announcement.createdAt);

  const CONTENT_PREVIEW_LENGTH = 250;
  const isLongContent = String(announcement.content || "").length > CONTENT_PREVIEW_LENGTH;
  const previewContent = String(announcement.content || "").slice(0, CONTENT_PREVIEW_LENGTH).trim();
  const displayContent = editingAnnouncement
    ? announcement.content
    : showFullContent || !isLongContent
    ? announcement.content
    : `${previewContent}...`;

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) {
      setCommentError("Please enter a comment.");
      return;
    }

    setCommentError(null);
    setIsSubmittingComment(true);

    try {
      await onAddComment(announcement._id, commentText.trim());
      setCommentText("");
      setShowComments(true);
    } catch (err) {
      setCommentError(err?.message || "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (event, commentId) => {
    event.preventDefault();
    const replyText = String(replyTextByComment[commentId] || "").trim();
    if (!replyText) {
      setReplyErrorByComment((prev) => ({ ...prev, [commentId]: "Please enter a reply." }));
      return;
    }

    setReplyErrorByComment((prev) => ({ ...prev, [commentId]: null }));
    setIsSubmittingReplyByComment((prev) => ({ ...prev, [commentId]: true }));

    try {
      await onAddReply(announcement._id, commentId, replyText);
      setReplyTextByComment((prev) => ({ ...prev, [commentId]: "" }));
      setReplyOpenByComment((prev) => ({ ...prev, [commentId]: true }));
      setShowComments(true);
    } catch (err) {
      setReplyErrorByComment((prev) => ({ ...prev, [commentId]: err?.message || "Failed to post reply." }));
    } finally {
      setIsSubmittingReplyByComment((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleCommentActions = (commentId) => {
    setCommentActionOpen((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const toggleReplyActions = (replyId) => {
    setReplyActionOpen((prev) => ({ ...prev, [replyId]: !prev[replyId] }));
  };

  const startEditingComment = (commentId, text) => {
    setEditingCommentById((prev) => ({ ...prev, [commentId]: true }));
    setEditingCommentTextById((prev) => ({ ...prev, [commentId]: text }));
    setCommentActionOpen((prev) => ({ ...prev, [commentId]: false }));
  };

  const cancelEditingComment = (commentId) => {
    setEditingCommentById((prev) => ({ ...prev, [commentId]: false }));
    setEditErrorById((prev) => ({ ...prev, [commentId]: null }));
  };

  const submitEditComment = async (commentId) => {
    const text = String(editingCommentTextById[commentId] || "").trim();
    if (!text) {
      setEditErrorById((prev) => ({ ...prev, [commentId]: "Comment cannot be empty." }));
      return;
    }

    try {
      await onEditComment(announcement._id, commentId, text);
      setEditingCommentById((prev) => ({ ...prev, [commentId]: false }));
      setEditErrorById((prev) => ({ ...prev, [commentId]: null }));
    } catch (err) {
      setEditErrorById((prev) => ({ ...prev, [commentId]: err?.message || "Failed to edit comment." }));
    }
  };

  const startEditingReply = (replyId, text) => {
    setEditingReplyById((prev) => ({ ...prev, [replyId]: true }));
    setEditingReplyTextById((prev) => ({ ...prev, [replyId]: text }));
    setReplyActionOpen((prev) => ({ ...prev, [replyId]: false }));
  };

  const cancelEditingReply = (replyId) => {
    setEditingReplyById((prev) => ({ ...prev, [replyId]: false }));
    setEditErrorById((prev) => ({ ...prev, [replyId]: null }));
  };

  const submitEditReply = async (commentId, replyId) => {
    const text = String(editingReplyTextById[replyId] || "").trim();
    if (!text) {
      setEditErrorById((prev) => ({ ...prev, [replyId]: "Reply cannot be empty." }));
      return;
    }

    try {
      await onEditReply(announcement._id, commentId, replyId, text);
      setEditingReplyById((prev) => ({ ...prev, [replyId]: false }));
      setEditErrorById((prev) => ({ ...prev, [replyId]: null }));
    } catch (err) {
      setEditErrorById((prev) => ({ ...prev, [replyId]: err?.message || "Failed to edit reply." }));
    }
  };

  const handleEditAnnouncement = async () => {
    const title = editingTitle.trim();
    const content = editingContent.trim();
    if (!title || !content) {
      setEditAnnouncementError("Title and content are required.");
      return;
    }
    setEditAnnouncementError(null);
    try {
      await onEditAnnouncement(announcement._id, title, content);
      setEditingAnnouncement(false);
      setAnnouncementActionOpen(false);
    } catch (err) {
      setEditAnnouncementError(err?.message || "Failed to edit announcement.");
    }
  };

  const handleDeleteAnnouncement = async () => {
    try {
      await onDeleteAnnouncement(announcement._id);
      setAnnouncementActionOpen(false);
    } catch (err) {
      setEditAnnouncementError(err?.message || "Failed to delete announcement.");
    }
  };

  const handlePublishAnnouncement = async () => {
    try {
      await onPublishAnnouncement(announcement._id);
      setAnnouncementActionOpen(false);
    } catch (err) {
      setEditAnnouncementError(err?.message || "Failed to publish announcement.");
    }
  };

  const startEditingAnnouncement = () => {
    setEditingTitle(announcement.title);
    setEditingContent(announcement.content);
    setEditingAnnouncement(true);
    setAnnouncementActionOpen(false);
  };

  const cancelEditingAnnouncement = () => {
    setEditingAnnouncement(false);
    setEditAnnouncementError(null);
  };

  React.useEffect(() => {
    setShowFullContent(false);
    setImageError(false);
  }, [announcement._id, announcement.content]);

  return (
    <div id={`ann-${announcement._id}`} className="card hover:shadow-card-hover transition-all duration-200 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {String(announcement.author || "U")
                    .split(" ")
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{announcement.author || "Unknown"}</span>
                    {relativeTime && <span className="text-xs text-slate-400">· {relativeTime}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <h3 className="font-display font-semibold text-slate-900 text-base leading-snug truncate">{announcement.title}</h3>
                {announcement.status === "draft" && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    DRAFT
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <div className="relative">
                  <button
                    type="button"
                    ref={announcementBtnRef}
                    onClick={() => {
                      if (!announcementActionOpen) {
                        const r = announcementBtnRef.current?.getBoundingClientRect();
                        setAnnouncementMenuPos(r);
                      }
                      setAnnouncementActionOpen((s) => !s);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  >
                    ⋯
                  </button>
                </div>
              )}
            </div>

            {announcementActionOpen && announcementMenuPos && createPortal(
              <>
                <div className="fixed inset-0" onClick={() => setAnnouncementActionOpen(false)} />
                <div
                  className="bg-white border border-slate-200 rounded shadow-lg dark:bg-slate-900 dark:border-slate-800"
                  style={{
                    position: 'fixed',
                    left: Math.min(Math.max(announcementMenuPos.left + announcementMenuPos.width - 220, 8), window.innerWidth - 240) + 'px',
                    top: (announcementMenuPos.bottom + 8) + 'px',
                    zIndex: 9999,
                    minWidth: 180
                  }}
                >
                  <div>
                    {announcement.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => { handlePublishAnnouncement(); setAnnouncementActionOpen(false); }}
                        className="block w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { startEditingAnnouncement(); setAnnouncementActionOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleDeleteAnnouncement(); setAnnouncementActionOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
          {editingAnnouncement ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="input w-full"
                placeholder="Announcement title"
              />
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Announcement content"
              />
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleEditAnnouncement} className="btn-primary">Save</button>
                <button type="button" onClick={cancelEditingAnnouncement} className="btn-secondary">Cancel</button>
              </div>
              {editAnnouncementError && <p className="text-sm text-red-500">{editAnnouncementError}</p>}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line mt-3">{displayContent}</p>
              {isLongContent && (
                <button
                  type="button"
                  onClick={() => setShowFullContent((prev) => !prev)}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {showFullContent ? "See less" : "See more"}
                </button>
              )}
              {(announcement.image || announcement.photo) && !imageError && (
                <div className="mt-4 flex justify-start">
                  <img
                    src={`${API_BASE_URL.replace(/\/$/, "")}/uploads/${announcement.image || announcement.photo}`}
                    alt={announcement.title || "announcement"}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    onClick={() => window.open(`${API_BASE_URL.replace(/\/$/, "")}/uploads/${announcement.image || announcement.photo}`, "_blank")}
                    className="max-h-96 max-w-full object-contain rounded-lg shadow-sm cursor-pointer select-none"
                  />
                </div>
              )}
            </>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            {!isDraft && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => onToggleLike(announcement._id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 transition ${isLiked ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <span className="text-base">{isLiked ? "❤️" : "🤍"}</span>
                  <span>{likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowComments((state) => !state)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <span className="text-base">💬</span>
                  <span>{commentCount}</span>
                </button>
                {safeReaction.likes.length > 0 && (
                  <span className="text-xs text-slate-500">{safeReaction.likes.length} {safeReaction.likes.length === 1 ? "like" : "likes"}</span>
                )}
                {safeReaction.comments.length > 0 && (
                  <span className="text-xs text-slate-500">{safeReaction.comments.length} {safeReaction.comments.length === 1 ? "comment" : "comments"}</span>
                )}
              </div>
            )}

            {!isDraft && showComments && (
              <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="space-y-3">
                  {safeReaction.comments.map((comment, idx) => {
                    const commentId = comment._id ? String(comment._id) : String(idx);
                    const replyText = replyTextByComment[commentId] || "";
                    const replyOpen = replyOpenByComment[commentId];
                    const replyError = replyErrorByComment[commentId];
                    const isReplying = isSubmittingReplyByComment[commentId];

                    return (
                      <div key={commentId} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{comment.username}</span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{comment.text}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <button
                            type="button"
                            onClick={() => setReplyOpenByComment((prev) => ({ ...prev, [commentId]: !prev[commentId] }))}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                          >
                            <span>↩</span>
                            <span>{replyOpen ? "Hide" : "Reply"}</span>
                          </button>

                          {comment.replies?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setReplyOpenByComment((prev) => ({ ...prev, [commentId]: !prev[commentId] }))}
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                            >
                              <span>💬</span>
                              <span>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span>
                            </button>
                          )}

                          {String(comment.userId) === String(currentUserId) && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => toggleCommentActions(commentId)}
                                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                ⋯
                              </button>
                              {commentActionOpen[commentId] && (
                                <div className="absolute right-0 z-60 mt-2 w-28 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                  <button
                                    type="button"
                                    onClick={() => startEditingComment(commentId, comment.text)}
                                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!window.confirm("Delete this comment? This cannot be undone.")) return;
                                      try {
                                        await onDeleteComment(announcement._id, commentId);
                                      } catch (err) {
                                        setCommentError(err?.message || "Failed to delete comment.");
                                      }
                                    }}
                                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {editingCommentById[commentId] ? (
                          <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                            <textarea
                              value={editingCommentTextById[commentId] || ""}
                              onChange={(e) => setEditingCommentTextById((prev) => ({ ...prev, [commentId]: e.target.value }))}
                              className="input h-24 w-full resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => submitEditComment(commentId)} className="btn-primary">Save</button>
                              <button type="button" onClick={() => cancelEditingComment(commentId)} className="btn-secondary">Cancel</button>
                            </div>
                            {editErrorById[commentId] && <p className="text-sm text-red-500">{editErrorById[commentId]}</p>}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{comment.text}</p>
                        )}

                        {comment.replies?.length > 0 && replyOpen && (
                          <div className="mt-3 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                            {comment.replies.map((reply, replyIdx) => {
                              const replyId = reply._id ? String(reply._id) : String(replyIdx);
                              return (
                                <div key={`${commentId}-reply-${replyId}`} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-800">
                                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{reply.username}</span>
                                    <div className="flex items-center gap-2">
                                      <span>{formatDate(reply.createdAt)}</span>
                                      {String(reply.userId) === String(currentUserId) && (
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => toggleReplyActions(replyId)}
                                            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                          >
                                            ⋯
                                          </button>
                                          {replyActionOpen[replyId] && (
                                            <div className="absolute right-0 z-60 mt-2 w-28 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                              <button
                                                type="button"
                                                onClick={() => startEditingReply(replyId, reply.text)}
                                                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  if (!window.confirm("Delete this reply? This cannot be undone.")) return;
                                                  try {
                                                    await onDeleteReply(announcement._id, commentId, replyId);
                                                  } catch (err) {
                                                    setReplyErrorByComment((prev) => ({ ...prev, [commentId]: err?.message || "Failed to delete reply." }));
                                                  }
                                                }}
                                                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {editingReplyById[replyId] ? (
                                    <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                                      <textarea
                                        value={editingReplyTextById[replyId] || ""}
                                        onChange={(e) => setEditingReplyTextById((prev) => ({ ...prev, [replyId]: e.target.value }))}
                                        className="input h-20 w-full resize-none"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => submitEditReply(commentId, replyId)} className="btn-primary">Save</button>
                                        <button type="button" onClick={() => cancelEditingReply(replyId)} className="btn-secondary">Cancel</button>
                                      </div>
                                      {editErrorById[replyId] && <p className="text-sm text-red-500">{editErrorById[replyId]}</p>}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{reply.text}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {replyOpen && (
                          <form onSubmit={(event) => handleReplySubmit(event, commentId)} className="mt-3 space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Write a reply</label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                value={replyText}
                                onChange={(e) => setReplyTextByComment((prev) => ({ ...prev, [commentId]: e.target.value }))}
                                placeholder="Write a reply..."
                                className="input flex-1"
                                disabled={isReplying}
                              />
                              <button
                                type="submit"
                                className="btn-primary self-end whitespace-nowrap"
                                disabled={isReplying}
                              >
                                {isReplying ? "Posting..." : "Reply"}
                              </button>
                            </div>
                            {replyError && <p className="text-sm text-red-500">{replyError}</p>}
                          </form>
                        )}
                      </div>
                    );
                  })}
                  {!safeReaction.comments.length && (
                    <p className="text-sm text-slate-500">No comments yet. Be the first to reply.</p>
                  )}
                </div>

                <form onSubmit={handleCommentSubmit} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Add a comment</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="input flex-1"
                      disabled={isSubmittingComment}
                    />
                    <button
                      type="submit"
                      className="btn-primary self-end whitespace-nowrap"
                      disabled={isSubmittingComment}
                    >
                      {isSubmittingComment ? "Posting..." : "Comment"}
                    </button>
                  </div>
                  {commentError && <p className="text-sm text-red-500">{commentError}</p>}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
