export type TaskCommentListItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  body: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export type TaskCommentDetail = TaskCommentListItem;
