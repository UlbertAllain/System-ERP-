export type ActionSuccess<T = null> = {
  success: true;
  message: string;
  data: T;
};

export type ActionError = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResponse<T = null> = ActionSuccess<T> | ActionError;

export function successResponse<T = null>(
  message: string,
  data: T,
): ActionSuccess<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionError {
  return {
    success: false,
    message,
    fieldErrors,
  };
}
