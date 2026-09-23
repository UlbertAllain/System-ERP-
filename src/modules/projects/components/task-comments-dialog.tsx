"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  createTaskCommentAction,
  deleteTaskCommentAction,
  listTaskCommentsAction,
  updateTaskCommentAction,
} from "@/features/projects/actions";
import type { TaskListItem } from "@/types/task";
import type { TaskCommentListItem } from "@/types/task-comment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type TaskCommentPermissions = {
  canRead: boolean;
  canCreate: boolean;
  canUpdateOwn: boolean;
  canDeleteOwn: boolean;
  canDeleteAny: boolean;
  currentUserId: string;
};

type TaskCommentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskListItem | null;
  permissions: TaskCommentPermissions;
  onMessage: (message: string | null) => void;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function TaskCommentsDialog({
  open,
  onOpenChange,
  task,
  permissions,
  onMessage,
}: TaskCommentsDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<TaskCommentListItem[]>([]);
  const [loadedTaskId, setLoadedTaskId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    const taskId = task.id;

    startTransition(async () => {
      const result = await listTaskCommentsAction({
        taskId,
      });

      if (result.success) {
        setComments(result.data);
        setLoadedTaskId(taskId);
        setCommentBody("");
        setEditingCommentId(null);
        setEditingCommentBody("");
        return;
      }

      setComments([]);
      setLoadedTaskId(taskId);
      onMessage(result.message);
    });
  }, [open, task, onMessage]);

  const visibleComments =
    task && loadedTaskId === task.id ? comments : [];

  function refreshComments(taskId: string) {
    startTransition(async () => {
      const result = await listTaskCommentsAction({
        taskId,
      });

      if (result.success) {
        setComments(result.data);
        return;
      }

      onMessage(result.message);
    });
  }

  function handleCreateComment() {
    if (!task) {
      return;
    }

    onMessage(null);

    startTransition(async () => {
      const result = await createTaskCommentAction({
        taskId: task.id,
        body: commentBody,
      });

      onMessage(result.message);

      if (result.success) {
        setCommentBody("");
        refreshComments(task.id);
        router.refresh();
      }
    });
  }

  function startEditComment(comment: TaskCommentListItem) {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentBody("");
  }

  function handleUpdateComment(commentId: string) {
    if (!task) {
      return;
    }

    onMessage(null);

    startTransition(async () => {
      const result = await updateTaskCommentAction({
        id: commentId,
        body: editingCommentBody,
      });

      onMessage(result.message);

      if (result.success) {
        cancelEditComment();
        refreshComments(task.id);
        router.refresh();
      }
    });
  }

  function handleDeleteComment(comment: TaskCommentListItem) {
    if (!task) {
      return;
    }

    const confirmed = window.confirm("Yakin ingin menghapus komentar ini?");

    if (!confirmed) {
      return;
    }

    onMessage(null);

    startTransition(async () => {
      const result = await deleteTaskCommentAction({
        id: comment.id,
      });

      onMessage(result.message);

      if (result.success) {
        refreshComments(task.id);
        router.refresh();
      }
    });
  }

  function canEditComment(comment: TaskCommentListItem) {
    return (
      permissions.canUpdateOwn &&
      comment.userId === permissions.currentUserId
    );
  }

  function canDeleteComment(comment: TaskCommentListItem) {
    return (
      permissions.canDeleteAny ||
      (permissions.canDeleteOwn &&
        comment.userId === permissions.currentUserId)
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Diskusi Tugas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {task ? `${task.projectCode} - ${task.title}` : "Diskusi tugas"}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isPending && visibleComments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat komentar...
            </div>
          ) : null}

          {!isPending && visibleComments.length === 0 ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Belum ada komentar untuk tugas ini.
            </div>
          ) : null}

          <div className="space-y-3">
            {visibleComments.map((comment) => {
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.userEmail} - {formatDate(comment.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {canEditComment(comment) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => startEditComment(comment)}
                        >
                          <Edit className="size-4" />
                        </Button>
                      ) : null}

                      {canDeleteComment(comment) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                          onClick={() => handleDeleteComment(comment)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-3">
                      <Textarea
                        value={editingCommentBody}
                        onChange={(event) =>
                          setEditingCommentBody(event.target.value)
                        }
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={cancelEditComment}
                        >
                          <X className="size-4" />
                          Batal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleUpdateComment(comment.id)}
                        >
                          <Save className="size-4" />
                          Simpan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                      {comment.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {permissions.canCreate && task ? (
          <div className="border-t bg-background px-6 py-4">
            <div className="grid gap-3">
              <Textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Tulis pembaruan, catatan QA, kendala, atau keputusan tugas..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="gap-2"
                  disabled={isPending || commentBody.trim().length < 2}
                  onClick={handleCreateComment}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Kirim Komentar
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
