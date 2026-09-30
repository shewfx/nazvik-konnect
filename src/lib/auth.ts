
export type Session = {
  familyId: string;
  familyName: string;
  role: string;
  priorityScore: number;
  avatarUrl: string;
};

const KEY = 'nazvik_session';

export const getSession = (): Session | null => {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

export const setSession = (data: Session) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // silently fail
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // silently fail
  }
};

export const updateScore = (newScore: number) => {
  try {
    const s = getSession();
    if (s) setSession({ ...s, priorityScore: newScore });
  } catch {
    // silently fail
  }
};

export const updateAvatar = (url: string) => {
  try {
    const s = getSession();
    if (s) setSession({ ...s, avatarUrl: url });
  } catch {
    // silently fail
  }
};
