import React from "react";
import AnnouncementCard from "../AnnouncementCard";

export default function DraftsModal({ announcements, currentUserId, currentUserRole, currentUsername, onClose, onToggleLike, onAddComment, onAddReply, onEditComment, onDeleteComment, onEditReply, onDeleteReply, onEditAnnouncement, onDeleteAnnouncement, onPublishAnnouncement }) {
  const draftAnnouncements = announcements.filter(ann => ann.status === "draft");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-base font-display font-semibold">Draft Announcements</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your saved drafts</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body overflow-y-auto max-h-[60vh]">
          {draftAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No drafts yet. Save a draft and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {draftAnnouncements.map((ann) => {
                const annKey = String(ann._id);
                return (
                  <AnnouncementCard
                    key={annKey}
                    announcement={ann}
                    reaction={ann}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    currentUsername={currentUsername}
                    onToggleLike={onToggleLike}
                    onAddComment={onAddComment}
                    onAddReply={onAddReply}
                    onEditComment={onEditComment}
                    onDeleteComment={onDeleteComment}
                    onEditReply={onEditReply}
                    onDeleteReply={onDeleteReply}
                    onEditAnnouncement={onEditAnnouncement}
                    onDeleteAnnouncement={onDeleteAnnouncement}
                    onPublishAnnouncement={onPublishAnnouncement}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}